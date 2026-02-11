import express, { Router } from "express";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { AuthController } from "./auth.controller.js";
import { GoogleDTO } from "./dto/google.dto.js";
import { LoginDTO } from "./dto/login.dto.js";
import { RegisterDTO } from "./dto/register.dto.js";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto.js";

export class AuthRouter {
  private router: Router;

  constructor(
    private authController: AuthController,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.post(
      "/register",
      this.validationMiddleware.validateBody(RegisterDTO),
      this.authController.register,
    );
    this.router.post(
      "/login",
      this.validationMiddleware.validateBody(LoginDTO),
      this.authController.login,
    );
    this.router.post(
      "/google",
      this.validationMiddleware.validateBody(GoogleDTO),
      this.authController.google,
    );
    this.router.post("/logout", this.authController.logout);
    this.router.post("/refresh", this.authController.refresh);
    this.router.post(
      "/forgot-password",
      this.validationMiddleware.validateBody(ForgotPasswordDTO),
      this.authController.forgotPassword,
    );
  };

  getRouter = () => {
    return this.router;
  };
}
