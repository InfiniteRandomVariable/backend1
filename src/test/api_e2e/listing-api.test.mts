// src/tests/api/listing-api.e2e.test.mts

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../server.mts";
import { cleanupTestData, setupUserAndRole } from "../util_test_helper.mjs";
import { makeid } from "../../utils/commonUtil.mjs";
import {
  ProductStatus,
  UserRoles,
  UserRolesEnum,
  PurchaseOfferStatus,
} from "../../db/types.mts";
import { jwt_verify } from "../../controllers/user.controller.mts";

let sellerAuthToken: { authToken: any; userData: any; userId: number };
let sellerUserData;
let buyerAuthToken: any;
let buyerUserData: any;
let phoneListingId;
let purchaseOfferId;
let arbiterUsers; // Array to store arbiter user data
let listingId: number;
let offerId: number; // To store the ID of the created purchase offer
let arbiterAuthTokens: { authToken: any; userData: any; userId: number }[] = []; // {{ edit_1 }}
let arbiterUserDatas: any[] = [];
let arbiterUserIds: number[];

async function setupSellerBuyerListingOffer(
  arbiterUserIdsFk: number[],
  listingPayload: any, // listingPayload parameter with default
  returnListingStatus: number,
  returnPurchaseOfferStatus: number
) {
  sellerAuthToken = await setupUserAndRole(
    UserRolesEnum.Seller,
    UserRolesEnum.Seller
  );
  listingPayload.userIdFk = sellerAuthToken.userId; // Ensure userIdFk is set for the seller

  buyerAuthToken = await setupUserAndRole(
    UserRolesEnum.Buyer,
    UserRolesEnum.Buyer
  );

  const listingResponse = await request(app)
    .post("/api/phones")
    .set("Authorization", `Bearer ${sellerAuthToken.authToken}`)
    .send(listingPayload) // Use provided listingPayload, or default
    .expect(returnListingStatus);

  const listingIdToUse = listingResponse.body.id;

  const offerPayloadToSend = {
    listingId: listingIdToUse,
    arbiterUserIdsFk: arbiterUserIdsFk, // Use first arbiter from input array
  };

  const offerResponse = await request(app)
    .post("/api/offers/purchaseoffers/make")
    .set("Authorization", `Bearer ${buyerAuthToken}`)
    .send(offerPayloadToSend)
    .expect(returnPurchaseOfferStatus);

  const offerIdToUse = offerResponse.body.id;

  return {
    purchaseOfferId: offerIdToUse,
    sellerAuthToken: sellerAuthToken,
    sellerUserId: sellerAuthToken.userId,
    offerResponse: offerResponse,
  };
}

