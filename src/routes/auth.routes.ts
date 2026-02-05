import express from "express";
import {
  loginContoller,
  registerContoller,
} from "../controllers/auth.controller.js";

const authRouter = express.Router();
authRouter.post("/register", registerContoller);
authRouter.post("/login", loginContoller);
export { authRouter };
