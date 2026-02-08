import cors from "cors";
import express from "express";
import { prisma } from "./lib/prisma.js";
import { AuthMiddleware } from "./middlewares/auth.middleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/error.middleware.js";
import { ValidationMiddleware } from "./middlewares/validation.middleware.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthRouter } from "./modules/auth/auth.router.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { UserController } from "./modules/user/user.controller.js";
import { UserRouter } from "./modules/user/user.router.js";
import { UserService } from "./modules/user/user.service.js";
import { CloudinaryService } from "./modules/cloudinary/cloudinary.service.js";
import { UploadMiddleware } from "./middlewares/upload.middleware.js";

const PORT = 8000;

export class App {
  app: express.Express;

  constructor() {
    this.app = express();
    this.configure();
    this.registerModules();
    this.handleError();
  }

  private configure = () => {
    this.app.use(cors());
    this.app.use(express.json()); // agar bisa menerima req.body
  };

  private registerModules = () => {
    // shared dependency
    const prismaClient = prisma;

    // services
    const cloudinaryService = new CloudinaryService();
    const authService = new AuthService(prismaClient);
    const userService = new UserService(prismaClient, cloudinaryService);

    // controllers
    const authController = new AuthController(authService);
    const userController = new UserController(userService);

    //middlewares
    const authMiddleware = new AuthMiddleware();
    const validationMiddleware = new ValidationMiddleware();
    const uploadMiddleware = new UploadMiddleware();

    // routes
    const authRouter = new AuthRouter(authController, validationMiddleware);
    const userRouter = new UserRouter(
      userController,
      authMiddleware,
      uploadMiddleware,
    );

    // entry point
    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/users", userRouter.getRouter());
  };

  private handleError = () => {
    this.app.use(errorMiddleware);
    this.app.use(notFoundMiddleware);
  };

  start() {
    this.app.listen(PORT, () => {
      console.log(`Server Running On Port : ${PORT}`);
    });
  }
}
