// src/middlewares/checkRoleAdminMiddleware.ts
import { type Request, type Response, type NextFunction } from "express";
import { type CustomRequest, type User } from "../libs/types.js";
import { users } from "../db/db.js";

// interface CustomRequest extends Request {
//   user?: any; // Define the user property
//   token?: string; // Define the token property
// }

export const checkRoleStudent = (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
) => {
  const payload = req.user;
  const user = users.find((u: User) => u.username === payload?.username);

  if (!user || user.role !== "STUDENT") {
    return res.status(403).json({
      ok: true,
      message: "Only Student can access this API route",
    });
  }

  next();
};