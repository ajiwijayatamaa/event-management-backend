import { Prisma, PrismaClient, User } from "../../generated/prisma/client.js";
import { comparePassword, hashPassword } from "../../lib/argon.js";
import { PaginationQueryParams } from "../../types/pagination.js";
import { ApiError } from "../../utils/api-error.js";
import { ChangePasswordDTO } from "../auth/dto/change-password.dto.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";
import { UpdateUserDTO } from "./dto/update-user.dto.js";

interface GetUsersQuery extends PaginationQueryParams {
  search: string;
}

export class UserService {
  constructor(
    private prisma: PrismaClient,
    private cloudinaryService: CloudinaryService,
  ) {}

  getUsers = async (query: GetUsersQuery) => {
    const { page, sortBy, sortOrder, take, search } = query;

    const whereClause: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      take: take,
      skip: (page - 1) * take,
      orderBy: { [sortBy]: sortOrder },
      omit: { password: true },
    }); //const users untuk nampung data users

    const total = await this.prisma.user.count({ where: whereClause });

    return {
      data: users,
      meta: { page, take, total },
    };
  };

  getUser = async (id: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: id, deletedAt: null },
      omit: { password: true },
    });
    if (!user) throw new ApiError("User Not Found", 404);
    return user;
  };

  createUser = async (body: User) => {
    // 1. Generate referralCode otomatis (karena di schema WAJIB)
    // Contoh hasil: USER-A1B2C
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const generatedReferralCode = `REF-${randomStr}`;

    await this.prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: body.password,
        referralCode: generatedReferralCode,
      },
    });
    return { message: "Create User Success" };
  };

  // Method khusus untuk mengambil profil diri sendiri beserta reward-nya
  getMyProfile = async (id: number) => {
    return await this.prisma.user.findUnique({
      where: { id },
      // Omit password agar tidak bocor ke frontend
      omit: {
        password: true,
        deletedAt: true,
      },
      // Include: Mengambil data dari tabel relasi
      include: {
        points: true, // Pastikan nama ini sesuai dengan schema.prisma kamu (bisa 'points' atau 'Point')
        coupons: true, // Pastikan nama ini sesuai dengan schema.prisma kamu (bisa 'coupons' atau 'Coupon')
      },
    });
  };

  updateUser = async (id: number, body: UpdateUserDTO) => {
    await this.getUser(id);

    if (body.email) {
      const userEmail = await this.prisma.user.findFirst({
        where: { email: body.email, NOT: { id } },
      });
      if (userEmail) throw new ApiError("Email already exist", 400);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
      },
      omit: { password: true },
    });

    return { message: "Update user success", data: updatedUser };
  };

  changePassword = async (userId: number, body: ChangePasswordDTO) => {
    // 1. Cari user berdasarkan ID (pastikan user ada)
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) throw new ApiError("User tidak ditemukan", 404);

    // 2. Cek apakah user memiliki password (antisipasi user Google Login yang belum set password)
    if (!user.password)
      throw new ApiError("User tidak memiliki password lokal", 400);

    // 3. Bandingkan password lama dari input dengan password di database
    const isMatch = await comparePassword(body.oldPassword, user.password);
    if (!isMatch) throw new ApiError("Password lama salah", 400);

    // 4. Hash password baru
    const hashedPassword = await hashPassword(body.newPassword);

    // 5. Update password di database
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: "Ubah password berhasil" };
  };

  deleteUser = async (id: number) => {
    await this.getUser(id);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Delete user success" };
  };

  uploadPhotoProfile = async (userId: number, photo: Express.Multer.File) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      omit: { password: true },
    });
    if (!user) throw new ApiError("Invalid user id", 400);

    // Kalau img sebelm udah ada di delete dulu, kalau tidak ada yasudah tidak papa
    if (user.profilePicture) {
      await this.cloudinaryService.removeByUrl(user.profilePicture);
    }

    const { secure_url } = await this.cloudinaryService.upload(photo);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePicture: secure_url },
      omit: { password: true },
    });

    return { ...updatedUser, message: "Upload Photo Success" };
  };
}
