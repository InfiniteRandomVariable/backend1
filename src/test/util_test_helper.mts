// src/tests/utils/utils.test.mts
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import { makeid } from "../utils/commonUtil.mts";
dotenv.config(); // Load environment variables from .env file
import {
  jwt_sign,
  upsertTokenByUserRole,
} from "../controllers/user.controller.mjs";
import { db } from "../db/database.mts"; // Adjust path if needed!
import { UserRolesEnum, UserStatus } from "../db/types.mjs"; // Adjust path if needed!
import {
  hashUserPassword,
  hashUserSalt,
} from "../controllers/user.controller.mjs"; // Adjust path if needed!
import request from "supertest";
import { app } from "../../src/server.mts";
import { AuthStatusPayload } from "../db/types.mts";
import { jwt_verify } from "../controllers/user.controller.mts"; /// For verifying JWT tokens
import { ProductStatus, PurchaseOfferStatus } from "../db/types.mjs";
export type UserWithToken = {
  user: TestArbiterUser | TestBuyerUser | TestSellerUser | TestUser;
  token: string;
};
// ... potentially import any other database functions or models you need ...

export interface TestUser {
  userIdFk: number;
  uName: string;
  salt: string;
  role: UserRolesEnum;
  password: string;
}

export interface TestArbiterUser {
  userIdFk: number;
  uName: string;
  salt: string;
  role: UserRolesEnum;
  password: string;
}

export interface TestSellerUser {
  userIdFk: number;
  uName: string;
  salt: string;
  role: UserRolesEnum;
  password: string;
}

export interface TestBuyerUser {
  userIdFk: number;
  uName: string;
  salt: string;
  role: UserRolesEnum;
  password: string;
}

export interface TestPhoneListing {
  id: number;
  userIdFk: number;
  model: number;
  carrier: number;
  condition: number;
  price: number;
  status: ProductStatus;
  currency: string | null;
  coverPhotoUrl: string | null;
  createdDate: Date;
}

export interface TestPurchaseOffer {
  id: number;
  buyerUserIdFk: number;
  phoneIdFk: number;
  offerPrice?: number;
  status: PurchaseOfferStatus | null;
  arbiter1UserIdFk: number | null;
  arbiter2UserIdFk: number | null;
  arbiter3UserIdFk: number | null;
  createdAt: Date;
}

export async function createTestPhoneListing(
  sellerUserId: number
): Promise<TestPhoneListing> {
  // 1. Define listing data - **Customized for og.phones schema!**
  const listingData = {
    userIdFk: sellerUserId, // Use the provided sellerUserId (maps to userIdFk in OgPhones)
    model: 1, // Example model ID (number - you might need to create test models as well)
    carrier: 1, // Example carrier ID (number - you might need to create test carriers as well)
    condition: 1, // Example condition ID (number - you might need to create test conditions as well)
    price: 500, // Example price (number)
    status: ProductStatus.Available, // Set initial status to Available (number - maps to your ProductStatus enum)
    currency: "USD", // Example currency (string or null - if null, use null, else 'USD' or similar)
    coverPhotoUrl: "test-phone-cover.jpg", // Example URL (string or null)
    createdDate: new Date(), // Current timestamp (Timestamp - use new Date())
    // photoNum:  // Generated<number> - OMIT, auto-generated
    // saved:     // Generated<number> - OMIT, auto-generated
    // id:        // Generated<number> - OMIT, auto-generated
    // status:    // number - Already included above
    // userIdFk:  // number - Already included above
    // model:     // number - Already included above
    // carrier:   // number - Already included above
    // condition: // number - Already included above
    // price:     // number - Already included above
  };

  let insertedListingId: number | undefined;
  let createdPhoneListing: TestPhoneListing | undefined;

  try {
    // 2. Insert phone listing into og.phones table (**Table name changed to 'og.phones'**)
    const insertedListingResult = await db
      .insertInto("og.phones") // **Using 'og.phones' table**
      .values(listingData)
      .returning("id")
      .executeTakeFirst();

    if (!insertedListingResult || !insertedListingResult.id) {
      throw new Error("Failed to insert phone listing into og.phones"); // **Error message updated**
    }
    insertedListingId = insertedListingResult.id;

    // 3. Retrieve the created phone listing from the database (**Table name changed to 'og.phones'**)
    createdPhoneListing = await db
      .selectFrom("og.phones") // **Using 'og.phones' table**
      .selectAll()
      .where("id", "=", insertedListingId)
      .executeTakeFirst();

    if (!createdPhoneListing) {
      throw new Error("Failed to retrieve created phone listing from database"); // **Error message updated**
    }
  } catch (error) {
    console.error("Error creating test phone listing:", error);
    throw error; // Re-throw error to fail test setup
  }

  // 4. Return the created phone listing object (or just the ID if you prefer)
  return (createdPhoneListing || { id: insertedListingId }) as TestPhoneListing; // Return fetched listing or minimal object with ID
}

