import { CookieOptions } from "express";

export const cookieOptions: CookieOptions = {
  httpOnly: true, // kalau dikasih true akses token tidak dapat di baca di browser hanya bisa di baca di BE
  secure: false, // kalau udah di deploy ganti jadi = process.env.NODE_ENV === "production",
  sameSite: "lax", // ganti juga kalau udah di deploy jadi = process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};
