import { NextFunction, Request, Response } from "express";
import { UserService } from "./user.service.js";
import { ApiError } from "../../utils/api-error.js";

export class UserController {
  constructor(private userService: UserService) {}

  getUsers = async (req: Request, res: Response) => {
    const query = {
      page: parseInt(req.query.page as string) || 1,
      take: parseInt(req.query.take as string) || 3,
      sortOrder: (req.query.sortOrder as string) || "desc",
      sortBy: (req.query.sortBy as string) || "createdAt",
      search: (req.query.search as string) || "",
    };

    const result = await this.userService.getUsers(query);
    res.status(200).send(result);
  };

  getUser = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.userService.getUser(id);
    res.status(200).send(result);
  };

  createUser = async (req: Request, res: Response) => {
    const body = req.body;
    const result = await this.userService.createUser(body);
    res.status(200).send(result);
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Ambil ID dari token (PASTI AMAN karena sudah lewat AuthMiddleware)
      const id = res.locals.existingUser?.id;

      // 2. Validasi ID
      if (!id) {
        throw new ApiError("User ID not found in token", 401);
      }

      // 3. Panggil service yang baru kita buat
      const user = await this.userService.getMyProfile(id);

      // 4. Kirim response
      res.status(200).send(user);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response) => {
    // Ambil ID dari URL jika ada, jika tidak (rute /profile) ambil dari token
    // Sesuaikan dengan nama 'existingUser' dari middleware kamu
    const userId = req.params.id
      ? Number(req.params.id)
      : res.locals.existingUser?.id;

    if (!userId || isNaN(userId)) {
      throw new ApiError("User ID not found or invalid", 401);
    }

    const body = req.body;
    const result = await this.userService.updateUser(userId, body);
    res.status(200).send(result);
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.existingUser?.id;

      if (!userId) throw new ApiError("Unauthorized", 401);

      const result = await this.userService.changePassword(userId, req.body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.userService.deleteUser(id);
    res.status(200).send(result);
  };

  uploadPhotoProfile = async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const photoProfile = files.photoProfile?.[0];

    if (!photoProfile) throw new ApiError("Photo Profile is required", 400);

    const userId = res.locals.existingUser.id;

    const result = await this.userService.uploadPhotoProfile(
      userId,
      photoProfile,
    );
    res.status(200).send(result);
  };
}