export async function createTestPurchaseOffer(
  buyerUserId: number,
  phoneIdFk: number,
  arbiterUserIds: number[],
  status: PurchaseOfferStatus = PurchaseOfferStatus.Pending // Default status to Pending if not provided
): Promise<TestPurchaseOffer> {
  // 1. Define purchase offer data - **Customize based on your og.purchaseOffer schema!**
  const offerData = {
    buyerUserIdFk: buyerUserId, // Use provided buyerUserId
    phoneIdFk: phoneIdFk, // Use provided phoneIdFk
    status: status, // Use provided status or default to Pending
    arbiter1UserIdFk: arbiterUserIds[0] || null, // Assign first arbiter or null if not available
    arbiter2UserIdFk: arbiterUserIds[1] || null, // Assign second arbiter or null if not available
    arbiter3UserIdFk: arbiterUserIds[2] || null, // Assign third arbiter or null if not available
    createdAt: new Date(), // Set creation timestamp
    // ... Add other required fields for your og.purchaseOffer table here ...
  };

  let insertedOfferId: number | undefined;
  let createdPurchaseOffer: TestPurchaseOffer | undefined;

  try {
    // 2. Insert purchase offer into og.purchaseOffer table
    const insertedOfferResult = await db
      .insertInto("og.purchaseOffers")
      .values(offerData)
      .returning("id")
      .executeTakeFirst();

    if (!insertedOfferResult || !insertedOfferResult.id) {
      throw new Error("Failed to insert purchase offer into og.purchaseOffer");
    }
    insertedOfferId = insertedOfferResult.id;

    // 3. Retrieve the created purchase offer from the database (optional, but good for verification)
    createdPurchaseOffer = await db
      .selectFrom("og.purchaseOffers")
      .selectAll()
      .where("id", "=", insertedOfferId)
      .executeTakeFirst();

    if (!createdPurchaseOffer) {
      throw new Error(
        "Failed to retrieve created purchase offer from database"
      );
    }
  } catch (error) {
    console.error("Error creating test purchase offer:", error);
    throw error; // Re-throw error to fail test setup
  }

  // 4. Return the created purchase offer object (or just the ID if you prefer)
  return (createdPurchaseOffer || { id: insertedOfferId }) as TestPurchaseOffer; // Return fetched offer or minimal object with ID
}
export const adminSetUserAuthStatus = async (
  userId: number,
  authPayload: AuthStatusPayload
) => {
  const response = await request(app)
    .put(`/api/admin/users/${userId}/auth-status`)
    .send(authPayload);
  return response.body;
};

