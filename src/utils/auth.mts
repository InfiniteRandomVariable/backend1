import { Request } from "express";

interface UserInfo {
  userId: string;
  userRoles: string[];
}

export const extractUserInfo = (req: Request): UserInfo | null => {
  if (
    !req ||
    !req.user ||
    !req.user.id ||
    !Array.isArray(req.user.userRoles) ||
    req.user.userRoles.length === 0
  ) {
    console.log("User information missing or invalid.");
    return null;
  }
  return {
    userId: req.user.id,
    userRoles: req.user.userRoles,
  };
};
