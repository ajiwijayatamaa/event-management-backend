import { CorsOptions } from "cors";

export const corsOptions: CorsOptions = {
  origin: ["http://localhost:5173", "http://localhost:3000"], // tambahin lagi url nya kalau udah di deploy
  credentials: true,
};
