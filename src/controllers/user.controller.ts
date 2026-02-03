import { Request, Response } from "express";
import {
  createUserService,
  deleteUserService,
  getUserService,
  getUsersService,
  updateUserService,
} from "../services/user.service.js";

export const getUsersController = async (req: Request, res: Response) => {
  const query = {
    page: parseInt(req.query.page as string) || 1,
    take: parseInt(req.query.take as string) || 3,
    sortOrder: (req.query.sortOrder as string) || "desc",
    sortBy: (req.query.sortBy as string) || "createdAt",
    search: (req.query.search as string) || "",
  };

  const result = await getUsersService(query);
  res.status(200).send(result);
};

export const getUserController = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await getUserService(id);
  res.status(200).send(result);
};

export const createUserContoller = async (req: Request, res: Response) => {
  const body = req.body;
  const result = await createUserService(body);
  res.status(200).send(result);
};

export const updateUserController = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const body = req.body;
  const result = await updateUserService(id, body);
  res.status(200).send(result);
};

export const deleteUserController = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await deleteUserService(id);
  res.status(200).send(result);
};
