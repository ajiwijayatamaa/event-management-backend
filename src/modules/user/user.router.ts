import express, { Router } from "express";
import { UserController } from "./user.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UploadMiddleware } from "../../middlewares/upload.middleware.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { ChangePasswordDTO } from "../auth/dto/change-password.dto.js";

export class UserRouter {
  private router: Router;

  constructor(
    private userController: UserController,
    private authMiddleware: AuthMiddleware,
    private uploadMiddleware: UploadMiddleware,
    private validationMiddleware: ValidationMiddleware,
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
    this.router.get(
      "/profile", // Endpoint khusus profil sendiri
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!), // Wajib login
      this.userController.getProfile, // Panggil controller baru
    );
    // PROTECTED: Update Profile Data (Name, Email, etc.)
    this.router.patch(
      "/profile", // Gunakan endpoint spesifik, jangan pakai /:id agar user hanya bisa update diri sendiri
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.userController.updateUser,
    );

    this.router.post("/", this.userController.createUser);

    this.router.post(
      "/photo-profile",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.uploadMiddleware
        .upload()
        .fields([{ name: "photoProfile", maxCount: 1 }]),
      this.userController.uploadPhotoProfile,
    );

    // PROTECTED: Change Password (Logika Baru)
    this.router.patch(
      "/change-password",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.validationMiddleware.validateBody(ChangePasswordDTO),
      this.userController.changePassword,
    );

    this.router.get("/:id", this.userController.getUser);
    this.router.patch("/:id", this.userController.updateUser);

    // PROTECTED: Delete Account
    this.router.delete(
      "/:id",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.userController.deleteUser,
    );
  };

  getRouter = () => {
    return this.router;
  };
}
