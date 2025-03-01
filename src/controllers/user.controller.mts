// backend/src/controllers/user.controller.mjs
import { Request, Response } from "express";
import z from "zod";
import { db } from "../db/database.mts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();
const MASTER_SECRET = process.env.MASTER_SECRET;
const JWT_EXPIRES_IN = "60d";
// Zod schemas for validation
const registerSchema = z.object({
  uName: z.string().min(3).max(15),
  email: z.string().email(),
  password: z.string().min(8),
});
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
});

const jwt_token = (
  userSecretSalt: string,
  user_id: number,
  userName: string | void
) => {
  const finalSecret = computeUserSecret(userSecretSalt);

  const token = jwt.sign({ id: user_id, userName: userName }, finalSecret, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
    issuer: "localhost.com",
    audience: "localhost.com",
  });
  return token;
};

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

    const user = await db
      .selectFrom("og.auth")
      .innerJoin("og.userDetails", "og.auth.emailFk", "og.userDetails.email")
      .where("og.auth.emailFk", "=", email)
      .select([
        "og.auth.passwordSalt",
        "og.auth.salt",
        "og.userDetails.userIdFk",
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

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { uName, email, password } = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 10);
    const userSecretSalt = crypto.randomBytes(32).toString("hex");

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
        salt: userSecretSalt,
        passwordSalt: hashedPassword,
      })
      .execute();

    const token = jwt_token(userSecretSalt, insertedUser.id);

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

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await findUserAuthByEmail(email);

    if (!user || !user.passwordSalt) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordSalt);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.userIdFk, userName: "" },
      MASTER_SECRET as string,
      {
        expiresIn: JWT_EXPIRES_IN,
      }
    );

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
