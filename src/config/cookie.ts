import { CookieOptions } from "express";

export const cookieOptions: CookieOptions = {
  httpOnly: true, // kalau dikasih true akses token tidak dapat di baca di browser hanya bisa di baca di BE
  secure: false, // kalau udah di deploy ganti jadi true
  sameSite: "lax", // ganti none kalau scure udah true
  path: "/",
};