export const setupUserAndRole = async (
  roleToSet: UserRolesEnum,
  userRoleForLogin: UserRolesEnum
) => {
  try {
    //     app.use("/api/users", usersRouter); // Use users router
    // app.use("/api/phones", phonesRouter);
    // app.use("/api/listings", listingsRouter);
    // app.use("/api/arbiter", arbiterRouter);
    // app.use("/api/trades", tradeRouter);
    const userName = makeid(6);
    const userEmail = `${userName}@email.com`;

    const userData = {
      uName: userName,
      email: userEmail,
      password: "TestPassword123!",
    };

    const registerResponse = await request(app)
      .post("/api/users/register")
      .send(userData);

    //   expect(registerResponse.body).toBeDefined();
    //   expect(registerResponse.body.token).toBeDefined();
    const registrationToken = registerResponse.body.token;

    const decodedRegistrationToken = await jwt_verify(registrationToken);

    const userId = decodedRegistrationToken.id;
    if (!userId) {
      throw Error("UserId must not be null 50");
    }
    if (roleToSet === UserRolesEnum.Seller) {
      await adminSetUserAuthStatus(userId, { isSeller: true });
    } else if (roleToSet === UserRolesEnum.Arbiter) {
      await adminSetUserAuthStatus(userId, { isArbiter: true });
    } else if (roleToSet === UserRolesEnum.Staff) {
      // {{ edit_1 }}
      await adminSetUserAuthStatus(userId, { isStaffAdmin: true }); // {{ edit_1 }}
    } else if (roleToSet === UserRolesEnum.Admin) {
      await adminSetUserAuthStatus(userId, { isStaffAdmin: true }); // {{ edit_1 }}
    }
    // If roleToSet is null, or any other value, no role will be explicitly set via admin API, user remains default buyer role

    const loginResponse = await request(app).post("/api/users/login").send({
      email: userData.email,
      password: userData.password,
      userRole: userRoleForLogin,
    }); // Use the provided userRoleForLogin

    // expect(loginResponse.body).toBeDefined();
    // expect(loginResponse.body.token).toBeDefined();
    const authToken = loginResponse.body.token as string;

    return { authToken, userData, userId }; // Return both authToken and userData
  } catch (error) {
    console.error("error 80", error);
    throw error;
  }
};
// export async function createTestSellerUser(): Promise<TestSellerUser> {
//   // 1. Generate Unique User Data
//   const uniqueSuffix = makeid(13);
//   const userName = `${uniqueSuffix}`.slice(-7);
//   const email = `${uniqueSuffix}@ex.com`.slice(-30);
//   const password = "TestPassword123!".slice(-6);
//   const userRole = UserRolesEnum.Seller;

//   // 2. Generate salt and hashed password
//   const hashedSalt = await hashUserSalt();
//   const hashedPassword = await hashUserPassword(password);

//   let insertedUserId: number | undefined;
//   let createdUserAuthData: any | undefined;

//   try {
//     // 3. Insert user into og.users table
//     const insertedUserResult = await db
//       .insertInto("og.users")
//       .values({ uName: userName })
//       .returning("id")
//       .executeTakeFirst();

//     if (!insertedUserResult || !insertedUserResult.id) {
//       throw new Error("Failed to insert user into og.users");
//     }
//     insertedUserId = insertedUserResult.id;

//     // 4. Insert user details into og.userDetails
//     await db
//       .insertInto("og.userDetails")
//       .values({ userIdFk: insertedUserId, email: email })
//       .execute();

//     // 5. Insert auth details into og.auth
//     await db
//       .insertInto("og.auth")
//       .values({
//         emailFk: email,
//         salt: hashedSalt,
//         passwordSalt: hashedPassword,
//       })
//       .execute();

//     await db
//       .insertInto("og.authStatus")
//       .values({
//         userIdFk: insertedUserId,
//         isSeller: true, // Set isSeller to true for seller user
//         isArbiter: null,
//         isStaffAdmin: null,
//         verifiedEmail: null, // Set verification statuses to null (or false if null is not allowed and false is default)
//         verifiedPhone: null,
//         verifiedUserId: null,
//         userStatus: null, // Set userStatus to null or a default status if you have one
//       })
//       .execute();

//     // 6. Retrieve the created user auth data (including salt)
//     createdUserAuthData = await db
//       .selectFrom("og.auth")
//       .innerJoin("og.userDetails", "og.auth.emailFk", "og.userDetails.email")
//       .innerJoin("og.users", "og.userDetails.userIdFk", "og.users.id")
//       .where("og.userDetails.userIdFk", "=", insertedUserId)
//       .select([
//         "og.userDetails.userIdFk as userIdFk",
//         "og.users.uName as uName",
//         "og.auth.salt as salt",
//       ])
//       .executeTakeFirst();

//     if (!createdUserAuthData) {
//       throw new Error("Failed to retrieve created user auth data");
//     }
//   } catch (error) {
//     console.error("Error creating test seller user:", error);
//     // Consider adding rollback logic here if needed for your database transactions
//     throw error; // Re-throw the error to fail the test setup
//   }

