import { Request, Response } from "express";
import { registerService } from "../services/auth.service.js";

export const registerUserContoller = async (req: Request, res: Response) => {
  const body = req.body;
  const result = await registerService(body);
  res.status(200).send(result);
};
