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

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private mailService: MailService,
  ) {}

  // REGISTER
  register = async (body: RegisterDTO) => {
    // 1. Cek email apakah sudah ada
    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser && !existingUser.deletedAt) {
      throw new ApiError("Email already exists", 400);
    }

    if (existingUser && existingUser.deletedAt) {
      throw new ApiError(
        "This email was previously deleted. Please contact support.",
        400,
      );
    }

    // 2. Cek apakah dia pakai kode referral orang lain
    let referrerId: number | null = null;

    if (body.referrerCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: body.referrerCode },
        select: { id: true },
      });

      if (!referrer) {
        throw new ApiError("Invalid referral code", 400);
      }

      referrerId = referrer.id;
    }

    // 3. Hash password
    const hashedPassword = await hashPassword(body.password);

    // 4. Simpan ke database
    await this.prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: "CUSTOMER", // default selalu CUSTOMER
        referredBy: referrerId, // Akan berisi ID orang yang ngajak, atau null
        // referralCode milik user sendiri akan terisi otomatis oleh @default(uuid())
      },
    });

    // 5. Send email welcome ke User baru
    await this.mailService.sendEmail(
      body.email,
      `Welcome, ${body.name}`,
      "mail",
      { name: body.name },
    );

    // 6. Return message register success
    return { message: "Register success" };
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
}