//   // 7. Construct and return the test user object
//   const testSellerUser: TestSellerUser = {
//     userIdFk: createdUserAuthData.userIdFk,
//     uName: createdUserAuthData.uName,
//     salt: createdUserAuthData.salt,
//     role: UserRolesEnum.Seller,
//     password: password,
//   };

//   return testSellerUser;
// }

// export async function createTestBuyerUser(): Promise<TestBuyerUser> {
//   // 1. Generate Unique User Data
//   const uniqueSuffix = makeid(13);

//   const userName = `bu${uniqueSuffix}`.slice(-10);
//   const email = `bu${uniqueSuffix}@exale.com`.slice(-30);
//   const password = "TestPassword123!".slice(-10);
//   //const userRole = UserRolesEnum.BuyerSeller; // Or Buyer Role

//   // 2. Generate salt and hashed password
//   const hashedSalt = await hashUserSalt();
//   const hashedPassword = await hashUserPassword(password);

//   let insertedUserId: number | undefined;
//   let createdUserAuthData: any | undefined;

//   try {
//     // 3. Insert user into og.users table
//     const insertedUserResult = await db
//       .insertInto("og.users")
//       .values({ uName: userName })
//       .returning("id")
//       .executeTakeFirst();

//     if (!insertedUserResult || !insertedUserResult.id) {
//       throw new Error("Failed to insert user into og.users");
//     }
//     insertedUserId = insertedUserResult.id;

//     // 4. Insert user details into og.userDetails
//     console.log("############email");
//     console.log(email);
//     await db
//       .insertInto("og.userDetails")
//       .values({ userIdFk: insertedUserId, email: email })
//       .execute();

//     // 5. Insert auth details into og.auth
//     await db
//       .insertInto("og.auth")
//       .values({
//         emailFk: email,
//         salt: hashedSalt,
//         passwordSalt: hashedPassword,
//       })
//       .execute();
//     await db
//       .insertInto("og.authStatus")
//       .values({
//         userIdFk: insertedUserId,
//         isSeller: false, // Set isSeller to true for seller user
//         isArbiter: null,
//         isStaffAdmin: null,
//         verifiedEmail: null, // Set verification statuses to null (or false if null is not allowed and false is default)
//         verifiedPhone: null,
//         verifiedUserId: null,
//         userStatus: null, // Set userStatus to null or a default status if you have one
//       })
//       .execute();
//     // 6. Retrieve the created user auth data (including salt)
//     createdUserAuthData = await db
//       .selectFrom("og.auth")
//       .innerJoin("og.userDetails", "og.auth.emailFk", "og.userDetails.email")
//       .innerJoin("og.users", "og.userDetails.userIdFk", "og.users.id")
//       .where("og.userDetails.userIdFk", "=", insertedUserId)
//       .select([
//         "og.userDetails.userIdFk as userIdFk",
//         "og.users.uName as uName",
//         "og.auth.salt as salt",
//       ])
//       .executeTakeFirst();

//     if (!createdUserAuthData) {
//       throw new Error("Failed to retrieve created user auth data");
//     }
//   } catch (error) {
//     console.error("Error creating test buyer user:", error);
//     // Consider adding rollback logic here if needed for your database transactions
//     throw error; // Re-throw the error to fail the test setup
//   }

//   // 7. Construct and return the test user object
//   const testBuyerUser: TestBuyerUser = {
//     userIdFk: createdUserAuthData.userIdFk,
//     uName: createdUserAuthData.uName,
//     salt: createdUserAuthData.salt,
//     role: UserRolesEnum.Buyer,
//     password: password,
//   };

//   // const userSecretSalt = await hashUserSalt();
//   // const newUserSecretSalt = await hashUserSalt();
//   // const adminSecretSalt = await hashUserSalt();
//   // const adminPassword = "adminPassword" + adminTrailingPassword;
//   // const adminHashedPassword = await getHashedPassword(adminPassword);

//   return testBuyerUser;
// }

