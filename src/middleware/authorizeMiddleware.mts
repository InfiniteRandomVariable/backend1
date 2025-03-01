// backend/src/middleware/authorizeMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { UserRolesEnum } from "../db/types"; // Assuming you have an enum for roles
import { AuthRequest } from "./authMiddleware.mts"; // Import the extended Request type

export const authorize =
  (allowedRoles: UserRolesEnum[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !user.role) {
      // Assuming 'role' is in your JWT payload
      return res
        .status(403)
        .json({ message: "Authorization failed: User role not found." }); // Or handle this as 401 if role is essential for auth
    }

    const userRole = user.role as UserRolesEnum; // Cast to your UserRolesEnum

    if (allowedRoles.includes(userRole)) {
      next(); // User is authorized, proceed
    } else {
      return res
        .status(403)
        .json({ message: "Authorization failed: Insufficient permissions." });
    }
  };
