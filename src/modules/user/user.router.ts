import express, { Router } from "express";
import { UserController } from "./user.controller.js";

export class UserRouter {
  private router: Router;

  constructor(private userController: UserController) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get("/", this.userController.getUsers);
    this.router.get("/:id", this.userController.getUser);
    this.router.post("/", this.userController.createUser);
    this.router.patch("/:id", this.userController.updateUser);
    this.router.delete("/id", this.userController.deleteUser);
  };

  getRouter = () => {
    return this.router;
  };
}
