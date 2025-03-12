// src/tests/utils.e2e.test.mts

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
} from "vitest";
import request from "supertest";
import {
  createTestUsers,
  createTestPhoneListing,
  createTestPurchaseOffer,
  generateAuthTokenProcedure,
  cleanupTestData,
  TestSellerUser,
  TestBuyerUser,
  TestArbiterUser,
} from "../util_test_helper.mts"; // Import utility functions from utils.test.mts
import { db } from "../../db/database.mts"; // Import your database instance
import { setupUserAndRole } from "../utils.test.mts";
import { app } from "../../server.mts";
import {
  UserRolesEnum,
  ProductStatus,
  PurchaseOfferStatus,
} from "../../db/types.mjs"; // Import enums
import { jwt_verify } from "../../controllers/user.controller.mts"; /// For verifying JWT tokens
const shouldDeleteDB = false;
describe("Utils Test: Test User and Listing Creation Helpers", () => {
  let sellerAuthToken;
  let sellerUserData;
  let createdListingId;

  beforeEach(async () => {
    await cleanupTestData();

    // **Setup Seller User using setupUserAndRole**
    const userSetupResult = await setupUserAndRole(
      UserRolesEnum.Seller,
      UserRolesEnum.Seller
    );
    sellerAuthToken = userSetupResult.authToken;
    sellerUserData = userSetupResult.userData;

    // **Create a listing to be used in subsequent tests (view, update, delete)**
    const listingPayload = {
      userIdFk: 1, // Placeholder - backend should override from token
      model: 123,
      price: 550,
      status: 1,
      currency: "USD",
      battery: 90,
      bluetooth: 5,
      body: 7,
      buttons: 1,
      cam: 3,
      charger: true,
      color: "Space Gray",
      condition: "Used - Good",
      cord: false,
      damage: "Minor scratches on screen",
      frontCam: 2,
      photoUrls: [],
      replacements: "None",
      screen: 8,
      shphoneFrom31662: "US",
      storage: 128,
      wifi: 6,
    };

    const listingResponse = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${sellerAuthToken}`)
      .send(listingPayload)
      .expect(201);

    createdListingId = listingResponse.body.id; // Store the created listing ID
  });

  afterEach(cleanupTestData);

  afterAll(async () => {
    if (shouldDeleteDB) {
      await cleanupTestData(); // Call cleanupTestData after all tests in this file
    }
  });

  describe("Seller View Listings Flow", () => {
    it("should get a list of own listings for a seller", async () => {
      const response = await request(app)
        .get("/api/listings/me") // **Replace with your "get own listings" endpoint**
        .set("Authorization", `Bearer ${sellerAuthToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.some((listing) => listing.id === createdListingId)
      ).toBe(true); // Check if the listing we created is in the list
      // You can add more assertions to validate the structure and content of the listings in the response
    });

    it("should return an empty array if a seller has no listings", async () => {
      // Register a *new* seller user (not the one from beforeEach)
      const newUserSetupResult = await setupUserAndRole(
        "seller",
        "BuyerSeller"
      );
      const newSellerAuthToken = newUserSetupResult.authToken;

      const response = await request(app)
        .get("/api/listings/me") // **"get own listings" endpoint**
        .set("Authorization", `Bearer ${newSellerAuthToken}`) // Use token for the *new* seller
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0); // Expect empty array
    });

    it("should return 401 Unauthorized if trying to get own listings without authentication", async () => {
      await request(app)
        .get("/api/listings/me") // **"get own listings" endpoint**
        .expect(401); // Expect 401 Unauthorized
    });
  });

  describe("Seller Update Listing Flow", () => {
    it("should update an existing listing successfully as a seller", async () => {
      const updatedListingPayload = {
        price: 600, // Just update the price as an example
        condition: "Used - Excellent", // Update condition too
        // You can update other fields as needed for your test
      };

      const response = await request(app)
        .put(`/api/listings/${createdListingId}`) // **Replace with your "update listing" endpoint (with listingId param)**
        .set("Authorization", `Bearer ${sellerAuthToken}`)
        .send(updatedListingPayload)
        .expect(200); // Or 200 OK, or 204 No Content, depending on your API

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(createdListingId); // Verify it's the same listing ID that was updated
      expect(response.body.price).toBe(updatedListingPayload.price); // Verify price is updated
      expect(response.body.condition).toBe(updatedListingPayload.condition); // Verify condition is updated
      // You can add more assertions to verify other updated fields
    });

    it("should return 404 Not Found if trying to update a non-existent listing", async () => {
      const nonExistentListingId = 99999; // Assume this ID does not exist
      const updatedListingPayload = { price: 600 };

      await request(app)
        .put(`/api/listings/${nonExistentListingId}`) // **"update listing" endpoint**
        .set("Authorization", `Bearer ${sellerAuthToken}`)
        .send(updatedListingPayload)
        .expect(404); // Expect 404 Not Found
    });

    it("should return 403 Forbidden if trying to update a listing belonging to another seller (if you implement this authorization)", async () => {
      // Create another seller user
      const anotherSellerSetupResult = await setupUserAndRole(
        "seller",
        "BuyerSeller"
      );
      const anotherSellerAuthToken = anotherSellerSetupResult.authToken;

      const updatedListingPayload = { price: 600 };

      await request(app)
        .put(`/api/listings/${createdListingId}`) // **"update listing" endpoint**
        .set("Authorization", `Bearer ${anotherSellerAuthToken}`) // Use *another* seller's token
        .send(updatedListingPayload)
        .expect(403); // Expect 403 Forbidden - if you have authorization checks in place
    });

    it("should return 401 Unauthorized if trying to update listing without authentication", async () => {
      const updatedListingPayload = { price: 600 };

      await request(app)
        .put(`/api/listings/${createdListingId}`) // **"update listing" endpoint**
        .send(updatedListingPayload)
        .expect(401); // Expect 401 Unauthorized
    });

    it("should return 400 Bad Request for listing update with invalid data (e.g., negative price)", async () => {
      const invalidUpdatePayload = { price: -100 }; // Negative price is invalid

      const response = await request(app)
        .put(`/api/listings/${createdListingId}`) // **"update listing" endpoint**
        .set("Authorization", `Bearer ${sellerAuthToken}`)
        .send(invalidUpdatePayload)
        .expect(400); // Expect 400 Bad Request

      expect(response.body).toBeDefined();
      expect(response.body.message).toContain("price"); // Assert error message relates to 'price' validation
      // You might assert specific validation error details if your API returns them
    });
  });

  describe("Seller Delete Listing Flow", () => {
    it("should delete an existing listing successfully as a seller", async () => {
      const response = await request(app)
        .delete(`/api/listings/${createdListingId}`) // **Replace with your "delete listing" endpoint (with listingId param)**
        .set("Authorization", `Bearer ${sellerAuthToken}`)
        .expect(204); // Expect 204 No Content for successful deletion

      expect(response.body).toEqual({}); // 204 No Content typically has empty body

      // **Verify listing is actually deleted (try to get it again - should 404)**
      await request(app)
        .get(`/api/listings/${createdListingId}`) // Attempt to get the deleted listing
        .set("Authorization", `Bearer ${sellerAuthToken}`)
        .expect(404); // Expect 404 Not Found after deletion
    });

    it("should return 404 Not Found if trying to delete a non-existent listing", async () => {
      const nonExistentListingId = 88888; // Assume this ID does not exist

      await request(app)
        .delete(`/api/listings/${nonExistentListingId}`) // **"delete listing" endpoint**
        .set("Authorization", `Bearer ${sellerAuthToken}`)
        .expect(404); // Expect 404 Not Found
    });

    it("should return 403 Forbidden if trying to delete a listing belonging to another seller (if you implement this authorization)", async () => {
      // Create another seller user
      const anotherSellerSetupResult = await setupUserAndRole(
        "seller",
        "BuyerSeller"
      );
      const anotherSellerAuthToken = anotherSellerSetupResult.authToken;

      await request(app)
        .delete(`/api/listings/${createdListingId}`) // **"delete listing" endpoint**
        .set("Authorization", `Bearer ${anotherSellerAuthToken}`) // Use *another* seller's token
        .expect(403); // Expect 403 Forbidden - if authorization checks are in place
    });

    it("should return 401 Unauthorized if trying to delete listing without authentication", async () => {
      await request(app)
        .delete(`/api/listings/${createdListingId}`) // **"delete listing" endpoint**
        .expect(401); // Expect 401 Unauthorized
    });
  });

  describe("Listing Retrieval Flow (Individual Listing)", () => {
    // Optional - if you have an endpoint to get a single listing by ID for sellers
    it("should get a specific listing by ID for a seller (if endpoint exists)", async () => {
      const response = await request(app)
        .get(`/api/listings/${createdListingId}`) // **Replace with your "get listing by ID" endpoint**
        .set("Authorization", `Bearer ${sellerAuthToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(createdListingId); // Verify it's the same listing
      // ... (Add assertions to validate the listing details in the response) ...
    });

    it("should return 404 Not Found if trying to get a non-existent listing by ID (if endpoint exists)", async () => {
      const nonExistentListingId = 77777;

      await request(app)
        .get(`/api/listings/${nonExistentListingId}`) // **"get listing by ID" endpoint**
        .set("Authorization", `Bearer ${sellerAuthToken}`)
        .expect(404); // Expect 404 Not Found
    });

    it("should return 401 Unauthorized if trying to get listing by ID without authentication (if endpoint exists)", async () => {
      await request(app)
        .get(`/api/listings/${createdListingId}`) // **"get listing by ID" endpoint**
        .expect(401); // Expect 401 Unauthorized
    });
  });

  it("should create a test seller user", async () => {
    const users = await createTestUsers(1, UserRolesEnum.Seller);
    const sellerUser = users[0].user as TestSellerUser;
    expect(sellerUser).toBeDefined();
    expect(sellerUser.userIdFk).toBeTypeOf("number");
    expect(sellerUser.uName).toBeTypeOf("string");
    expect(sellerUser.salt).toBeTypeOf("string");
    expect(sellerUser.role).toEqual(UserRolesEnum.Seller);

    // Verify user exists in database (og.users)
    const userInDb = await db
      .selectFrom("og.users")
      .select("id")
      .where("id", "=", sellerUser.userIdFk)
      .executeTakeFirst();
    expect(userInDb).toBeDefined();
    expect(userInDb?.id).toEqual(sellerUser.userIdFk);

    // Verify user exists in database (og.userDetails - optional, depending on your needs)
    // ... add database verification for og.userDetails and og.auth if needed ...
  });

  it("should create a test buyer user", async () => {
    const users = await createTestUsers(1, UserRolesEnum.Buyer);
    const buyerUser = users[0].user as TestBuyerUser;
    expect(buyerUser).toBeDefined();
    expect(buyerUser.userIdFk).toBeTypeOf("number");
    expect(buyerUser.uName).toBeTypeOf("string");
    expect(buyerUser.salt).toBeTypeOf("string");
    expect(buyerUser.role).toEqual(UserRolesEnum.Buyer); // Or Buyer Role

    // Verify user exists in database (og.users)
    const userInDb = await db
      .selectFrom("og.users")
      .select("id")
      .where("id", "=", buyerUser.userIdFk)
      .executeTakeFirst();
    expect(userInDb).toBeDefined();
    expect(userInDb?.id).toEqual(buyerUser.userIdFk);

    // ... add database verification for og.userDetails and og.auth if needed ...
  });

  it("should create arbiter users", async () => {
    const arbiterUsersWithToken = await createTestUsers(
      3,
      UserRolesEnum.Arbiter
    );
    const arbiterUsers = arbiterUsersWithToken.map(
      (u) => u.user
    ) as TestArbiterUser[];
    expect(arbiterUsers).toBeDefined();
    expect(arbiterUsers).toHaveLength(3);
    arbiterUsers.forEach((arbiterUser) => {
      expect(arbiterUser).toBeDefined();
      expect(arbiterUser.userIdFk).toBeTypeOf("number");
      expect(arbiterUser.uName).toBeTypeOf("string");
      expect(arbiterUser.salt).toBeTypeOf("string");
      expect(arbiterUser.role).toEqual(UserRolesEnum.Arbiter);

      // Verify each arbiter user exists in database (og.users)
      // ... add database verification for each arbiter user if needed ...
    });
  });

  it("should create a test phone listing", async () => {
    const users = await createTestUsers(1, UserRolesEnum.Seller);
    const sellerUser = users[0].user as TestSellerUser;
    const phoneListing = await createTestPhoneListing(sellerUser.userIdFk);
    expect(phoneListing).toBeDefined();
    expect(phoneListing.id).toBeTypeOf("number");
    // ... add assertions to check other properties of phoneListing if needed ...

    // Verify listing exists in database (og.phones)
    const listingInDb = await db
      .selectFrom("og.phones")
      .select("id")
      .where("id", "=", phoneListing.id)
      .executeTakeFirst();
    expect(listingInDb).toBeDefined();
    expect(listingInDb?.id).toEqual(phoneListing.id);
  });

  it("should create a test purchase offer", async () => {
    const buyerUsers = await createTestUsers(1, UserRolesEnum.Buyer);
    const buyerUser = buyerUsers[0].user as TestBuyerUser;
    const sellerUsers = await createTestUsers(1, UserRolesEnum.Seller);
    const sellerUser = sellerUsers[0].user as TestSellerUser;
    const phoneListing = await createTestPhoneListing(sellerUser.userIdFk);
    const arbiterUsersWithToken = await createTestUsers(
      3,
      UserRolesEnum.Arbiter
    );
    const arbiterUsers = arbiterUsersWithToken.map(
      (u) => u.user
    ) as TestArbiterUser[];
    const purchaseOffer = await createTestPurchaseOffer(
      buyerUser.userIdFk,
      phoneListing.id,
      arbiterUsers.map((u) => u.userIdFk)
    );

    expect(purchaseOffer).toBeDefined();
    expect(purchaseOffer.id).toBeTypeOf("number");
    // ... add assertions to check other properties of purchaseOffer if needed ...

    // Verify offer exists in database (og.purchaseOffers)
    const offerInDb = await db
      .selectFrom("og.purchaseOffers")
      .select("id")
      .where("id", "=", purchaseOffer.id)
      .executeTakeFirst();
    expect(offerInDb).toBeDefined();
    expect(offerInDb?.id).toEqual(purchaseOffer.id);
  });

  it("should generate auth token", async () => {
    const users = await createTestUsers(1, UserRolesEnum.Buyer);
    const testUser = users[0].user;
    const token = users[0].token;

    expect(token).toBeTypeOf("string");
    expect(token.length).toBeGreaterThan(0);

    // Optional: Verify JWT payload (decode and check claims)

    const decodedToken = (await jwt_verify(token)) as any; // Use your JWT secret and type
    expect(decodedToken).toBeDefined();
    expect(decodedToken.id).toBeDefined();
    expect(decodedToken.id).toEqual(testUser.userIdFk);
    expect(decodedToken.userName).toEqual(testUser.uName);
    expect(decodedToken.salt).toEqual(testUser.salt);
  });

  it("should cleanup test data successfully", async () => {
    // 1. Setup: Create some test data to be cleaned up
    const sellerUsers = await createTestUsers(1, UserRolesEnum.Seller);
    const sellerUser = sellerUsers[0];
    const phoneListing = await createTestPhoneListing(sellerUser.user.userIdFk);
    const purchaseOffer = await createTestPurchaseOffer(
      sellerUser.user.userIdFk,
      phoneListing.id,
      []
    ); // No arbiters needed for this test

    // 2. Verify data exists in database BEFORE cleanup (pre-condition)
    let userCountBefore = await db
      .selectFrom("og.users")
      .select(db.fn.countAll().as("count"))
      .executeTakeFirst();
    let phoneCountBefore = await db
      .selectFrom("og.phones")
      .select(db.fn.countAll().as("count"))
      .executeTakeFirst();
    let offerCountBefore = await db
      .selectFrom("og.purchaseOffers")
      .select(db.fn.countAll().as("count"))
      .executeTakeFirst();

    expect(userCountBefore).toBeDefined();
    expect(phoneCountBefore).toBeDefined();
    expect(offerCountBefore).toBeDefined();
    expect(Number(userCountBefore?.count)).toBeGreaterThanOrEqual(1); // At least 1 user created
    expect(Number(phoneCountBefore?.count)).toBeGreaterThanOrEqual(1); // At least 1 listing created
    expect(Number(offerCountBefore?.count)).toBeGreaterThanOrEqual(1); // At least 1 offer created

    // 3. Run cleanupTestData() function
    await cleanupTestData();

    // 4. Verify data is cleaned up AFTER cleanup (post-condition)
    let userCountAfter = await db
      .selectFrom("og.users")
      .select(db.fn.countAll().as("count"))
      .executeTakeFirst();
    let phoneCountAfter = await db
      .selectFrom("og.phones")
      .select(db.fn.countAll().as("count"))
      .executeTakeFirst();
    let offerCountAfter = await db
      .selectFrom("og.purchaseOffers")
      .select(db.fn.countAll().as("count"))
      .executeTakeFirst();

    expect(userCountAfter).toBeDefined();
    expect(phoneCountAfter).toBeDefined();
    expect(offerCountAfter).toBeDefined();
    expect(Number(userCountAfter?.count)).toEqual(0); // Users table should be empty (or back to initial state if seeded data exists)
    expect(Number(phoneCountAfter?.count)).toEqual(0); // Phones table should be empty (or back to initial state)
    expect(Number(offerCountAfter?.count)).toEqual(0); // PurchaseOffers table should be empty (or back to initial state)
  });
});
