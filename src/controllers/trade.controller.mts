// src/controllers/trade.controller.ts (previously purchaseOffer.controller.ts)

import { Request, Response } from "express";
import {
  CreatePurchaseOfferRequest,
  OgPurchaseOffersType,
} from "../db/zod/types.zod.mts";
import { db } from "../db/database.mts";
import {
  MakePurchaseOfferPayload,
  makePurchaseOfferSchema,
} from "../db/zod/types.zod.mjs"; // Import the *renamed* schema
import {
  ProductStatus,
  PurchaseOfferStatus,
  UserStatus,
  ListingAndSellerInfo,
  NotificationType,
} from "../db/types.mts";
import { OgPurchaseOffers } from "../db/kysely-types";
import { sendSMS } from "../utils/sns.mjs";
import { getListingAndSellerDetails } from "../db/queries/user.queries.mts";
import { incrementUserNotificationCounter } from "../controllers/notification.controller.mts";
import { z } from "zod";
//import { OgPurchaseOffers } from "../db/interfaces/og_purchase_offers.interface.ts";
//import { Generated, Timestamp } from "../db/types.ts";
//import { User } from "../db/interfaces/user.interface.ts";
//import { PhoneListing } from "../db/interfaces/phone_listing.interface.ts";
const purchaseOfferStatusSchema = z.nativeEnum(PurchaseOfferStatus).optional();
// ... (Import necessary table interfaces/types from your kysely-codegen output - e.g., OgPurchaseOffers, OgPhonePosts, OgUsers) ...
/**
 * @controller POST /api/trades/offers
 * @desc Creates a purchase offer for a phone listing.
 * @access Private (Buyer Users)
 */
