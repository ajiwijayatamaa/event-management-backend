import { Prisma, PrismaClient, User } from "../../generated/prisma/client.js";
import { PaginationQueryParams } from "../../types/pagination.js";
import { ApiError } from "../../utils/api-error.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";

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

  updateUser = async (id: number, body: Partial<User>) => {
    await this.getUser(id);

    if (body.email) {
      const userEmail = await this.prisma.user.findUnique({
        where: { email: body.email },
      });
      if (userEmail) throw new ApiError("email already exist", 400);
    }

    await this.prisma.user.update({
      where: { id },
      data: body,
    });

    return { message: "update user success" };
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