export async function createTestUsers(
  count: number,
  userRole: UserRolesEnum
): Promise<UserWithToken[]> {
  const users: UserWithToken[] = [];
  for (let i = 0; i < count; i++) {
    // 1. Generate Unique User Data for each arbiter
    const uniqueSuffix = makeid(13);
    const userName = `${uniqueSuffix}`.slice(-10);
    const email = `${uniqueSuffix}@exam.com`.slice(-30);
    const password = "TestPassword123!";

    // 2. Generate salt and hashed password
    const hashedSalt = await hashUserSalt();
    const hashedPassword = await hashUserPassword(password);

    let insertedUserId: number | undefined;
    let createdUserAuthData: any | undefined;

    try {
      // 3. Insert user into og.users table
      const insertedUserResult = await db
        .insertInto("og.users")
        .values({ uName: userName })
        .returning("id")
        .executeTakeFirst();

      if (!insertedUserResult || !insertedUserResult.id) {
        throw new Error("Failed to insert arbiter user into og.users");
      }
      insertedUserId = insertedUserResult.id;

      // 4. Insert user details into og.userDetails
      await db
        .insertInto("og.userDetails")
        .values({ userIdFk: insertedUserId, email: email })
        .execute();

      // 5. Insert auth details into og.auth
      await db
        .insertInto("og.auth")
        .values({
          emailFk: email,
          salt: hashedSalt,
          passwordSalt: hashedPassword,
        })
        .execute();
      let isSeller = false;

      let isArbiter = false;
      switch (userRole) {
        case UserRolesEnum.Admin: {
          isArbiter = true;
        }
        case UserRolesEnum.Seller: {
          isSeller = true;
        }
      }
      await db
        .insertInto("og.authStatus")
        .values({
          userIdFk: insertedUserId,
          isSeller: isSeller, // Set isSeller to true for seller user
          isArbiter: isArbiter,
          isStaffAdmin: null,
          verifiedEmail: null, // Set verification statuses to null (or false if null is not allowed and false is default)
          verifiedPhone: null,
          verifiedUserId: null,
          userStatus: UserStatus.Normal, // Set userStatus to null or a default status if you have one
        })
        .execute();

      // 6. Retrieve the created user auth data (including salt)
      createdUserAuthData = await db
        .selectFrom("og.auth")
        .innerJoin("og.userDetails", "og.auth.emailFk", "og.userDetails.email")
        .innerJoin("og.users", "og.userDetails.userIdFk", "og.users.id")
        .where("og.userDetails.userIdFk", "=", insertedUserId)
        .select([
          "og.userDetails.userIdFk as userIdFk",
          "og.users.uName as uName",
          "og.auth.salt as salt",
        ])
        .executeTakeFirst();

      if (!createdUserAuthData) {
        throw new Error(
          `Failed to retrieve created ${userRole} user auth data`
        );
      }
    } catch (error) {
      console.error(`Error creating test arbiter user ${i + 1}:`, error);
      // Consider adding rollback logic here if needed for your database transactions
      throw error; // Re-throw the error to fail the test setup
    }

    // 7. Construct and add the test arbiter user object to the array
    const testUser: TestUser = {
      userIdFk: createdUserAuthData.userIdFk,
      uName: createdUserAuthData.uName,
      salt: createdUserAuthData.salt,
      role: userRole,
      password: password,
    };
    const token = await generateAuthTokenProcedure(testUser);
    users.push({ user: testUser, token: token });
  }

  return users;
}

/**
 * Helper function to generate a JWT token for testing purposes, mirroring jwt_sign from backend.
 *
 * @param {object} user - User object. Must have: userIdFk (id), uName (userName), and salt (userSecretSalt).
 * @returns {string} JWT token
 */
export async function generateAuthTokenProcedure(
  user: TestArbiterUser | TestSellerUser | TestBuyerUser
): Promise<string> {
  const _token = jwt_sign(user.userIdFk, user.uName, user.salt);
  await upsertTokenByUserRole(user.userIdFk, user.role, user.password, _token);

  return _token;
}

