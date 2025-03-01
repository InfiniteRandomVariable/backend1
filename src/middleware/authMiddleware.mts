// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken"; // Consider installing @types/jsonwebtoken for better type safety: npm i --save-dev @types/jsonwebtoken
import { db } from "../db/database.mts"; // Consider checking your tsconfig.json to ensure '.mts' imports are correctly configured if you encounter issues. You might need to enable 'allowImportingTsExtensions'.
// Assuming you have a secret key stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Replace with your actual secret

export interface AuthRequest extends Request {
  user?: JwtPayload; // Or define a more specific user type based on your payload
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
    const decodedToken = jwt.verify(token, JWT_SECRET) as JwtPayload; // Verify and decode
    req.user = decodedToken; // Attach user info to the request
    next(); // Proceed to the next middleware or controller
  } catch (error) {
    console.error("Token verification error:", error); // Log errors for debugging
    return res
      .status(401)
      .json({ message: "Authentication failed: Invalid token." });
  }
};

export const authenticateTokenUserRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    async (err: any, user: any) => {
      if (err) return res.sendStatus(403);

      // Fetch user role from the database
      try {
        const dbUser = await db
          .selectFrom("og.authStatus")
          .where("userIdFk", "=", user.userId)
          .executeTakeFirst(); // Assuming userStatus is a number
        if (!dbUser) return res.sendStatus(403);

        (req as any).user = { ...user, role: (dbUser as any).userStatus }; // Add role to req.user
        next();
      } catch (dbError) {
        console.error("Database error:", dbError);
        return res.sendStatus(500);
      }
    }
  );
};

export const authorizeRole = (roles: number[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user || !roles.includes((req as any).user.role)) {
      return res.sendStatus(403);
    }
    next();
  };
};
