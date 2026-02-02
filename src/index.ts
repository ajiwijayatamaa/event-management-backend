import express, { NextFunction, Request, Response } from "express";
import { userRouter } from "./routes/user.routes.js";
import { ApiError } from "./utils/api-error.js";

const PORT = 8000;
const app = express();

app.use(express.json()); // agar bisa menerima req.body

app.get("/api", (req, res) => {
  res.status(200).send("Welcome to my API");
});

app.use("/users", userRouter);

app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
  const message = err.message || "Something went wrong!";
  const status = err.status || 500;
  res.status(status).send({ message });
});

app.use((req, res) => {
  res.status(404).send({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port : ${PORT}`);
});