// export async function cleanupTestData() {
//   console.log("cleanupTestData() - STARTING TEST DATA CLEANUP");
//   console.warn(
//     "cleanupTestData() - WARNING: This function will DELETE ALL DATA from og.purchaseOffers, og.phones, og.auth, og.userDetails, and og.users tables in your TEST DATABASE.\n" +
//       "Ensure you are running tests against a DEDICATED TEST DATABASE and NOT a production or development database.\n" +
//       "Data loss can occur if used incorrectly. Proceed with CAUTION."
//   );

//   try {
//     // Delete from og.purchaseOffers table
//     console.log("cleanupTestData() - Deleting from og.purchaseOffers...");
//     await db.deleteFrom("og.purchaseOffers").execute();
//     console.log("cleanupTestData() - Deleted from og.purchaseOffers.");

//     // Delete from og.phones table
//     console.log("cleanupTestData() - Deleting from og.phones...");
//     await db.deleteFrom("og.phones").execute();
//     console.log("cleanupTestData() - Deleted from og.phones.");

//     // Delete from og.auth table
//     console.log("cleanupTestData() - Deleting from og.auth...");
//     await db.deleteFrom("og.auth").execute();
//     console.log("cleanupTestData() - Deleted from og.auth.");

//     // Delete from og.userDetails table
//     console.log("cleanupTestData() - Deleting from og.userDetails...");
//     await db.deleteFrom("og.userDetails").execute();
//     console.log("cleanupTestData() - Deleted from og.userDetails.");

//     // Delete from og.users table (delete users last, as other tables might have FK to it)
//     console.log("cleanupTestData() - Deleting from og.users...");
//     await db.deleteFrom("og.users").execute();
//     console.log("cleanupTestData() - Deleted from og.users.");

//     console.log("cleanupTestData() - Deleting from og.authStatus...");
//     await db.deleteFrom("og.authStatus").execute();
//     console.log("cleanupTestData() - Deleted from og.authStatus");

//     console.log("cleanupTestData() - Deleting from og.token...");
//     await db.deleteFrom("og.token").execute();
//     console.log("cleanupTestData() - Deleted from og.token");

//     console.log("cleanupTestData() - TEST DATA CLEANUP COMPLETED.");
//   } catch (error) {
//     console.error("cleanupTestData() - ERROR during test data cleanup:", error);
//     console.error(
//       "cleanupTestData() - WARNING: Test data cleanup may have failed. Database might not be in a clean state."
//     );
//   }
// }
const shouldDeleteData = false;
export async function cleanupTestData() {
  if (shouldDeleteData === false) {
    return Promise.resolve();
  }
  console.log("cleanupTestData() - STARTING TEST DATA CLEANUP");
  console.warn(
    "cleanupTestData() - WARNING: This function will DELETE ALL DATA from og.purchaseOffers, og.phones, og.auth, og.userDetails, and og.users tables in your TEST DATABASE.\n" +
      "Ensure you are running tests against a DEDICATED TEST DATABASE and NOT a production or development database.\n" +
      "Data loss can occur if used incorrectly. Proceed with CAUTION."
  );

  try {
    const tablesToDelete = [
      // {{ edit_1 }}
      "og.token", // {{ edit_1 }}
      "og.authStatus", // {{ edit_1 }}
      "og.purchaseOffers", // {{ edit_1 }}
      "og.phones", // {{ edit_1 }}
      "og.auth", // {{ edit_1 }}
      "og.userDetails", // {{ edit_1 }}
      "og.users", // {{ edit_1 }}
    ]; // {{ edit_1 }}

    await Promise.all(
      // {{ edit_2 }}
      tablesToDelete.map(async (tableName) => {
        // {{ edit_2 }}
        console.log(`cleanupTestData() - Deleting from ${tableName}...`); // {{ edit_2 }}
        await db.deleteFrom(tableName as any).execute(); // {{ edit_2 }}
        console.log(`cleanupTestData() - Deleted from ${tableName}.`); // {{ edit_2 }}
      }) // {{ edit_2 }}
    ); // {{ edit_2 }}

    console.log("cleanupTestData() - TEST DATA CLEANUP COMPLETED.");
  } catch (error) {
    console.error("cleanupTestData() - ERROR during test data cleanup:", error);
    console.error(
      "cleanupTestData() - WARNING: Test data cleanup may have failed. Database might not be in a clean state."
    );
  }
}
export async function cleanupTestData2() {
  console.log("cleanupTestData() - STARTING TEST DATA CLEANUP - ALL TABLES"); // {{ edit_1 }}
  console.warn(
    "cleanupTestData() - WARNING: This function will DELETE ALL DATA from ALL TABLES in your TEST DATABASE.\n" + // {{ edit_2 }}
      "Ensure you are running tests against a DEDICATED TEST DATABASE and NOT a production or development database.\n" +
      "Data loss can occur if used incorrectly. Proceed with EXTREME CAUTION." // {{ edit_3 }}
  );

  try {
    // 1. Fetch all table names from the database schema
    const tableNamesResult = await db.introspection.getTables(); // {{ edit_4 }}
    const tablesToDelete = tableNamesResult.map((tableInfo) => tableInfo.name); // {{ edit_5 }}

    if (tablesToDelete.length === 0) {
      // {{ edit_6 }}
      console.log("cleanupTestData() - No tables found in the database."); // {{ edit_6 }}
      return; // {{ edit_6 }}
    } // {{ edit_6 }}

    console.log(
      "cleanupTestData() - Tables to delete:",
      tablesToDelete.join(", ") // {{ edit_7 }}
    ); // {{ edit_7 }}

    // 2. Delete data from all tables
    await Promise.all(
      tablesToDelete.map(async (tableName) => {
        console.log(`cleanupTestData() - Deleting from ${tableName}...`);
        await db.deleteFrom(tableName as any).execute();
        console.log(`cleanupTestData() - Deleted from ${tableName}.`);
      })
    );

    console.log(
      "cleanupTestData() - TEST DATA CLEANUP COMPLETED - ALL TABLES."
    ); // {{ edit_8 }}
  } catch (error) {
    console.error("cleanupTestData() - ERROR during test data cleanup:", error);
    console.error(
      "cleanupTestData() - WARNING: Test data cleanup may have failed. Database might not be in a clean state."
    );
  }
}

