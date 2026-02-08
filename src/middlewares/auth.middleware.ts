import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";
import jwt from "jsonwebtoken";
import { Role } from "../generated/prisma/enums.js";

export class AuthMiddleware {
  //Digunakan untuk mengecek token yang dikirim dari user valid atau tidak
  verifyToken = (secretKey: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const token = req.cookies?.accessToken; //Untuk mengambil token, biasanya dari FE ngirim tokenya lewat headers,

      if (!token) throw new ApiError("No token provided", 401);

      jwt.verify(token, secretKey, (err: any, payload: any) => {
        if (err) {
          if (err instanceof jwt.TokenExpiredError) {
            throw new ApiError("Token expired", 401);
          } else {
            throw new ApiError("Token Invalid", 401);
          }
        }

        res.locals.existingUser = payload;
        next();
      });
    };
  };

  verifyRole = (roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = res.locals.existingUser.role;

      if (!userRole || !roles.includes(userRole)) {
        throw new ApiError("You dont have access to this resource", 403);
      }
    };
  };
}
