import express, { Router } from "express";
import { UserController } from "./user.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UploadMiddleware } from "../../middlewares/upload.middleware.js";

export class UserRouter {
  private router: Router;

  constructor(
    private userController: UserController,
    private authMiddleware: AuthMiddleware,
    private uploadMiddleware: UploadMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get(
      "/",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authMiddleware.verifyRole(["ADMIN"]),
      this.userController.getUsers,
    );
    this.router.get("/:id", this.userController.getUser);
    this.router.post("/", this.userController.createUser);
    this.router.post(
      "/photo-profile",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.uploadMiddleware
        .upload()
        .fields([{ name: "photoProfile", maxCount: 1 }]),
      this.userController.uploadPhotoProfile,
    );
    this.router.patch("/:id", this.userController.updateUser);
    this.router.delete("/id", this.userController.deleteUser);
  };

  getRouter = () => {
    return this.router;
  };
}
