import { User } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";

export const getUsersService = async () => {
  const users = await prisma.user.findMany({
    omit: { password: true },
  }); //untuk nampung data users
  return users;
};

export const getUserService = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id: id },
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

  await prisma.user.delete({
    where: { id },
  });
  return { message: "Delete user success" };
};
