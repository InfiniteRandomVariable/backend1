// backend/src/controllers/user.controller.mjs
import { Request, Response } from "express";

import z from "zod";
import { db } from "../db/database.mts";
import { UserRolesEnum, UserStatus } from "../db/types.mts";
import { updateLastSeen } from "../db/queries/user.queries.mts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import crypto from "crypto";
import {
  getRandomNumberInRange,
  isPasswordValidForAdminOrStaff,
} from "../utils/commonUtil.mts";
import { Insertable } from "kysely";
import { OgToken } from "../db/kysely-types";
import { sanitizeString } from "../utils/commonUtil.mts";

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
  userRole: z.string().nullable().optional(),
});

export const hashUserSalt = async function () {
  const beginning = getRandomNumberInRange(3, 40);
  const end = beginning + 9;
  const hashUserSalt = crypto.randomBytes(32).toString("hex");
  const firstTenLetters = hashUserSalt.substring(beginning, end);
  return firstTenLetters;
};
export const hashUserPassword = async function (password: string) {
  const saltRounds = 13; // Adjust rounds for performance vs. security

  const hashUserSalt = await bcrypt.hash(password, saltRounds);
  return hashUserSalt;
};

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
  masterSecretKey: string = MASTER_SECRET as string
) => {
  //const finalSecret = computeUserSecret(userSecretSalt);
  console.log("userSecretSalt");
  console.log(userSecretSalt);
  const token = jwt.sign(
    { id: user_id, userName: userName, salt: userSecretSalt },
    masterSecretKey,
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
    .where("userIdFk", "=", userId)
    .executeTakeFirst(); // Filter by user_id_fk

  return tokens; // Returns an array of token objects (or empty array if no tokens found)
};

export const jwt_verify = (
  token: string = "",
  masterSecretKey: string = MASTER_SECRET as string
): Promise<jwt.JwtPayload> => {
  // {{ edit_1 }}
  console.log("#############jwt_verify");
  return new Promise((resolve, reject) => {
    // {{ edit_2 }}
    jwt.verify(token, masterSecretKey, (err, decoded) => {
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
    const { uName, email, password, userRole } = registerSchema.parse(req.body);
    const _uName = sanitizeString(uName);
    const _email = sanitizeString(email);
    const _password = sanitizeString(password);

    if (email !== _email || password !== _password || uName !== _uName) {
      return res.status(401).json({
        message: "Invalid entry. Please change to regular pattern. 198",
      });
    }

    // const _userRole = sanitizeString(userRole);

    const _userRole =
      userRole === UserRolesEnum.Admin || userRole === UserRolesEnum.Staff
        ? userRole
        : UserRolesEnum.Buyer;
    const hashedPassword = await hashUserPassword(_password);
    const hashedUserSalt = await hashUserSalt();
    const confirmedAdminOrStaff = isPasswordValidForAdminOrStaff(
      password,
      _userRole
    );

    const status = confirmedAdminOrStaff
      ? UserStatus.Normal
      : UserStatus.Pending;

    // Check if user with email already exists
    const existingUser = await db
      .selectFrom("og.userDetails")
      .where("email", "=", _email)
      .executeTakeFirst();

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const existingUserWithUName = await db
      .selectFrom("og.users")
      .where("uName", "=", _uName)
      .executeTakeFirst();

    if (existingUserWithUName) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Insert user into og.users and og.user_details tables
    const insertedUser = await db
      .insertInto("og.users")
      .values({ uName: _uName })
      .returning("id")
      .executeTakeFirst();

    if (!insertedUser) {
      return res.status(500).json({ message: "Failed to create user" });
    }

    await db
      .insertInto("og.userDetails")
      .values({ email: _email, userIdFk: insertedUser.id })
      .execute();

    // Insert auth details
    await db
      .insertInto("og.auth")
      .values({
        emailFk: _email,
        salt: hashedUserSalt,
        passwordSalt: hashedPassword,
      })
      .execute();
    console.log("insertedUser.id");
    console.log(insertedUser.id);
    await db
      .insertInto("og.authStatus")
      .values({
        userIdFk: insertedUser.id,
        verifiedEmail: confirmedAdminOrStaff, // {{ edit_1 }}
        verifiedPhone: confirmedAdminOrStaff, // {{ edit_1 }}
        verifiedUserId: confirmedAdminOrStaff, // {{ edit_1 }}
        isArbiter: false,
        isSeller: false,
        isStaffAdmin: confirmedAdminOrStaff,
        userStatus: status,
      })
      .execute();

    const token = jwt_sign(insertedUser.id, _uName, hashedUserSalt);
    await upsertTokenByUserRole(insertedUser.id, _userRole, _password, token);

    await db
      .insertInto("og.userRatings")
      .values({
        userIdFk: insertedUser.id,
        lastSeen: new Date(), // You can set an initial lastSeen timestamp
        userRating: null, // Set initial values for other columns as needed
        sellingTransactionNum: 0,
        rejectBuyerNum: 0,
        arbiterDisputeNum: 0,
        averageValueNum: null,
        avgReplyTime: null,
      })
      .execute();
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

// function confirmAdminOrStaffRole(
//   userRole: string,
//   password: string
// ): UserRolesEnum {
//   switch (userRole) {
//     case UserRolesEnum.Admin:
//       if (password.includes(adminTrailingPassword)) return UserRolesEnum.Admin;
//       throw Error("Unauthorized 318");
//     case UserRolesEnum.Staff:
//       if (password.includes(staffTrailingPassword)) return UserRolesEnum.Staff;
//       throw Error("Unauthorized 321");
//     default:
//       throw Error("Unauthorized 323");
//   }
// }

export const upsertTokenByUserRole = async function (
  userId: number,
  userRole: string,
  password: string,
  token: string
) {
  const hashToken = token.substring(0, 8);
  let buyerHash = "";
  let sellerHash = "";
  let arbiterHash = "";
  let staffHash = "";
  let adminHash = "";

  if (userRole === UserRolesEnum.Buyer) {
    buyerHash = hashToken;
  } else if (userRole === UserRolesEnum.Seller) {
    sellerHash = hashToken;
  } else if (userRole === UserRolesEnum.Arbiter) {
    arbiterHash = hashToken;
  } else if (
    userRole === UserRolesEnum.Staff &&
    isPasswordValidForAdminOrStaff(password, userRole)
  ) {
    //password must include "!_!_!"
    staffHash = hashToken;
  } else if (
    userRole === UserRolesEnum.Admin &&
    isPasswordValidForAdminOrStaff(password, userRole)
  ) {
    //password must include "#_#_"
    adminHash = hashToken;
  } else {
    throw new Error(`Invalid user role: ${userRole}`);
  }

  await upsertToken({
    userIdFk: userId,
    buyerHash: buyerHash,
    sellerHash: sellerHash,
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
    let { email, password, userRole } = loginSchema.parse(req.body);
    const _email = sanitizeString(email);

    const _password = sanitizeString(password);
    if (email !== _email || password !== _password) {
      return res.status(401).json({ message: "Invalid entry 397" });
    }

    if (!userRole) {
      userRole = UserRolesEnum.Buyer;
    }
    const user = await findUserAuthByEmail(String(_email));

    if (!user || !user.passwordSalt || !user.uName || !user.salt) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(
      String(_password),
      user.passwordSalt
    );

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt_sign(user.userIdFk, user.uName, user.salt);

    await upsertTokenByUserRole(
      user.userIdFk,
      userRole,
      String(_password),
      token
    );
    await updateLastSeen(user.userIdFk);
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
