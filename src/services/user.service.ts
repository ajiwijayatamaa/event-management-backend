import { Prisma, User } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { PaginationQueryParams } from "../types/pagination.js";
import { ApiError } from "../utils/api-error.js";

interface GetUsersQuery extends PaginationQueryParams {
  search: string;
}

export const getUsersService = async (query: GetUsersQuery) => {
  const { page, sortBy, sortOrder, take, search } = query;

  const whereClause: Prisma.UserWhereInput = {
    deletedAt: null,
  };

  if (search) {
    whereClause.name = { contains: search, mode: "insensitive" };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    take: take,
    skip: (page - 1) * take,
    orderBy: { [sortBy]: sortOrder },
    omit: { password: true },
  }); //const users untuk nampung data users

  const total = await prisma.user.count({ where: whereClause });

  return {
    data: users,
    meta: { page, take, total },
  };
};

export const getUserService = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id: id, deletedAt: null },
    omit: { password: true },
  });
  if (!user) throw new ApiError("User Not Found", 404);
  return user;
};

export const createUserService = async (body: User) => {
  // 1. Generate referralCode otomatis (karena di schema WAJIB)
  // Contoh hasil: USER-A1B2C
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  const generatedReferralCode = `REF-${randomStr}`;

  await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: body.password,
      referralCode: generatedReferralCode,
    },
  });
  return { message: "Create User Success" };
};

export const updateUserService = async (id: number, body: Partial<User>) => {
  await getUserService(id);

  if (body.email) {
    const userEmail = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (userEmail) throw new ApiError("email already exist", 400);
  }

  await prisma.user.update({
    where: { id },
    data: body,
  });

  return { message: "update user success" };
};

export const deleteUserService = async (id: number) => {
  await getUserService(id);

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return { message: "Delete user success" };
};
