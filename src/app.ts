import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthRouter } from "./modules/auth/auth.router.js";
import { ApiError } from "./utils/api-error.js";
import { UserService } from "./modules/user/user.service.js";
import { UserController } from "./modules/user/user.controller.js";
import { UserRouter } from "./modules/user/user.router.js";

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
    const authService = new AuthService(prismaClient);
    const userService = new UserService(prismaClient);

    // controllers
    const authController = new AuthController(authService);
    const userController = new UserController(userService);

    // routes
    const authRouter = new AuthRouter(authController);
    const userRouter = new UserRouter(userController);

    // entry point
    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/users", userRouter.getRouter());
  };

  private handleError = () => {
    this.app.use(
      (
        err: ApiError,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        const message = err.message || "Something went wrong!";
        const status = err.status || 500;
        res.status(status).send({ message });
      },
    );

    this.app.use((req: express.Request, res: express.Response) => {
      res.status(404).send({ message: "Route not found" });
    });
  };

  start() {
    this.app.listen(PORT, () => {
      console.log(`Server Running On Port : ${PORT}`);
    });
  }
}