export const handleCreateOffer = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized: Missing or invalid user information.",
      });
    }
    const buyerUserId = req.user.id;

    const purchaseOfferData: CreatePurchaseOfferRequest = req.body;

    // 1. Fetch og.phones table to verify existence and availability, not og.phonePosts
    const phone = await db
      .selectFrom("og.phones") // **Fetch from og.phones table**
      .where("og.phones.id", "=", purchaseOfferData.phonePostIdFk) // **Use phonePostIdFk as phoneIdFk (assuming it references og.phones.id)**
      .where("og.phones.status", "=", ProductStatus.Available) // **TODO: Add status check if og.phones has a status column and define "availability"**
      .select(["id", "userIdFk", "status"]) // Select necessary fields from og.phones
      .executeTakeFirst();

    if (!phone) {
      return res
        .status(404)
        .json({ message: "Phone listing not found or is unavailable." }); // Updated message to include "unavailable"
    }
    // TODO: Add more checks based on "availability" if defined in og.phones

    // 2. Verify Selected Arbiters and check if arbiters are not the buyer or seller
    const arbiterUserIds = purchaseOfferData.arbiterUserIds;

    const validArbiters = await db
      .selectFrom("og.users")
      .innerJoin("og.authStatus", "og.users.id", "og.authStatus.userIdFk")
      .where("og.users.id", "in", arbiterUserIds)
      .where("og.authStatus.isArbiter", "=", true)
      .where("og.users.id", "!=", buyerUserId)
      .where("og.users.id", "!=", phone.userIdFk) // sellerUserIdFk is authorUserIdFk from og.phones
      .select(["og.users.id"])
      .execute();

    if (validArbiters.length !== arbiterUserIds.length) {
      return res.status(400).json({
        message:
          "One or more selected arbiters are invalid, not registered as arbiters, or are the buyer/seller.",
      }); // Updated message
    }

    // 3. Create Purchase Offer Record in og.purchaseOffers table
    const newPurchaseOffer = await db
      .insertInto("og.purchaseOffers")
      .values({
        phoneIdFk: phone.id, // **Use phone.id from og.phones (fetched in step 1)**
        buyerUserIdFk: buyerUserId,
        status: PurchaseOfferStatus.Pending, // **NEW: Use PurchaseOfferStatus.Pending enum**
        arbiter1UserIdFk: arbiterUserIds[0] || null,
        arbiter2UserIdFk: arbiterUserIds[1] || null,
        arbiter3UserIdFk: arbiterUserIds[2] || null,
        arbiter4UserIdFk: arbiterUserIds[3] || null,
        arbiter5UserIdFk: arbiterUserIds[4] || null,
        arbiter6UserIdFk: arbiterUserIds[5] || null,
        createdAt: new Date(),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    // 4. Notifications (Seller and Selected Arbiters) - TODO: Implement notification logic
    console.log(
      `Purchase offer created with ID: ${newPurchaseOffer.id}. Notifications to seller and arbiters to be implemented.`
    );

    // 5. Success Response
    res.status(201).json({
      message: "Purchase offer created successfully.",
      purchaseOfferId: newPurchaseOffer.id,
    });
  } catch (error: any) {
    console.error("Error creating purchase offer:", error);
    res.status(500).json({
      message: "Failed to create purchase offer.",
      error: error.message,
    });
  }
};
export const makePurchaseOfferController = async (
  req: Request,
  res: Response
) => {
  try {
    // 1. Parse and Validate Request Body using the *comprehensive* makePurchaseOfferSchema
    const offerPayload: MakePurchaseOfferPayload =
      makePurchaseOfferSchema.parse(req.body); // Using makePurchaseOfferSchema for request validation

    // 2. Get Buyer User ID from Authentication
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Buyer user ID not found." });
    }
    const arabiterUserIdsFk: number[] | null = Array.isArray(
      offerPayload.arbiter1UserIdFk
    ) // {{ edit_1 }}
      ? offerPayload.arbiter1UserIdFk // {{ edit_1 }}
      : offerPayload.arbiter1UserIdFk !== undefined // {{ edit_1 }}
      ? [offerPayload.arbiter1UserIdFk].filter(Boolean).map(Number) // {{ edit_1 }}
      : null;
    // 3. Call the Service to Create the Purchase Offer
    const newOffer = await createPurchaseOfferService({
      ...offerPayload,
      arbiterUserIdsFk:
        arabiterUserIdsFk === null ? undefined : arabiterUserIdsFk, // Assuming service still expects arbiterUserIdFk
      buyerUserIdFk: buyerUserId,
    });

    // 4. Respond with Success (201 Created)
    return res.status(201).json(newOffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 5. Handle Zod Validation Errors
      return res.status(400).json({
        message: "Invalid offer data",
        errors: error,
      });
    }
    // 6. Handle other errors
    console.error("Error creating purchase offer:", error);
    return res
      .status(500)
      .json({ message: "Failed to create purchase offer", error: error });
  }
};

interface CreatePurchaseOfferServiceParams extends MakePurchaseOfferPayload {
  buyerUserIdFk: number;
  phoneIdFk: number;
  arbiterUserIdsFk?: number[]; // Updated to accept arbiterUserIdsFk array in params
}

/**
 * Creates a new purchase offer with up to 6 arbiters and inserts it into the database.
 *
 * @param {CreatePurchaseOfferServiceParams} params - Parameters to create the purchase offer.
 * @returns {Promise<OgPurchaseOffersType>} - A promise that resolves to the newly created purchase offer data from the database.
 * @throws {Error} - Throws an error if listing or arbiters are invalid, database insertion fails, etc.
 */
