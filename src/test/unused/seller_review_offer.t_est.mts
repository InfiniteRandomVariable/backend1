// src/tests/seller-review-offer.e2e.test.mts  (Example file path - adjust as needed)
import request from "supertest"; // For making HTTP requests in tests
import { app } from "../server.mts"; // Or wherever you initialize your Express app // Adjust path!
import { db } from "../../src/db/database.mts"; // Import your database connection // Adjust path!
import {
  PurchaseOfferStatus,
  ProductStatus,
  UserRolesEnum,
} from "../../src/db/types.mjs"; // Import enums // Adjust path!
import { UserWithToken } from "./util_test_helper.mts"; // Assuming you have auth utils for testing // Adjust or create!
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestUsers,
  createTestPhoneListing,
  fetchPhoneListingFromDB,
  fetchPurchaseOfferFromDB,
  createTestPurchaseOffer,
  cleanupTestData,
  TestArbiterUser,
  TestSellerUser,
  TestBuyerUser,
  TestPhoneListing,
  TestPurchaseOffer,
} from "./util_test_helper.mts";

describe("E2E Test: Seller Reviews Purchase Offer", () => {
  let arbiterUsers: UserWithToken[] = [];
  let sellerToken: string = "";
  let buyerToken: string = "";
  let sellerUser: TestSellerUser,
    buyerUser: TestBuyerUser,
    phoneListing: TestPhoneListing,
    purchaseOffer: TestPurchaseOffer; // Test users, listing, offer

  beforeAll(async () => {
    // 1. Setup: Create test users, phone listing, purchase offer in DB (before all tests in this file)
    // **IMPORTANT**: Replace this with your actual user/listing/offer creation logic using your database and user/model utilities
    const sellerUsers = await createTestUsers(1, UserRolesEnum.Seller); // Example function - implement this!
    const buyerUsers = await createTestUsers(1, UserRolesEnum.Buyer); // Example function - implement this!
    arbiterUsers = await createTestUsers(6, UserRolesEnum.Arbiter); // Example function - implement this! (Create 6 arbiters)
    console.log("arbiterUsers length ", arbiterUsers.length);
    buyerUser = buyerUsers[0].user;
    sellerUser = sellerUsers[0].user;
    sellerToken = sellerUsers[0].token;
    buyerToken = buyerUsers[0].token;
    phoneListing = await createTestPhoneListing(sellerUser.userIdFk); // Example function - implement this!

    purchaseOffer = await createTestPurchaseOffer(
      buyerUser.userIdFk,
      phoneListing.id,
      arbiterUsers.map((u) => u.user.userIdFk)
    ); // Example - implement!
  });

  afterAll(async () => {
    // 2. Teardown: Clean up test data from DB (after all tests in this file)
    // **IMPORTANT**: Implement functions to delete test users, listings, offers you created in setup
    await cleanupTestData(); // Example function - implement this!
  });

  describe("POST /api/trades/offers/:purchaseOfferId/review", () => {
    it("should allow seller to ACCEPT a purchase offer with valid data and arbiters", async () => {
      //@ts-ignore

      console.log("arbiterUsers.length ", arbiterUsers.length);
      const arbiterIds = arbiterUsers.slice(0, 3).map((u) => u.user.userIdFk); // Select first 3 arbiters for acceptance
      // const arbiterIds = selectedArbiterIds.map((v) => v);
      //const tokens = selectedArbiterIds.map((v) => v.token);
      const reviewRequestBody = {
        status: PurchaseOfferStatus.AcceptedBySeller, // Numerical enum value for "AcceptedBySeller" (e.g., 2)
        selectedArbiterIds: arbiterIds,
      };

      console.log("reviewRequestBody 75");
      console.log(reviewRequestBody);

      console.log("sellerToken 69");
      console.log(sellerToken);
      console.log("purchaseOffer.id 72");
      console.log(purchaseOffer.id);

      console.log("arbiterIds 74");
      console.log(arbiterIds);

      const response = await request(app)
        .post(`/api/trades/offers/${purchaseOffer.id}/review`) // Use the created purchaseOffer.id
        .set("Authorization", `Bearer ${sellerToken}`) // Set authorization header
        .send(reviewRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("accepted successfully");
      expect(response.body.purchaseOfferId).toBe(purchaseOffer.id);

      // **Database Assertions:** Verify database updates
      const updatedPurchaseOffer = await fetchPurchaseOfferFromDB(
        purchaseOffer.id
      ); // Implement!
      expect(updatedPurchaseOffer.status).toBe(
        PurchaseOfferStatus.AcceptedBySeller
      );
      expect(updatedPurchaseOffer.arbiter1UserIdFk).toBe(arbiterIds[0]);
      expect(updatedPurchaseOffer.arbiter2UserIdFk).toBe(arbiterIds[1]);
      expect(updatedPurchaseOffer.arbiter3UserIdFk).toBe(arbiterIds[2]);

      const updatedPhoneListing = await fetchPhoneListingFromDB(
        phoneListing.id
      ); // Implement!
      expect(updatedPhoneListing.status).toBe(ProductStatus.OfferAccepted); // Or ProductStatus.Sold, depending on your choice

      //   // **Notification Assertion:** Check for console log message indicating notifications (adapt to your logging)
      //   expect(consoleOutput).toContain(
      //     `Purchase offer ${purchaseOffer.id} accepted by seller ${sellerUser.id}. Notifying buyer and agreed arbiters.`
      //   );
      //   expect(consoleOutput).toContain(
      //     `SMS notification sent to arbiter ${selectedArbiterIds[0]} for offer acceptance.`
      //   );
      //   expect(consoleOutput).toContain(
      //     `SMS notification sent to arbiter ${selectedArbiterIds[1]} for offer acceptance.`
      //   );
      //   expect(consoleOutput).toContain(
      //     `SMS notification sent to arbiter ${selectedArbiterIds[2]} for offer acceptance.`
      //   );
      //   expect(consoleOutput).toContain(`SMS notification sent to buyer`); // Check for buyer notification log
      //   expect(consoleOutput).not.toContain(`SMS notification sent to seller`); // Verify NO seller SMS notification
    });

    it("should allow seller to REJECT a purchase offer", async () => {
      const reviewRequestBody = {
        status: PurchaseOfferStatus.RejectedBySeller, // Numerical enum value for "RejectedBySeller" (e.g., 3)
        // selectedArbiterIds: not needed for reject
      };
      //const sellerAuthToken = generateAuthTokenProcedure(sellerUser);

      const response = await request(app)
        .post(`/api/trades/offers/${purchaseOffer.id}/review`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send(reviewRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("rejected successfully");
      expect(response.body.purchaseOfferId).toBe(purchaseOffer.id);

      // **Database Assertions:**
      const updatedPurchaseOffer = await fetchPurchaseOfferFromDB(
        purchaseOffer.id
      );
      expect(updatedPurchaseOffer.status).toBe(
        PurchaseOfferStatus.RejectedBySeller
      );

      const updatedPhoneListing = await fetchPhoneListingFromDB(
        phoneListing.id
      );
      expect(updatedPhoneListing.status).toBe(ProductStatus.Available); // Listing back to Available

      // **Notification Assertion:** Check for console log message (adapt to your logging)
      //   expect(consoleOutput).toContain(
      //     `Purchase offer ${purchaseOffer.id} rejected by seller ${sellerUser.id}. Notifying buyer.`
      //   );
      //   expect(consoleOutput).toContain(`SMS notification sent to buyer`); // Check for buyer notification log on rejection
      //   expect(consoleOutput).not.toContain(`SMS notification sent to seller`); // Verify NO seller SMS notification
      //   expect(consoleOutput).not.toContain(`SMS notification sent to arbiter`); // Verify NO arbiter SMS notification on rejection
    });

    it("should return 400 for ACCEPT action if less than 3 arbiters are selected", async () => {
      const reviewRequestBody = {
        status: PurchaseOfferStatus.AcceptedBySeller,
        selectedArbiterIds: arbiterUsers
          .slice(0, 2)
          .map((u) => u.user.userIdFk), // Only 2 arbiters selected - invalid
      };

      const response = await request(app)
        .post(`/api/trades/offers/${purchaseOffer.id}/review`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send(reviewRequestBody);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "Please select exactly 3 arbiters"
      );
      // **Database Assertion:** Verify offer status is still Pending (no update should happen)
      const updatedPurchaseOffer = await fetchPurchaseOfferFromDB(
        purchaseOffer.id
      );
      expect(updatedPurchaseOffer.status).toBe(PurchaseOfferStatus.Pending); // Status should remain Pending
    });

    it("should return 400 for invalid status value", async () => {
      const invalidStatusValue = 999; // Example of an invalid status number

      const reviewRequestBody = {
        status: invalidStatusValue, // Invalid status value
      };
      // const sellerAuthToken = generateAuthTokenProcedure(sellerUser);

      const response = await request(app)
        .post(`/api/trades/offers/${purchaseOffer.id}/review`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send(reviewRequestBody);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid status value provided"); // Check for the specific error message
      // **Database Assertion:** Verify offer status is still Pending
      const updatedPurchaseOffer = await fetchPurchaseOfferFromDB(
        purchaseOffer.id
      );
      expect(updatedPurchaseOffer.status).toBe(PurchaseOfferStatus.Pending); // Status should remain Pending
    });

    it("should return 401 Unauthorized if no token is provided", async () => {
      const reviewRequestBody = {
        status: PurchaseOfferStatus.RejectedBySeller,
      };

      const response = await request(app)
        .post(`/api/trades/offers/${purchaseOffer.id}/review`)
        .send(reviewRequestBody); // No auth token sent

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("Unauthorized");
    });

    it("should return 403 Forbidden if user is not a seller", async () => {
      //   const buyerAuthToken = generateAuthTokenProcedure(buyerUser); // Use buyer's token - should be forbidden
      const reviewRequestBody = {
        status: PurchaseOfferStatus.RejectedBySeller,
      };

      const response = await request(app)
        .post(`/api/trades/offers/${purchaseOffer.id}/review`)
        .set("Authorization", `Bearer ${buyerToken}`) // Use buyer's token
        .send(reviewRequestBody);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Unauthorized"); // Or "Forbidden", check your auth middleware message
    });

    it("should return 404 if purchase offer is not found", async () => {
      const nonExistentOfferId = 99999; // Example non-existent ID
      //const sellerAuthToken = generateAuthTokenProcedure(sellerUser);
      const reviewRequestBody = {
        status: PurchaseOfferStatus.RejectedBySeller,
      };

      const response = await request(app)
        .post(`/api/trades/offers/${nonExistentOfferId}/review`) // Use non-existent offer ID
        .set("Authorization", `Bearer ${sellerToken}`)
        .send(reviewRequestBody);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("Purchase offer not found");
    });

    it("should return 400 if purchase offer status is not Pending", async () => {
      // 1. Arrange: Create a purchase offer that is already AcceptedBySeller (or RejectedBySeller)
      const alreadyAcceptedOffer = await createTestPurchaseOffer(
        buyerUser.userIdFk,
        phoneListing.id,
        arbiterUsers.map((u) => u.user.userIdFk),
        PurchaseOfferStatus.AcceptedBySeller
      ); // Create offer with status AcceptedBySeller // Implement createTestPurchaseOffer to accept status param!

      const reviewRequestBody = {
        status: PurchaseOfferStatus.RejectedBySeller, // Try to reject even though it's already Accepted
      };

      // 2. Act: Try to review the already accepted offer
      const response = await request(app)
        .post(`/api/trades/offers/${alreadyAcceptedOffer.id}/review`) // Use alreadyAcceptedOffer.id
        .set("Authorization", `Bearer ${sellerToken}`)
        .send(reviewRequestBody);

      // 3. Assert: Expect 400 and error message about invalid offer status
      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "Purchase offer is not in a state that allows seller review"
      );
      expect(response.body.errorCode).toBe("INVALID_OFFER_STATUS"); // Check for errorCode if you have it
    });
  });
});

// async function createTestPhoneListing(sellerUserId: number) {
//   /* ... your listing creation logic ... */
// }
// async function createTestPurchaseOffer(
//   buyerUserId: number,
//   phoneIdFk: number,
//   arbiterUserIds: number[],
//   status?: PurchaseOfferStatus
// ) {
//   /* ... your purchase offer creation logic, optionally accept status ... */ return purchaseOffer;
// } // Modified to accept status
