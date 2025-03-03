// backend/src/test/users.test.mts
import request from "supertest";
import { app } from "../server.mts";
import { db } from "../db/database.mts";
import { UserRolesEnum } from "../db/types.mts";
import {
  adminTrailingPassword,
  staffTrailingPassword,
} from "../utils/commonUtil.mts";
//import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import {
  hashUserSalt,
  jwt_sign,
  getHashedPassword,
  upsertTokenByUserRole,
} from "../controllers/user.controller.mts";
dotenv.config();
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Users API Endpoints", () => {
  let adminToken: string;
  let userToken: string;
  let newUserToken: string;
  let createdUserId: number;
  let createdUserEmail: string;
  let userId: number;

  beforeAll(async () => {
    // Clear user tables
    await db.deleteFrom("og.auth").execute();
    await db.deleteFrom("og.userDetails").execute();
    await db.deleteFrom("og.users").execute();

    const userSecretSalt = await hashUserSalt();
    const newUserSecretSalt = await hashUserSalt();
    const adminSecretSalt = await hashUserSalt();
    const adminPassword = "adminPassword" + adminTrailingPassword;
    const adminHashedPassword = await getHashedPassword(adminPassword);

    // Create an admin user
    const adminUser = await db
      .insertInto("og.users")
      .values({ uName: "Admin" })
      .returning("id")
      .executeTakeFirst();
    await db
      .insertInto("og.userDetails")
      .values({ email: "admin@example.com", userIdFk: adminUser!.id })
      .execute();
    await db
      .insertInto("og.authStatus")
      .values({ userIdFk: adminUser!.id, userStatus: 4 })
      .execute();
    adminToken = jwt_sign(adminUser!.id, "Admin", adminSecretSalt);
    await db
      .insertInto("og.auth")
      .values({
        emailFk: "admin@example.com",
        salt: adminSecretSalt,
        passwordSalt: adminHashedPassword,
      })
      .execute();

    // Create a regular user
    const regularUser = await db
      .insertInto("og.users")
      .values({ uName: "User" })
      .returning("id")
      .executeTakeFirst();
    userId = regularUser!.id;
    await db
      .insertInto("og.userDetails")
      .values({ email: "user@example.com", userIdFk: regularUser!.id })
      .execute();
    await db
      .insertInto("og.authStatus")
      .values({ userIdFk: regularUser!.id, userStatus: 0 })
      .execute();

    const hashedPassword = await getHashedPassword("password");

    await db
      .insertInto("og.auth")
      .values({
        emailFk: "user@example.com",
        salt: userSecretSalt,
        passwordSalt: hashedPassword,
      })
      .execute();

    userToken = jwt_sign(regularUser!.id, "User", userSecretSalt);

    const newHashedPassword = await getHashedPassword("newPassword");

    const newUser = await db
      .insertInto("og.users")
      .values({ uName: "testUser" })
      .returning("id")
      .executeTakeFirstOrThrow();
    createdUserId = newUser.id;
    await db
      .insertInto("og.userDetails")
      .values({ email: "test@test.com", userIdFk: newUser.id })
      .execute();
    createdUserEmail = "test@test.com";

    await db
      .insertInto("og.auth")
      .values({
        emailFk: "test@test.com",
        salt: userSecretSalt,
        passwordSalt: newHashedPassword,
      })
      .execute();

    newUserToken = jwt_sign(newUser!.id, "testUser", newUserSecretSalt);

    await upsertTokenByUserRole(
      adminUser!.id,
      UserRolesEnum.Admin,
      adminPassword,
      adminToken
    );
  });

  describe("GET /api/users/profile", () => {
    it("should return the user profile", async () => {
      console.log("*************userId");
      console.log("userToken");
      console.log(userToken);
      console.log(userId);
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${userToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("uName");
    });

    it("should return 200 for access", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${userToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/users/all", () => {
    it("should return all users for admin", async () => {
      const response = await request(app)
        .get("/api/users/all")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should return 403 for non-admin access", async () => {
      const response = await request(app)
        .get("/api/users/all")
        .set("Authorization", `Bearer ${userToken}`);
      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete a user for admin", async () => {
      const response = await request(app)
        .delete(`/api/users/${createdUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
    });

    it("should return 403 for non-admin access", async () => {
      const response = await request(app)
        .delete(`/api/users/${createdUserId}`)
        .set("Authorization", `Bearer ${userToken}`);
      expect(response.status).toBe(403);
    });

    it("should return 404 for deleting a non-existent user", async () => {
      const response = await request(app)
        .delete(`/api/users/9999`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(response.status).toBe(500);
    });
  });

  afterAll(async () => {
    await db.destroy();
  });
});
