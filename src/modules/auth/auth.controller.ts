import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    const body = req.body;
    const result = await this.authService.register(body);
    res.status(200).send(result);
  };

  login = async (req: Request, res: Response) => {
    const body = req.body;
    const result = await this.authService.login(body);
    res.status(200).send(result);
  };

  google = async (req: Request, res: Response) => {
    const body = req.body;
    const result = await this.authService.google(body);
    res.status(200).send(result);
  };
}
