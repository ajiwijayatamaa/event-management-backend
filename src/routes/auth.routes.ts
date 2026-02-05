import express from "express";
import { registerUserContoller } from "../controllers/auth.controller.js";

const authRouter = express.Router();
authRouter.post("/register", registerUserContoller);
export { authRouter };