export async function fetchPurchaseOfferFromDB(
  purchaseOfferId: number
): Promise<TestPurchaseOffer> {
  // Return type added
  let purchaseOfferFromDb: TestPurchaseOffer | undefined; // Type updated

  try {
    purchaseOfferFromDb = (await db
      .selectFrom("og.purchaseOffers")
      .selectAll()
      .where("id", "=", purchaseOfferId)
      .executeTakeFirst()) as TestPurchaseOffer; // Type assertion added

    if (!purchaseOfferFromDb) {
      throw new Error(
        `Purchase Offer with ID ${purchaseOfferId} not found in database`
      );
    }
  } catch (error) {
    console.error(
      `Error fetching purchase offer with ID ${purchaseOfferId} from database:`,
      error
    );
    throw error; // Re-throw error to indicate failure to fetch
  }
  if (purchaseOfferFromDb && purchaseOfferFromDb.createdAt) {
    purchaseOfferFromDb.createdAt = new Date(purchaseOfferFromDb.createdAt); // Ensure Date type
  }

  return purchaseOfferFromDb as TestPurchaseOffer; // Return object with interface type
}

export async function fetchPhoneListingFromDB(
  phoneListingId: number
): Promise<TestPhoneListing> {
  // Return type added
  let phoneListingFromDb: TestPhoneListing | undefined; // Type updated

  try {
    phoneListingFromDb = (await db
      .selectFrom("og.phones")
      .selectAll()
      .where("id", "=", phoneListingId)
      .executeTakeFirst()) as TestPhoneListing; // Type assertion added

    if (!phoneListingFromDb) {
      throw new Error(
        `Phone Listing with ID ${phoneListingId} not found in database`
      );
    }
  } catch (error) {
    console.error(
      `Error fetching phone listing with ID ${phoneListingId} from database:`,
      error
    );
    throw error; // Re-throw error to indicate failure to fetch
  }
  if (phoneListingFromDb && phoneListingFromDb.createdDate) {
    phoneListingFromDb.createdDate = new Date(phoneListingFromDb.createdDate); // Ensure Date type
  }

  return phoneListingFromDb as TestPhoneListing; // Return object with interface type
}
