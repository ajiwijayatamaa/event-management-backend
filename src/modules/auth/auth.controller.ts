import { Request, Response } from "express";
import { cookieOptions } from "../../config/cookie.js";
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

    //Sebelum send balik, masukin acces tokennya ke cookie
    res.cookie("accessToken", result.accessToken, cookieOptions);

    const { accessToken, ...response } = result; // remove accessToken
    res.status(200).send(response);
  };

  google = async (req: Request, res: Response) => {
    const body = req.body;
    const result = await this.authService.google(body);
    res.status(200).send(result);
  };
}
