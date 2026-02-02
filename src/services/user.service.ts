import { db } from "../config/db.js";

export const getUsersService = async () => {
  const query = "select * from users";
  await db.query(query);
};
