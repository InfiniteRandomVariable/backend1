// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { jwt_verify } from "../controllers/user.controller.mts";
import { JwtPayload } from "jsonwebtoken"; // Consider installing @types/jsonwebtoken for better type safety: npm i --save-dev @types/jsonwebtoken
import { db } from "../db/database.mts"; // Consider checking your tsconfig.json to ensure '.mts' imports are correctly configured if you encounter issues. You might need to enable 'allowImportingTsExtensions'.
// Assuming you have a secret key stored in environment variables
import { UserRolesEnum } from "../db/types.mts"; // Assuming you have an enum for roles
//import { getTokenByUserId } from "../controllers/user.controller.mts";
import { getMatchingElements } from "../utils/commonUtil.mts";

const JWT_SECRET = process.env.JWT_SECRET; // Replace with your actual secret

export interface AuthRequest extends Request {
  // {{ edit_1 }}
  user?: JwtPayload & { role?: number }; // {{ edit_2 }}
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication required: No token provided." });
  }

  try {
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not defined!");
      return res.status(500).json({ message: "Server configuration error." });
    }
    if (!token) {
      return res
        .status(401)
        .json({ message: "Authentication required: No token provided." }); // Re-check token existence here for extra safety. Although it's checked before, it's good to be explicit within the try block.
    }
    const decodedToken = jwt_verify(token) as unknown as JwtPayload; // Verify and decode, casting JWT_SECRET to string to satisfy type checker
    req.user = decodedToken; // Attach user info to the request
    next(); // Proceed to the next middleware or controller
  } catch (error) {
    console.error("Token verification error:", error); // Log errors for debugging
    return res
      .status(401)
      .json({ message: "Authentication failed: Invalid token." });
  }
};

export const authenticateTokenUserAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("before next1 ");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log("before next3 ");
  console.log(token);
  // if (token == null) return res.sendStatus(401);

  try {
    const user = (await jwt_verify(token)) as unknown as JwtPayload;
    console.log("user");
    console.log(user);
    console.log(user.id);
    const dbUserAndTokens = await db
      .selectFrom("og.authStatus as authStatus")
      .innerJoin("og.token as token", "authStatus.userIdFk", "token.userIdFk")
      .selectAll("authStatus")
      .select([
        "token.buyerHash",
        "token.sellerHash",
        "token.arbiterHash",
        "token.staffHash",
        "token.adminHash",
      ])
      .where("authStatus.userIdFk", "=", user.id)
      .execute();

    const dbUser = dbUserAndTokens[0];

    if (!dbUser || dbUser.userStatus == null || dbUser.userStatus < 0) {
      console.log("authenticateTokenUserRole 73");
      console.log(dbUser);
      return res.sendStatus(403);
    }

    (req as AuthRequest).user = {
      ...user,
      ...dbUser,
      status: dbUser.userStatus,
      jwtstr: token,
    }; // Add role to req.user
    console.log("before next");
    next();
    console.log("after next");
  } catch (dbError) {
    console.log("error 81");
    console.error("Database error:", dbError);
    return res.sendStatus(500);
  }
};

export const authorizeRole =
  (allowedRoles: UserRolesEnum[]) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log("authorizeRole");
    const user = req.user;
    console.log("user", user);

    //Conside to add user salt matchint the one provided by the client side to the server side.
    //let didMatchUserSalt = false;

    if (!user || !user.id || !user.jwtstr || typeof user !== "object") {
      // Assuming 'role' is in your JWT payload
      return res
        .status(403)
        .json({ message: "Authorization failed: User role not found." }); // Or handle this as 401 if role is essential for auth
    }
    console.log("authorizeRole 2");
    //const tokens = await getTokenByUserId(user.id);
    //console.log("tokens", tokens);

    const userEntries = Object.entries(user); // Get an array of [key, value] pairs
    console.log("user.salt", user.salt);

    const userRoles = userEntries.reduce((accumulator, [key, value]) => {
      switch (key) {
        case "isSeller":
          if (value === true) {
            if (
              user.sellerHash != "" &&
              user.jwtstr.includes(user.sellerHash)
            ) {
              accumulator.push(UserRolesEnum.Seller);
            }
          }
          break;
        case "isArbiter":
          if (value === true) {
            if (
              user.arbiterHash != "" &&
              user.jwtstr.includes(user.arbiterHash)
            ) {
              accumulator.push(UserRolesEnum.Arbiter);
            }
          }
          break;
        case "isStaffAdmin":
          if (value === true) {
            if (
              !accumulator.includes(UserRolesEnum.Admin) &&
              user.adminHash != "" &&
              user.jwtstr.includes(user.adminHash)
            ) {
              accumulator.push(UserRolesEnum.Admin);
            }

            if (
              !accumulator.includes(UserRolesEnum.Staff) &&
              user.staffHash != "" &&
              user.jwtstr.includes(user.staffHash)
            ) {
              accumulator.push(UserRolesEnum.Staff);
            }
          }
          break;
        default:
          break;
      }
      return accumulator;
    }, [] as UserRolesEnum[]);

    console.log("authorizeRole 3");
    console.log("userRoles", userRoles);
    if (!userRoles && !Array.isArray(userRoles)) {
      return res
        .status(403)
        .json({ message: "Authorization failed: User role not found." });
    }

    ///const userRole = user.role as UserRolesEnum; // Cast to your UserRolesEnum

    const matchingRoles = getMatchingElements(userRoles, allowedRoles);
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

// export const authorizeRole = (roles: string[]) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     console.log((req as any).user);
//     console.log("(req as any).user");
//     console.log(!roles.includes((req as any).user.role));
//     if (!(req as any).user || !roles.includes((req as any).user.role)) {
//       console.log("(req as any).user 2");
//       return res.sendStatus(403);
//     }
//     next();
//   };
// };
