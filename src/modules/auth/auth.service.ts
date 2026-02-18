import axios from "axios";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../../generated/prisma/client.js";
import { comparePassword, hashPassword } from "../../lib/argon.js";
import { UserInfo } from "../../types/google.js";
import { ApiError } from "../../utils/api-error.js";
import { MailService } from "../mail/mail.service.js";
import { GoogleDTO } from "./dto/google.dto.js";
import { LoginDTO } from "./dto/login.dto.js";
import { RegisterDTO } from "./dto/register.dto.js";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto.js";
import { ResetPasswordDTO } from "./dto/reset-password.dto.js";

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private mailService: MailService,
  ) {}

  // REGISTER
  register = async (body: RegisterDTO) => {
    // 1. Cek email (Logika kamu sudah benar)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existingUser) throw new ApiError("Email already exists", 400);

    let referrerId: number | null = null;
    if (body.referrerCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: body.referrerCode },
      });
      if (!referrer) throw new ApiError("Invalid referral code", 400);
      referrerId = referrer.id;
    }

    const hashedPassword = await hashPassword(body.password);

    // LOGIKA MASA BERLAKU (3 BULAN) [cite: 38, 39]
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3);

    // 4. SQL TRANSACTION
    const newUser = await this.prisma.$transaction(async (tx) => {
      // A. Buat User Baru
      const user = await tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          password: hashedPassword,
          role: body.role,
          referredBy: referrerId,
        },
      });

      // B. Jika ada kode referral, berikan hadiah
      if (referrerId) {
        // Referrer dapat 10.000 poin
        await tx.point.create({
          data: {
            userId: referrerId,
            amount: 10000,
            remainingAmount: 10000,
            expiredAt: expiryDate,
          },
        });

        // User baru dapat kupon diskon
        await tx.coupon.create({
          data: {
            userId: user.id,
            couponCode: `REFC-NEW-${user.id}-${Math.random().toString(36).substring(7).toUpperCase()}`,
            discountRate: 10.0, // Contoh: Diskon 10%
            expiredAt: expiryDate,
          },
        });
      }

      return user;
    });

    // 5. Send email welcome
    await this.mailService.sendEmail(
      newUser.email,
      `Welcome, ${newUser.name}`,
      "mail",
      { name: newUser.name },
    );

    return {
      message:
        "Register success. Points and coupons awarded if using referral.",
    };
  };

  // LOGIN
  login = async (body: LoginDTO) => {
    // 1. Cek email apakah sudah ada
    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    // 2. Jika tidak ada throw error
    if (!existingUser) {
      throw new ApiError("Invalid Credentials", 400);
    }

    // 3. Cek passwordnya apakah sama atau tidak
    const isPassMatch = await comparePassword(
      body.password,
      existingUser.password,
    );

    //4. Kalau tidak sama throw error
    if (!isPassMatch) {
      throw new ApiError("Invalid Credentials", 400);
    }

    // 5. generate token menggunakan jwt/jsonwebtoken
    const payload = {
      id: existingUser.id,
      role: existingUser.role,
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET_REFRESH!, {
      expiresIn: "1d",
    });

    const pointAggregation = await this.prisma.point.aggregate({
      where: {
        userId: existingUser.id,
        expiredAt: { gte: new Date() }, // Hanya poin yang belum kadaluarsa
      },
      _sum: {
        remainingAmount: true,
      },
    });
    await this.prisma.refreshToken.upsert({
      where: { userId: existingUser.id },
      update: {
        token: refreshToken,
        expiredAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: existingUser.id,
        token: refreshToken,
        expiredAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    });

    // 6. Return data user + access token
    const { password, ...userWithoutPassword } = existingUser; // remove properti password dengan distructuring
    return {
      ...userWithoutPassword,
      points: pointAggregation._sum.remainingAmount || 0,
      accessToken: accessToken,
      refreshToken,
    };
  };

  logout = async (refreshToken?: string) => {
    if (!refreshToken) return;

    await this.prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
      },
    });

    return { message: "Logout Success" };
  };

  // GOOGLE
  google = async (body: GoogleDTO) => {
    // ===== helpers =====
    const signAccessToken = (user: { id: number; role: string }) =>
      jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: "15m" });

    const signRefreshToken = (user: { id: number; role: string }) =>
      jwt.sign(user, process.env.JWT_SECRET_REFRESH!, { expiresIn: "3d" });

    const sanitizeUser = <T extends { password?: string }>(user: T) => {
      const { password, ...rest } = user;
      return rest;
    };

    const refreshExpiredAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // ===== get google user info =====
    const { data } = await axios.get<UserInfo>(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${body.accessToken}`,
        },
      },
    );

    // ===== find user =====
    let user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    // ===== create user if not exists =====
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: "",
          provider: "GOOGLE",
        },
      });
    }

    // ===== provider mismatch =====
    if (user.provider !== "GOOGLE") {
      throw new ApiError("Account already registered without google", 400);
    }

    // ===== generate tokens =====
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // ===== upsert refresh token =====
    await this.prisma.refreshToken.upsert({
      where: { userId: user.id },
      update: {
        token: refreshToken,
        expiredAt: refreshExpiredAt,
      },
      create: {
        userId: user.id,
        token: refreshToken,
        expiredAt: refreshExpiredAt,
      },
    });

    return {
      ...sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  };

  //REFRESH TOKEN
  refresh = async (refreshToken?: string) => {
    if (!refreshToken) throw new ApiError("No refresh token", 400);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored) throw new ApiError("Refresh Token Not Found", 400);

    //Cek udah expired atau belum refresh tokennya
    const isExpired = stored.expiredAt < new Date();
    if (isExpired) throw new ApiError("Refresh Token Expired", 400);

    // Kalau misalnya gk expired / valid bikin generate access token baru
    const payload = {
      id: stored.user.id,
      role: stored.user.role,
    };

    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "15m",
    });

    return { accessToken: newAccessToken };
  };

  forgotPassword = async (body: ForgotPasswordDTO) => {
    // 1. Cek dulu emailnya ada atau tidak di db berdasarkan email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    // Jika tidak ada throw return success
    if (!existingUser) return { message: "Send Email Success" };

    // generate token
    const payload = {
      id: existingUser.id,
      role: existingUser.role,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET_RESET!, {
      expiresIn: "15m",
    });

    // kirim email reset password + token
    this.mailService.sendEmail(
      existingUser.email,
      "Forgot Password",
      "reset-password",
      { link: `${process.env.BASE_URL_FE!}/reset-password/${token}` },
    );

    // return success
    return { message: "send email success" };
  };

  resetPassword = async (body: ResetPasswordDTO, userId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("invalid user id", 400);
    }

    const hashedPassword = await hashPassword(body.password);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    return { message: "reset password success" };
  };
}
