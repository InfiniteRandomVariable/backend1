// backend/src/controllers/user.controller.mjs
import { Request, Response } from "express";
import z from "zod";
import { db } from "../db/database.mts";
import { UserRolesEnum } from "../db/types.mts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import crypto from "crypto";
import {
  getRandomNumberInRange,
  isPasswordValid,
} from "../utils/commonUtil.mts";
import { Insertable } from "kysely";
import { OgToken } from "../db/kysely-types";
dotenv.config();
//const secureKey = crypto.randomBytes(32).toString("hex");
const MASTER_SECRET = process.env.JWT_SECRET;
console.log("MASTER_SECRET");
console.log(MASTER_SECRET);

const JWT_EXPIRES_IN = "60d";
// Zod schemas for validation
const registerSchema = z.object({
  uName: z.string().min(3).max(15),
  email: z.string().email(),
  password: z.string().min(8),
});

export const hashUserSalt = async function () {
  const beginning = getRandomNumberInRange(3, 40);
  const end = beginning + 9;
  const hashUserSalt = crypto.randomBytes(32).toString("hex");
  const firstTenLetters = hashUserSalt.substring(beginning, end);
  return firstTenLetters;
};
async function hashUserPassword(password: string) {
  const saltRounds = 13; // Adjust rounds for performance vs. security

  const hashUserSalt = await bcrypt.hash(password, saltRounds);
  return hashUserSalt;
}

const computeUserSecret = (userSecret: string) => {
  if (!MASTER_SECRET) {
    throw new Error("MASTER_SECRET is not defined in environment variables");
  }
  return crypto
    .createHmac("sha256", MASTER_SECRET)
    .update(userSecret)
    .digest("hex");
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  userRole: z.string().min(3).max(7),
});

export const jwt_sign = (
  user_id: number,
  userName: string | void,
  userSecretSalt: string = "",
  userSecretKey: string = MASTER_SECRET as string
) => {
  //const finalSecret = computeUserSecret(userSecretSalt);
  console.log("userSecretSalt");
  console.log(userSecretSalt);
  const token = jwt.sign(
    { id: user_id, userName: userName, salt: userSecretSalt },
    userSecretKey,
    {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: "HS256",
      issuer: "localhost.com",
      audience: "localhost.com",
    }
  );
  return token;
};
export const getTokenByUserId = async function getTokenByUserId(
  userId: number
) {
  const tokens = await db
    .selectFrom("og.token")
    .selectAll() // Select all columns from og.token table
    .where("userIdFk", "=", userId) // Filter by user_id_fk
    .execute();

  return tokens; // Returns an array of token objects (or empty array if no tokens found)
};

export const jwt_verify = (
  token: string = "",
  userSecretKey: string = MASTER_SECRET as string
): Promise<jwt.JwtPayload> => {
  // {{ edit_1 }}
  return new Promise((resolve, reject) => {
    // {{ edit_2 }}
    jwt.verify(token, userSecretKey, (err, decoded) => {
      // {{ edit_3 }}
      if (err) {
        console.error("JWT verification failed:", err.message);
        reject(err); // {{ edit_4 }}
      } else {
        console.log("JWT is valid. Decoded payload:", decoded);
        resolve(decoded as jwt.JwtPayload); // {{ edit_5 }}
      }
    });
  });
};

