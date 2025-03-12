// // backend/src/test/users.test.mts
// import request from "supertest";
// import { app } from "../server.mts";
// import { db } from "../db/database.mts";
// import { UserRolesEnum } from "../db/types.mts";
// import {
//   adminTrailingPassword,
//   makeid,
//   staffTrailingPassword,
// } from "../utils/commonUtil.mts";
// //import jwt from "jsonwebtoken";
// import * as dotenv from "dotenv";
// import {
//   hashUserSalt,
//   jwt_sign,
//   getHashedPassword,
//   upsertTokenByUserRole,
// } from "../controllers/user.controller.mts";
// dotenv.config();
// import { describe, it, expect, beforeAll, afterAll } from "vitest";

// describe("Users API Endpoints", () => {
//   let adminToken: string;
//   let userToken: string;
//   let newUserToken: string;
//   let createdUserId: number;
//   let createdUserEmail: string;
//   let userId: number;
//   const userName = makeid(6);
//   const userEmail = `${userName}@email.com`;
//   const testUserName = makeid(6);
//   const testUserEmail = `${testUserName}@email.com`;
//   const adminName = makeid(6);
//   const adminEmail = `${adminName}@email.com`;

//   beforeAll(async () => {
//     // Clear user tables
//     // await db.deleteFrom("og.auth").execute();
//     // await db.deleteFrom("og.userDetails").execute();
//     // await db.deleteFrom("og.users").execute();
//     // await db.deleteFrom("og.authStatus").execute();

//     const userSecretSalt = await hashUserSalt();
//     const newUserSecretSalt = await hashUserSalt();
//     const adminSecretSalt = await hashUserSalt();
//     const adminPassword = "adminPassword" + adminTrailingPassword;
//     const adminHashedPassword = await getHashedPassword(adminPassword);

//     // Create an admin user
//     const adminUser = await db
//       .insertInto("og.users")
//       .values({ uName: adminName })
//       .returning("id")
//       .executeTakeFirst();
//     await db
//       .insertInto("og.userDetails")
//       .values({ email: adminEmail, userIdFk: adminUser!.id })
//       .execute();
//     await db
//       .insertInto("og.authStatus")
//       .values({ userIdFk: adminUser!.id, userStatus: 4 })
//       .execute();
//     adminToken = jwt_sign(adminUser!.id, adminName, adminSecretSalt);
//     await db
//       .insertInto("og.auth")
//       .values({
//         emailFk: adminEmail,
//         salt: adminSecretSalt,
//         passwordSalt: adminHashedPassword,
//       })
//       .execute();

//     // Create a regular user
//     const regularUser = await db
//       .insertInto("og.users")
//       .values({ uName: userName })
//       .returning("id")
//       .executeTakeFirst();
//     userId = regularUser!.id;
//     await db
//       .insertInto("og.userDetails")
//       .values({ email: userEmail, userIdFk: regularUser!.id })
//       .execute();
//     await db
//       .insertInto("og.authStatus")
//       .values({ userIdFk: regularUser!.id, userStatus: 0 })
//       .execute();

//     const hashedPassword = await getHashedPassword("password");

//     await db
//       .insertInto("og.auth")
//       .values({
//         emailFk: userEmail,
//         salt: userSecretSalt,
//         passwordSalt: hashedPassword,
//       })
//       .execute();

//     userToken = jwt_sign(regularUser!.id, userName, userSecretSalt);

//     const newHashedPassword = await getHashedPassword("newPassword");

//     const newUser = await db
//       .insertInto("og.users")
//       .values({ uName: testUserName })
//       .returning("id")
//       .executeTakeFirstOrThrow();
//     createdUserId = newUser.id;
//     await db
//       .insertInto("og.userDetails")
//       .values({ email: testUserEmail, userIdFk: newUser.id })
//       .execute();
//     createdUserEmail = testUserEmail;

//     await db
//       .insertInto("og.auth")
//       .values({
//         emailFk: testUserEmail,
//         salt: userSecretSalt,
//         passwordSalt: newHashedPassword,
//       })
//       .execute();

//     newUserToken = jwt_sign(newUser!.id, testUserName, newUserSecretSalt);

//     await upsertTokenByUserRole(
//       adminUser!.id,
//       UserRolesEnum.Admin,
//       adminPassword,
//       adminToken
//     );
//   });

//   describe("GET /api/users/profile", () => {
//     it("should return the user profile", async () => {
//       console.log("*************userId");
//       console.log("userToken");
//       console.log(userToken);
//       console.log(userId);
//       const response = await request(app)
//         .get("/api/users/profile")
//         .set("Authorization", `Bearer ${userToken}`);
//       expect(response.status).toBe(200);
//       expect(response.body).toHaveProperty("uName");
//     });

//     it("should return 200 for access", async () => {
//       const response = await request(app)
//         .get("/api/users/profile")
//         .set("Authorization", `Bearer ${userToken}`);
//       expect(response.status).toBe(200);
//     });
//   });

//   describe("GET /api/users/all", () => {
//     it("should return all users for admin", async () => {
//       const response = await request(app)
//         .get("/api/users/all")
//         .set("Authorization", `Bearer ${adminToken}`);
//       expect(response.status).toBe(200);
//       expect(response.body.length).toBeGreaterThan(0);
//     });

//     it("should return 403 for non-admin access", async () => {
//       const response = await request(app)
//         .get("/api/users/all")
//         .set("Authorization", `Bearer ${userToken}`);
//       expect(response.status).toBe(403);
//     });
//   });

//   describe("DELETE /api/users/:id", () => {
//     it("should delete a user for admin", async () => {
//       const response = await request(app)
//         .delete(`/api/users/${createdUserId}`)
//         .set("Authorization", `Bearer ${adminToken}`);
//       expect(response.status).toBe(200);
//     });

//     it("should return 403 for non-admin access", async () => {
//       const response = await request(app)
//         .delete(`/api/users/${createdUserId}`)
//         .set("Authorization", `Bearer ${userToken}`);
//       expect(response.status).toBe(403);
//     });

//     it("should return 404 for deleting a non-existent user", async () => {
//       const response = await request(app)
//         .delete(`/api/users/9999`)
//         .set("Authorization", `Bearer ${adminToken}`);
//       expect(response.status).toBe(500);
//     });
//   });

//   afterAll(async () => {
//     await db.destroy();
//   });
// });