describe("API E2E Tests - Seller Review Offer Flow (with Arbiter Selection)", () => {
  const listingPayload1 = {
    userIdFk: 1, // Placeholder - backend should override from token
    model: 123, // Example model ID
    price: 550,
    status: ProductStatus.Available, // Example status ID - Available
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
    photoUrls: [], // Empty array initially
    replacements: "None",
    screen: 8,
    shphoneFrom31662: "US",
    storage: 128,
    wifi: 6,
  };
  beforeAll(async () => {
    await cleanupTestData();

    for (let i = 0; i < 6; i++) {
      const arbiterSetupResult = await setupUserAndRole(
        UserRolesEnum.Arbiter,
        UserRolesEnum.Arbiter
      );

      arbiterAuthTokens.push(arbiterSetupResult);
      arbiterUserDatas.push(arbiterSetupResult.userData);
    }
    arbiterUserIds = arbiterAuthTokens.map((a) => a.userId as number);
    const listingResult = await setupSellerBuyerListingOffer(
      arbiterUserIds,
      listingPayload1,
      200,
      200
    );

    // offerId = listingResult.purchaseOfferId; // Store offer ID for Seller Review tests
  });

  // afterEach(cleanupTestData);

  describe("Buyer Purchase Offer Creation", () => {
    it("should create a new purchase offer successfully when buyer chooses an arbiter", async () => {
      const listingResult = await setupSellerBuyerListingOffer(
        arbiterUserIds,
        listingPayload1,
        200,
        200
      );

      expect(listingResult.offerResponse.body).toBeDefined();
      expect(listingResult.offerResponse.body.id).toBeTypeOf("number"); // Assert offer ID is returned
      expect(listingResult.offerResponse.body.status).toBeDefined(); // Assert offer status is returned (e.g., 'Pending')
      expect(listingResult.offerResponse.body.listingIdFk).toBe(
        listingResult.offerResponse
      ); // Verify listing ID in the offer
      expect(listingResult.offerResponse.body.buyerUserIdFk).toBe(
        buyerUserData.userId
      ); // Verify buyer user ID

      expect([arbiterUserIds]).includes(arbiterUserIds);

      expect(listingResult.offerResponse.body.arbiterUserIdsFk).toBe(
        arbiterUserIds
      ); // Verify arbiter user ID is correctly set
    });

    it.skip("should create a new purchase offer and call sendSMS mock with correct parameters", async () => {
      const listingResult = await setupSellerBuyerListingOffer(
        arbiterUserIds, // Use arbiterUserIds from beforeEach
        listingPayload1,
        201,
        201
      );

      expect(listingResult.offerResponse.body).toBeDefined();

      //@ts-ignore
      expect(sendSMSMock).toHaveBeenCalledTimes(1);
      //@ts-ignore
      expect(sendSMSMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\+1\d{10}$/),
        expect.stringContaining(
          //@ts-ignore
          `New Purchase Offer Created for Listing ID: ${listingResult.listingResponse.body.id}`
        ) // Use listing ID from listingResponse
      );
    });

    it.skip("should return 400 Bad Request if arbiterUserIdFk is missing in purchase offer payload", async () => {
      const listingResult = await setupSellerBuyerListingOffer(
        [], // Use arbiterUserIds from beforeEach
        listingPayload1,
        201,
        400
      );

      expect(listingResult.offerResponse).toBeDefined(); // Now assert on offerResponse directly from listingResult
      expect(listingResult.offerResponse.status).toBe(400);
      expect(listingResult.offerResponse.body).toBeDefined();
      expect(listingResult.offerResponse.body.message).toContain(
        "Invalid offer data"
      );
      expect(listingResult.offerResponse.body.errors).toBeDefined();
      // You can add more specific error assertions here if needed, based on listingResult.offerResponse.body.errors
    });

    it.skip("should return 400 Bad Request if arbiterUserIdFk is not a valid userId (e.g., not an integer)", async () => {
      const listingResult = await setupSellerBuyerListingOffer(
        [1, 2], // Use arbiterUserIds from beforeEach
        listingPayload1,
        201,
        400
      );

      expect(listingResult.offerResponse).toBeDefined(); // Now assert on offerResponse directly from listingResult
      expect(listingResult.offerResponse.status).toBe(400);
      expect(listingResult.offerResponse.body).toBeDefined();
      expect(listingResult.offerResponse.body.message).toContain(
        "Invalid offer data"
      );
      expect(listingResult.offerResponse.body.errors).toBeDefined();
      // Add specific error assertions based on listingResult.offerResponse.body.errors
    });

    it("should return 400 Bad Request if userIdFK is missing", async () => {
      const clone = structuredClone(listingPayload1);

      //@ts-ignore
      clone.userIdFk = null;

      const listingResult = await setupSellerBuyerListingOffer(
        arbiterUserIds, // Use arbiterUserIds from beforeEach
        clone,
        201,
        400
      );

      expect(listingResult.offerResponse).toBeDefined(); // Now assert on offerResponse directly from listingResult
      expect(listingResult.offerResponse.status).toBe(400);
      expect(listingResult.offerResponse.body).toBeDefined();
      expect(listingResult.offerResponse.body.errors).toBeDefined();
      // Add specific error assertions based on listingResult.offerResponse.body.errors
    });

    it.skip("should return 401 Unauthorized if trying to create purchase offer without authentication", async () => {
      const listingResult = await setupSellerBuyerListingOffer(
        arbiterUserIds, // Use arbiterUserIds from beforeEach
        listingPayload1,
        401,
        401
      );

      expect(listingResult.offerResponse).toBeDefined(); // Assert on listingResponse as unauthorized should happen at listing level
      // expect(listingResult.listingResponse.status).toBe(401);
      // You might want to add assertions on listingResponse.body if your 401 response has a body
    });
  });

  describe("Seller Offer Review Flow - Accept Offer", () => {
    // No changes needed here
    it("should allow seller to accept a purchase offer successfully using POST /api/trades/offers/:purchaseOfferId/review", async () => {
      // **--- Use reusable function to setup Seller, Buyer, Listing and Offer ---**
      const {
        purchaseOfferId: currentOfferId,
        sellerAuthToken: currentSellerAuthToken,
        sellerUserId: currentSellerUserId,
      } = await setupSellerBuyerListingOffer(
        arbiterUserIds, // Pass arbiterUserIdsFk - can keep this as is for Seller Review tests
        listingPayload1,
        201,
        201
      );

      const reviewOfferPayload = {
        status: PurchaseOfferStatus.AcceptedBySeller,
        selectedArbiterIds: [
          arbiterUserIds[0],
          arbiterUserIds[3],
          arbiterUserIds[4],
        ],
      };

      const response = await request(app)
        .post(`/api/trades/decideoffer/${purchaseOfferId}`)
        .set("Authorization", `Bearer ${sellerAuthToken.authToken}`)
        .send(reviewOfferPayload)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.purchaseOfferId).toBe(currentOfferId);
      expect(response.body.message).toContain(
        "Purchase offer accepted successfully"
      );

      // **Verify offer status was actually updated in DB**
      const getOfferResponse = await request(app)
        .get(`/api/offers/${currentOfferId}`)
        .set("Authorization", `Bearer ${sellerAuthToken.authToken}`)
        .expect(200);
      expect(getOfferResponse.body.status).toBe(
        PurchaseOfferStatus.AcceptedBySeller
      );
    });

    it("should return 404 Not Found if seller tries to accept a non-existent offer", async () => {
      // **--- Use reusable function to setup Seller, Buyer, Listing and Offer ---**
      const { sellerAuthToken: currentSellerAuthToken } =
        await setupSellerBuyerListingOffer(
          arbiterUserIds, // Pass arbiterUserIdsFk - can keep this as is for Seller Review tests
          listingPayload1,
          201,
          201
        );

      const nonExistentOfferId = 99999;
      const reviewOfferPayload = {
        status: PurchaseOfferStatus.AcceptedBySeller,
        selectedArbiterIds: [
          arbiterUserIds[0],
          arbiterUserIds[3],
          arbiterUserIds[4],
        ],
      };

      await request(app)
        .post(`/api/trades/decideoffer/${nonExistentOfferId}`)
        .set("Authorization", `Bearer ${sellerAuthToken.authToken}`)
        .send(reviewOfferPayload)
        .expect(404);
    });

    it("should return 403 Forbidden if seller tries to accept an offer for another seller's listing (authorization check)", async () => {
      // **--- Use reusable function to setup Seller, Buyer, Listing and Offer ---**
      const {
        purchaseOfferId: currentOfferId,
        sellerUserId: currentSellerUserId,
      } = await setupSellerBuyerListingOffer(
        arbiterUserIds, // Pass arbiterUserIdsFk - can keep this as is for Seller Review tests
        listingPayload1,
        201,
        201
      );

      const anotherSellerSetupResult = await setupUserAndRole(
        UserRolesEnum.Seller,
        UserRolesEnum.Seller
      );
      const anotherSellerAuthToken = anotherSellerSetupResult.authToken;
      const reviewOfferPayload = {
        status: PurchaseOfferStatus.AcceptedBySeller,
        selectedArbiterIds: [
          arbiterUserIds[0],
          arbiterUserIds[3],
          arbiterUserIds[4],
        ],
      };

      await request(app)
        .post(`/api/trades/decideoffer/${purchaseOfferId}`)
        .set("Authorization", `Bearer ${anotherSellerAuthToken}`)
        .send(reviewOfferPayload)
        .expect(403);
    });

    it("should return 401 Unauthorized if trying to accept offer without authentication", async () => {
      // **--- Use reusable function to setup Seller, Buyer, Listing and Offer ---**
      const { purchaseOfferId: currentOfferId } =
        await setupSellerBuyerListingOffer(
          arbiterUserIds, // Pass arbiterUserIdsFk - can keep this as is for Seller Review tests
          listingPayload1,
          201,
          201
        );

      const reviewOfferPayload = {
        status: PurchaseOfferStatus.AcceptedBySeller,
        selectedArbiterIds: [
          arbiterUserIds[0],
          arbiterUserIds[3],
          arbiterUserIds[4],
        ],
      };
      await request(app)
        .post(`/api/trades/decideoffer/${purchaseOfferId}`)
        .send(reviewOfferPayload)
        .expect(401);
    });
  });

  describe("Seller Offer Review Flow - Reject Offer and check get all purchase offers by seller/buyers role", () => {
    // No changes needed here
    it("should allow seller to reject a purchase offer successfully using POST /api/trades/offers/:purchaseOfferId/review", async () => {
      // **--- Use reusable function to setup Seller, Buyer, Listing and Offer ---**
      const offerResponse = await setupSellerBuyerListingOffer(
        arbiterUserIds, // Pass arbiterUserIdsFk - can keep this as is for Seller Review tests
        listingPayload1,
        201,
        201
      );

      const getOfferResponse = await request(app)
        .get(`/api/trades/purchaseoffers/current`)
        .set("Authorization", `Bearer ${sellerAuthToken.authToken}`)
        .expect(200);

      const purchaseOffersArray = getOfferResponse.body;

      const foundPurchaseOffer = purchaseOffersArray.find(
        (offer: any) => offer.id === purchaseOfferId
      );

      if (foundPurchaseOffer) {
        console.log(
          "Found purchase offer with ID",
          purchaseOfferId,
          ":",
          foundPurchaseOffer
        );
        // You can now work with 'foundPurchaseOffer'
      } else {
        console.log(
          "Purchase offer with ID",
          purchaseOfferId,
          "not found in the response."
        );
      }

      expect(getOfferResponse.body).toBeDefined();
      expect(foundPurchaseOffer.id).toBe(purchaseOfferId);

      expect(foundPurchaseOffer.status).toBe(
        PurchaseOfferStatus.RejectedBySeller
      );

      const getOfferResponseBuyer = await request(app)
        .get(`/api/trades/purchaseoffers/current`)
        .set("Authorization", `Bearer ${buyerAuthToken.authToken}`)
        .expect(200);

      const purchaseOffersArrayBuyer = getOfferResponseBuyer.body;

      const foundPurchaseOfferBuyer = purchaseOffersArrayBuyer.find(
        (offer: any) => offer.id === purchaseOfferId
      );

      if (foundPurchaseOfferBuyer) {
        console.log(
          "Found purchase offer with ID",
          purchaseOfferId,
          ":",
          foundPurchaseOfferBuyer
        );
        // You can now work with 'foundPurchaseOffer'
      } else {
        console.log(
          "Purchase offer with ID",
          purchaseOfferId,
          "not found in the response."
        );
      }

      expect(getOfferResponseBuyer.body).toBeDefined();
      expect(foundPurchaseOfferBuyer.id).toBe(purchaseOfferId);

      expect(foundPurchaseOfferBuyer.status).toBe(
        PurchaseOfferStatus.RejectedBySeller
      );
    });

    it("should return 404 Not Found if seller tries to reject a non-existent offer", async () => {
      // **--- Use reusable function to setup Seller, Buyer, Listing and Offer ---**
      const response = await setupSellerBuyerListingOffer(
        arbiterUserIds, // Pass arbiterUserIdsFk - can keep this as is for Seller Review tests
        listingPayload1,
        201,
        201
      );

      const nonExistentOfferId = 77777;
      const reviewOfferPayload = {
        status: PurchaseOfferStatus.RejectedBySeller,
      };

      await request(app)
        .post(`/api/trades/offers/${nonExistentOfferId}/review`)
        .set("Authorization", `Bearer ${response.sellerAuthToken.authToken}`)
        .send(reviewOfferPayload)
        .expect(404);
    });

    it("should return 403 Forbidden if seller tries to reject an offer for another seller's listing", async () => {
      // **--- Use reusable function to setup Seller, Buyer, Listing and Offer ---**
      const {
        purchaseOfferId: currentOfferId,
        sellerUserId: currentSellerUserId,
      } = await setupSellerBuyerListingOffer(
        arbiterUserIds, // Pass arbiterUserIdsFk - can keep this as is for Seller Review tests
        listingPayload1,
        201,
        201
      );

      const anotherSellerSetupResult = await setupUserAndRole(
        UserRolesEnum.Seller,
        UserRolesEnum.Seller
      );
      const anotherSellerAuthToken = anotherSellerSetupResult.authToken;
      const reviewOfferPayload = {
        status: PurchaseOfferStatus.RejectedBySeller,
      };

      await request(app)
        .post(`/api/trades/decideoffer/${currentOfferId}`)
        .set("Authorization", `Bearer ${anotherSellerAuthToken}`)
        .send(reviewOfferPayload)
        .expect(403);
    });

    it("should return 401 Unauthorized if trying to reject offer without authentication", async () => {
      // **--- Use reusable function to setup Seller, Buyer, Listing and Offer ---**
      const { purchaseOfferId: currentOfferId } =
        await setupSellerBuyerListingOffer(
          arbiterUserIds, // Pass arbiterUserIdsFk - can keep this as is for Seller Review tests
          listingPayload1,
          201,
          201
        );

      const reviewOfferPayload = {
        status: PurchaseOfferStatus.RejectedBySeller,
      };
      await request(app)
        .post(`/api/trades/decideoffer/${currentOfferId}`)
        .send(reviewOfferPayload)
        .expect(401);
    });
  });
});