export const createPurchaseOfferService = async (
  params: CreatePurchaseOfferServiceParams
): Promise<OgPurchaseOffersType> => {
  const { phoneIdFk, arbiterUserIdsFk, buyerUserIdFk, productIdFk } = params; // Now destructuring arbiterUserIdsFk
  let validArbiterUserIds: number[] = [];
  // **Service Logic:**

  // 1. Basic Validation
  if (!phoneIdFk) {
    throw new Error("Phone ID (Listing ID) is required.");
  }
  if (!buyerUserIdFk) {
    throw new Error("Buyer User ID is required.");
  }

  // 2. Robust Validation - Listing and Arbiter Existence and Validity
  try {
    let listingExists; // {{ edit_1 }}
    if (phoneIdFk) {
      // {{ edit_1 }}
      listingExists = await db // {{ edit_1 }}
        .selectFrom("og.phones") // {{ edit_1 }}
        .select("id") // {{ edit_1 }}
        .where("id", "=", phoneIdFk) // {{ edit_1 }}
        .where("status", "=", ProductStatus.Available) // Assuming status 1 is 'Active' // {{ edit_1 }}
        .executeTakeFirst(); // {{ edit_1 }}
    } else if (productIdFk) {
      // listingExists = await db // {{ edit_1 }}
      //   .selectFrom("og.products") // **Query og.products table** // {{ edit_1 }}
      //   .select("id") // {{ edit_1 }}
      //   .where("id", "=", productIdFk)
      //   .where("status", "=", ProductStatus.Available)
      //   .executeTakeFirst(); // {{ edit_1 }}
    } else {
      // {{ edit_1 }}
      throw new Error( // {{ edit_1 }}
        "Either Phone ID (Listing ID) or Product ID is required." // {{ edit_1 }}
      ); // {{ edit_1 }}
    } // {{ edit_1 }}

    // Validate each Arbiter User ID in the array (if provided)
    if (arbiterUserIdsFk && arbiterUserIdsFk.length > 0) {
      const arbiterUsers = await db // {{ edit_1 }}
        .selectFrom("og.authStatus") // {{ edit_1 }}
        .select("userIdFk") // {{ edit_1 }}
        .where("userIdFk", "in", arbiterUserIdsFk) // {{ edit_1 }}
        .where("isArbiter", "=", true)
        .where("og.authStatus.userStatus", "=", UserStatus.Normal)
        .execute(); // {{ edit_1 }}

      if (arbiterUsers.length !== arbiterUserIdsFk.length) {
        // {{ edit_1 }}
        validArbiterUserIds = arbiterUsers.map((user) => user.userIdFk); // {{ edit_1 }}
        const invalidArbiterUserIds = arbiterUserIdsFk.filter(
          // {{ edit_1 }}
          (id) => !validArbiterUserIds.includes(id) // {{ edit_1 }}
        ); // {{ edit_1 }}
        throw new Error( // {{ edit_1 }}
          `Invalid Arbiter User IDs: ${invalidArbiterUserIds.join(
            // {{ edit_1 }}
            ", " // {{ edit_1 }}
          )} or Users are not Arbiters.` // {{ edit_1 }}
        ); // {{ edit_1 }}
      } // {{ edit_1 }}
    }
  } catch (validationError) {
    console.error("Validation error:", validationError);
    throw new Error(`Validation failed: ${validationError}`);
  }

  // 3. Prepare data for database insertion, mapping arbiterUserIdsFk array to arbiter columns
  const newOfferData: OgPurchaseOffers = {
    phoneIdFk: phoneIdFk,
    buyerUserIdFk: buyerUserIdFk,
    arbiter1UserIdFk: validArbiterUserIds?.[0] || null, // Map first arbiter ID from array or null if array is empty/undefined
    arbiter2UserIdFk: validArbiterUserIds?.[1] || null, // Map second arbiter ID or null
    arbiter3UserIdFk: validArbiterUserIds?.[2] || null,
    arbiter4UserIdFk: validArbiterUserIds?.[3] || null,
    arbiter5UserIdFk: validArbiterUserIds?.[4] || null,
    arbiter6UserIdFk: validArbiterUserIds?.[5] || null, // Map up to 6 arbiter IDs, remaining are null
    status: 1,
    createdAt: new Date(),
    sellerDidRead: false,
    acceptedArbiterPositions: null,
    acceptedArbiterStatus: null,
    productIdFk: productIdFk || null,
  } as any;

  // 4. Validate the data against the makePurchaseOfferSchema
  const validatedOffer: OgPurchaseOffersType =
    makePurchaseOfferSchema.parse(newOfferData);

  // 5. Database Interaction - INSERT
  let newlyCreatedOfferInDb: OgPurchaseOffersType;
  try {
    const insertedOffer = await db
      .insertInto("og.purchaseOffers")
      .values(validatedOffer)
      .returningAll()
      .executeTakeFirstOrThrow();

    newlyCreatedOfferInDb = insertedOffer as OgPurchaseOffersType;
    const listingAndSeller: ListingAndSellerInfo | undefined =
      await getListingAndSellerDetails(phoneIdFk);

    if (!listingAndSeller) {
      throw new Error(`Error: can't find purchase offer 286`);
    }
    //Send notification section
    const notificationMessage = `New Purchase Offer Created for Listing ID: ${phoneIdFk}. Check your Seller Dashboard for details. SafeUsedPhones.com`;
    await sendSMS(String(listingAndSeller.sellerPhone), notificationMessage);

    // 6. **Update User Notification Count for 'offers' - after successful offer creation and notification**
    if (listingAndSeller.sellerUserIdFk) {
      try {
        await incrementUserNotificationCounter(
          listingAndSeller.sellerUserIdFk,
          NotificationType.Offers
        ); // Increment 'offers' count
        console.log(
          `User notification count for 'offers' updated for userIdFk: ${listingAndSeller.sellerUserIdFk}`
        );
      } catch (notificationError) {
        console.error(
          "Error updating user notification count:",
          notificationError
        );
        console.warn(
          "Failed to update user notification count, but purchase offer was created and seller notified. Consider retry."
        );
      }
    }
  } catch (dbError) {
    console.error("Database error creating purchase offer:", dbError);
    throw new Error("Failed to create purchase offer in the database.");
  }

  // 6. Return the newly created purchase offer object
  return newlyCreatedOfferInDb;
};
//const purchaseOfferStatusSchema = z.nativeEnum(PurchaseOfferStatus).optional();