// export const jwt_verify = (
//   token: string,
//   userSecretKey: string = MASTER_SECRET as string
// ) => {
//   //const finalSecret = computeUserSecret(userSecretSalt);
//   const decoded = jwt.verify(token, userSecretKey, (err, decoded) => {
//     if (err) {
//       console.error("JWT verification failed:", err.message);
//     } else {
//       console.log("JWT is valid. Decoded payload:", decoded);
//     }
//   });
//   return decoded;
// };
async function findUserAuthByEmail(email: string) {
  try {
    // const user = await db
    // .selectFrom('og.auth')
    // .innerJoin('og.userDetails', 'og.auth.emailFk', 'og.userDetails.email')
    // .innerJoin('og.users', 'og.userDetails.userIdFk', 'og.users.id')
    // .where('og.auth.emailFk', '=', email)
    // .select([
    //   'og.auth.passwordSalt',
    //   'og.auth.salt',
    //   'og.userDetails.userIdFk',
    //   'og.users.uName',
    // ])
    // .executeTakeFirst();

    // const user = await db
    //   .selectFrom("og.auth")
    //   .innerJoin("og.userDetails", "og.auth.emailFk", "og.userDetails.email")
    //   .where("og.auth.emailFk", "=", email)
    //   .select([
    //     "og.auth.passwordSalt",
    //     "og.auth.salt",
    //     "og.userDetails.userIdFk",
    //   ])
    //   .executeTakeFirst();

    const user = await db
      .selectFrom("og.auth")
      .innerJoin("og.userDetails", "og.auth.emailFk", "og.userDetails.email")
      .innerJoin("og.users", "og.userDetails.userIdFk", "og.users.id") // {{ edit_1 }}
      .where("og.auth.emailFk", "=", email)
      .select([
        "og.auth.passwordSalt",
        "og.auth.salt",
        "og.userDetails.userIdFk",
        "og.users.uName", // {{ edit_2 }}
      ])
      .executeTakeFirst();

    if (user) {
      return user;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error finding user ID by email:", error);
    return null;
  }
}
// export const getUserSecretSalt = () => {
//   return crypto.randomBytes(32).toString("hex");
// };

export const getHashedPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { uName, email, password } = registerSchema.parse(req.body);
    const hashedPassword = await hashUserPassword(password);
    const hashedUserSalt = await hashUserSalt();

    // Check if user with email already exists
    const existingUser = await db
      .selectFrom("og.userDetails")
      .where("email", "=", email)
      .executeTakeFirst();

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Insert user into og.users and og.user_details tables
    const insertedUser = await db
      .insertInto("og.users")
      .values({ uName })
      .returning("id")
      .executeTakeFirst();

    if (!insertedUser) {
      return res.status(500).json({ message: "Failed to create user" });
    }

    await db
      .insertInto("og.userDetails")
      .values({ email, userIdFk: insertedUser.id })
      .execute();

    // Insert auth details
    await db
      .insertInto("og.auth")
      .values({
        emailFk: email,
        salt: hashedUserSalt,
        passwordSalt: hashedPassword,
      })
      .execute();

    const token = jwt_sign(insertedUser.id, uName, hashedUserSalt);
    await upsertTokenByUserRole(
      insertedUser.id,
      UserRolesEnum.BuyerSeller,
      password,
      token
    );

    res
      .status(201)
      .json({ message: "User registered successfully", token: token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid data", errors: error.errors });
    }
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Error registering user" });
  }
};
export const upsertToken = async function (tokenData: Insertable<OgToken>) {
  //https://github.com/kysely-org/kysely/issues/677
  const result = await db
    .insertInto("og.token")
    .values(tokenData)
    .onConflict((oc) =>
      oc.column("userIdFk").doUpdateSet((eb) => {
        const keys = Object.keys(tokenData) as (keyof OgToken)[];
        return Object.fromEntries(
          keys.map((key) => [key, eb.ref(`excluded.${key}`)])
        );
      })
    )
    .executeTakeFirst();

  // const result = await db
  //   .insertInto("og.token")
  //   .values(tokenData)
  //   .returningAll() // Optional: to get back the inserted row
  //   .executeTakeFirst(); // Or .execute() if you expect to insert multiple rows

  return result; // Returns the inserted row (if using returningAll/executeTakeFirst) or void
};

export const upsertTokenByUserRole = async function (
  userId: number,
  userRole: string,
  password: string,
  token: string
) {
  const hashToken = token.substring(0, 8);
  let userHash = "";
  let arbiterHash = "";
  let staffHash = "";
  let adminHash = "";
  if (userRole === UserRolesEnum.BuyerSeller) {
    userHash = hashToken;
  } else if (userRole === UserRolesEnum.Arbiter) {
    arbiterHash = hashToken;
  } else if (
    userRole === UserRolesEnum.Staff &&
    isPasswordValid(password, userRole)
  ) {
    //password must include "!_!_!"
    staffHash = hashToken;
  } else if (
    userRole === UserRolesEnum.Admin &&
    isPasswordValid(password, userRole)
  ) {
    //password must include "#_#_"
    adminHash = hashToken;
  } else {
    throw new Error("Invalid user role");
  }

  await upsertToken({
    userIdFk: userId,
    userHash: userHash,
    arbiterHash: arbiterHash,
    staffHash: staffHash,
    adminHash: adminHash,
    criticalErrors: 0,
    lastUpdateAt: new Date(),
    nextResetAt: new Date(),
  });
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password, userRole } = loginSchema.parse(req.body);

    const user = await findUserAuthByEmail(email);

    if (!user || !user.passwordSalt || !user.uName || !user.salt) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordSalt);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt_sign(user.userIdFk, user.uName, user.salt);

    await upsertTokenByUserRole(user.userIdFk, userRole, password, token);

    res.json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid data", errors: error.errors });
    }
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};
export const getUserProfile = async (
  req: Request,
  res: Response,
  next?: unknown
) => {
  try {
    console.log("getUserProfile 1");
    const user = (req as any).user;
    console.log(user);

    const profile = await db
      .selectFrom("og.users")
      .innerJoin("og.userDetails", "og.users.id", "og.userDetails.userIdFk")
      .where("og.users.id", "=", user.id)
      .select([
        "og.users.uName",
        "og.userDetails.email",
        "og.userDetails.add1",
        "og.userDetails.add2",
      ])
      .executeTakeFirst();

    console.log("getUserProfile 2");
    if (!profile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ message: "Error getting user profile" });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await db.selectFrom("og.users").selectAll().execute();
    res.json(users);
  } catch (error) {
    console.error("Error getting all users:", error);
    res.status(500).json({ message: "Error getting all users" });
  }
};
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    //Delete from all tables that have a foreign key to users.
    await db
      .deleteFrom("og.auth")
      .where(
        "emailFk",
        "=",
        (
          await db
            .selectFrom("og.userDetails")
            .where("userIdFk", "=", userId)
            .select(["email"])
            .executeTakeFirstOrThrow()
        ).email
      )
      .execute();
    await db
      .deleteFrom("og.userDetails")
      .where("userIdFk", "=", userId)
      .execute();
    await db.deleteFrom("og.users").where("id", "=", userId).execute();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user" });
  }
};
