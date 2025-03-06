// src/controllers/trade.controller.ts (previously purchaseOffer.controller.ts)

import { Request, Response } from "express";
import { CreatePurchaseOfferRequest } from "../db/zod/types.zod.mjs";
import { db } from "../db/database.mts";
import { ProductStatus, PurchaseOfferStatus } from "../db/types.mts";
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