export const getCurrentPurchaseOffers = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      // jwt_verify returns string on error
      return res.status(401).send({ message: "Unauthorized - Invalid  user" });
    }

    // Validate status query parameter if provided
    const statusParam = req.query.status;
    let statusFilter: PurchaseOfferStatus | undefined = undefined;
    if (statusParam) {
      const parsedStatus = purchaseOfferStatusSchema.safeParse(
        Number(statusParam)
      ); // Assuming status is passed as number
      if (!parsedStatus.success) {
        return res.status(400).send({
          message: "Invalid status parameter",
          errors: parsedStatus.error.errors,
        });
      }
      statusFilter = parsedStatus.data;
    }

    // Determine user role (Seller or Buyer -  simplified role determination based on query logic)
    // For now, we'll differentiate based on how we query - more robust role check might be needed in a real app
    const isBuyerQuery = true; // Assume buyer query initially, we'll try buyer logic first

    let purchaseOffers;

    // Buyer Logic
    purchaseOffers = await db
      .selectFrom("og.purchaseOffers")
      .selectAll()
      .where("buyerUserIdFk", "=", userId)
      .where(
        statusFilter ? "status" : "id",
        statusFilter ? "=" : ">",
        statusFilter || 0
      ) //Conditional status filter, always add a where clause to make it work.
      .execute();

    if (purchaseOffers.length > 0) {
      // If buyer offers found, assume buyer role
      return res.status(200).json(purchaseOffers);
    } else {
      // Seller Logic - If no buyer offers found, try seller logic
      purchaseOffers = await db
        .selectFrom("og.purchaseOffers as purchaseOffer") // Alias for clarity
        .selectAll("purchaseOffer") // Select all columns from OgPurchaseOffers
        .innerJoin("og.phones as phone", "purchaseOffer.phoneIdFk", "phone.id") // Join based on phoneIdFk and phone.id
        .where("phone.userIdFk", "=", userId) // Filter by seller's userIdFk in OgPhones table
        .where(
          statusFilter ? "purchaseOffer.status" : "purchaseOffer.id", // Target status in purchaseOffer table
          statusFilter ? "=" : ">",
          statusFilter || 0
        )
        .execute();
      return res.status(200).json(purchaseOffers);
    }
  } catch (error: any) {
    console.error("Error fetching current purchase offers:", error);
    return res.status(500).send({
      message: "Error fetching purchase offers",
      error: error.message,
    });
  }
};
