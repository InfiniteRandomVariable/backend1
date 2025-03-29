import { Request } from "express";
import { UserRolesEnum } from "../db/types.mts";

interface UserInfo {
  userId: number;
  userRoles: string[];
}
const enumValues = Object.values(UserRolesEnum);
export const extractUserInfo = (req: Request): UserInfo => {
  let userId = 0;
  let userRoles: string[] = [];

  if (req && req.user && req.user.id && typeof req.user.id === "number") {
    userId = req.user.id;
  }

  const didMatchEnum = enumValues.some((enumValue) =>
    req.user.userRoles.includes(enumValue)
  );
  // console.log("req.user.userRoles ", req.user.userRoles);
  // console.log("didMatchEnum ", didMatchEnum);

  if (
    Array.isArray(req.user.userRoles) &&
    req.user.userRoles.length > 0 &&
    didMatchEnum
  ) {
    return {
      userId: userId,
      userRoles: req.user.userRoles,
    };
  }

  return {
    userId: userId,
    userRoles: userRoles,
  };
};
