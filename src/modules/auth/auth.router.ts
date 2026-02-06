import express, { Router } from "express";
import { AuthController } from "./auth.controller.js";

export class AuthRouter {
  private router: Router;

  constructor(private authController: AuthController) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.post("/register", this.authController.register);
    this.router.post("/login", this.authController.login);
  };

  getRouter = () => {
    return this.router;
  };
}
