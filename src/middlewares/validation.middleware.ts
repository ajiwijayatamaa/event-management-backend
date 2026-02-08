import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";

export class ValidationMiddleware {
  validateBody<T>(dtoClass: new () => T) {
    return async (req: Request, _res: Response, next: NextFunction) => {
      const dtoInstance = plainToInstance(dtoClass, req.body); //cek dto class nya make plainToInstance from "class-transformer"

      if (!req.body) throw new ApiError("Request body is required", 400); //kita validasi

      const errors = await validate(dtoInstance as any);

      // Jika error generate error nya, sekaligus kirim error message nya ke FE.
      if (errors.length > 0) {
        const message = errors
          .map((error) => Object.values(error.constraints || {}))
          .flat()
          .join(", ");

        throw new ApiError(message, 400);
      }

      // Jika gk ada errornya akan kita masukin dengan hasil validasinya itu
      req.body = dtoInstance;

      next();
    };
  }
}
