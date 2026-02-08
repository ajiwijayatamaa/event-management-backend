import axios from "axios";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../../generated/prisma/client.js";
import { comparePassword, hashPassword } from "../../lib/argon.js";
import { UserInfo } from "../../types/google.js";
import { ApiError } from "../../utils/api-error.js";
import { GoogleDTO } from "./dto/google.dto.js";
import { LoginDTO } from "./dto/login.dto.js";
import { RegisterDTO } from "./dto/register.dto.js";

export class AuthService {
  constructor(private prisma: PrismaClient) {}

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
      expiresIn: "2h",
    });

    // 6. Return data user + access token
    const { password, ...userWithoutPassword } = existingUser; // remove properti password dengan distructuring
    return {
      ...userWithoutPassword,
      accessToken: accessToken,
    };
  };

  // GOOGLE
  google = async (body: GoogleDTO) => {
    const { data } = await axios.get<UserInfo>(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${body.accessToken}`,
        },
      },
    );

    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    // helper
    const signToken = (user: { id: number; role: string }) =>
      jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
        expiresIn: "2h",
      });

    const sanitizeUser = <T extends { password?: string }>(user: T) => {
      const { password, ...rest } = user;
      return rest;
    };

    // user belum ada → create
    if (!user) {
      const newUser = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: "",
          provider: "GOOGLE",
        },
      });

      return {
        ...sanitizeUser(newUser),
        accessToken: signToken(newUser),
      };
    }

    // user ada tapi bukan google
    if (user.provider !== "GOOGLE") {
      throw new ApiError("Account already registered without google", 400);
    }

    // user google existing
    return {
      ...sanitizeUser(user),
      accessToken: signToken(user),
    };
  };
}
