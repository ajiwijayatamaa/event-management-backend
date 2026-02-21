import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { corsOptions } from "./config/cors.js";
import { prisma } from "./lib/prisma.js";
import { AuthMiddleware } from "./middlewares/auth.middleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/error.middleware.js";
import { UploadMiddleware } from "./middlewares/upload.middleware.js";
import { ValidationMiddleware } from "./middlewares/validation.middleware.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthRouter } from "./modules/auth/auth.router.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { CloudinaryService } from "./modules/cloudinary/cloudinary.service.js";
import { MailService } from "./modules/mail/mail.service.js";
import { UserController } from "./modules/user/user.controller.js";
import { UserRouter } from "./modules/user/user.router.js";
import { UserService } from "./modules/user/user.service.js";
import { loggerHttp } from "./lib/logger-http.js";
import { EventService } from "./modules/event/event.service.js";
import { EventController } from "./modules/event/event.controller.js";
import { EventRouter } from "./modules/event/event.router.js";
import { TransactionService } from "./modules/transaction/transaction.service.js";
import { TransactionController } from "./modules/transaction/transaction.controller.js";
import { TransactionRouter } from "./modules/transaction/transaction.router.js";

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
    this.app.use(cors(corsOptions));
    this.app.use(loggerHttp);
    this.app.use(express.json()); // agar bisa menerima req.body
    this.app.use(cookieParser());
  };

  private registerModules = () => {
    // shared dependency
    const prismaClient = prisma;

    // services
    const mailService = new MailService();
    const cloudinaryService = new CloudinaryService();
    const authService = new AuthService(prismaClient, mailService);
    const userService = new UserService(prismaClient, cloudinaryService);
    const eventService = new EventService(prismaClient, cloudinaryService);
    const transactionService = new TransactionService(
      prismaClient,
      cloudinaryService,
      mailService,
    );

    // controllers
    const authController = new AuthController(authService);
    const userController = new UserController(userService);
    const eventController = new EventController(eventService);
    const transactionController = new TransactionController(transactionService);

    //middlewares
    const authMiddleware = new AuthMiddleware();
    const validationMiddleware = new ValidationMiddleware();
    const uploadMiddleware = new UploadMiddleware();

    // routes
    const authRouter = new AuthRouter(
      authController,
      validationMiddleware,
      authMiddleware,
    );

    const userRouter = new UserRouter(
      userController,
      authMiddleware,
      uploadMiddleware,
      validationMiddleware,
    );

    const eventRouter = new EventRouter(
      eventController,
      authMiddleware,
      uploadMiddleware,
      validationMiddleware,
    );

    const transactionRouter = new TransactionRouter(
      transactionController,
      authMiddleware,
      uploadMiddleware,
    );
    // entry point
    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/users", userRouter.getRouter());
    this.app.use("/events", eventRouter.getRouter());
    this.app.use("/transactions", transactionRouter.getRouter());
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
