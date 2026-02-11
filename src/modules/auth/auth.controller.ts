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
    res.cookie("refreshToken", result.refreshToken, cookieOptions);

    // remove accessToken & refreshToken
    const { accessToken, refreshToken, ...response } = result;
    res.status(200).send(response);
  };

  logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;

    const result = await this.authService.logout(refreshToken);

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.status(200).send(result);
  };

  refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;

    const result = await this.authService.refresh(refreshToken);

    res.cookie("accessToken", result.accessToken, cookieOptions);

    res.status(200).send({ message: "Refresh Success" });
  };

  google = async (req: Request, res: Response) => {
    const body = req.body;
    const result = await this.authService.google(body);

    //Sebelum send balik, masukin acces tokennya ke cookie
    res.cookie("accessToken", result.accessToken, cookieOptions);
    res.cookie("refreshToken", result.refreshToken, cookieOptions);

    // remove accessToken & refreshToken
    const { accessToken, refreshToken, ...response } = result;
    res.status(200).send(response);
  };

  forgotPassword = async (req: Request, res: Response) => {
    const body = req.body;
    const result = await this.authService.forgotPassword(body);
    res.status(200).send(result);
  };
}
