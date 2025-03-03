// backend/src/middleware/authorizeMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { UserRolesEnum } from "../db/types.mts"; // Assuming you have an enum for roles
import { AuthRequest } from "./authMiddleware.mts"; // Import the extended Request type
import { getTokenByUserId } from "../controllers/user.controller.mts";
import { getMatchingElements } from "../utils/commonUtil.mts";
export const authorizeRole =
  (allowedRoles: UserRolesEnum[]) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log("authorizeRole");
    const user = req.user;
    console.log("user", user);

    if (!user || !user.id || !user.jwtstr) {
      // Assuming 'role' is in your JWT payload
      return res
        .status(403)
        .json({ message: "Authorization failed: User role not found." }); // Or handle this as 401 if role is essential for auth
    }
    console.log("authorizeRole 2");
    const tokens = await getTokenByUserId(user.id);
    console.log("tokens", tokens);
    console.log("user.salt", user.salt);
    const userRoles = tokens.map((t) => {
      if (t.userHash != "" && user.jwtstr.includes(t.userHash)) {
        const userRole = UserRolesEnum.BuyerSeller;
        return userRole;
      } else if (t.arbiterHash != "" && user.jwtstr.includes(t.arbiterHash)) {
        const userRole = UserRolesEnum.Arbiter;
        return userRole;
      } else if (t.staffHash != "" && user.jwtstr.includes(t.staffHash)) {
        const userRole = UserRolesEnum.Staff;
        return userRole;
      } else if (t.adminHash != "" && user.jwtstr.includes(t.adminHash)) {
        const userRole = UserRolesEnum.Admin;
        return userRole;
      } else {
        return "";
      }
    });
    console.log("authorizeRole 3");
    console.log("userRoles", userRoles);
    if (!userRoles && !Array.isArray(userRoles)) {
      return res
        .status(403)
        .json({ message: "Authorization failed: User role not found." });
    }

    const filteredUserRoles = userRoles.filter(
      (role: string) => role !== ""
    ) as UserRolesEnum[];
    console.log("filteredUserRoles", filteredUserRoles);
    ///const userRole = user.role as UserRolesEnum; // Cast to your UserRolesEnum

    const matchingRoles = getMatchingElements(filteredUserRoles, allowedRoles);
    console.log("Authorizing");
    if (matchingRoles.length > 0) {
      console.log("Authorized!");
      next(); // User is authorized, proceed
    } else {
      return res
        .status(403)
        .json({ message: "Authorization failed: Insufficient permissions." });
    }
  };
