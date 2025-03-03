// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { jwt_verify } from "../controllers/user.controller.mts";
import { JwtPayload } from "jsonwebtoken"; // Consider installing @types/jsonwebtoken for better type safety: npm i --save-dev @types/jsonwebtoken
import { db } from "../db/database.mts"; // Consider checking your tsconfig.json to ensure '.mts' imports are correctly configured if you encounter issues. You might need to enable 'allowImportingTsExtensions'.
// Assuming you have a secret key stored in environment variables
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

export const authenticateTokenUserRole = async (
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
    const dbUser = await db
      .selectFrom("og.authStatus")
      .where("userIdFk", "=", user.id)
      .select(["userIdFk", "userStatus"])
      .executeTakeFirst(); // Assuming userStatus is a number

    if (!dbUser || dbUser.userStatus == null || dbUser.userStatus < 0)
      return res.sendStatus(403);
    (req as AuthRequest).user = {
      ...user,
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

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log((req as any).user);
    console.log("(req as any).user");
    console.log(!roles.includes((req as any).user.role));
    if (!(req as any).user || !roles.includes((req as any).user.role)) {
      console.log("(req as any).user 2");
      return res.sendStatus(403);
    }
    next();
  };
};
