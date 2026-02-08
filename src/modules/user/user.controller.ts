import { Request, Response } from "express";
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

  updateUser = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const body = req.body;
    const result = await this.userService.updateUser(id, body);
    res.status(200).send(result);
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
