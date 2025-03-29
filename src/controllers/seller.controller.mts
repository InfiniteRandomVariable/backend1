// src/controllers/seller.controller.mts
import { Request, Response } from "express";
import { db } from "../db/database.mts";
import { getUserDetailsList } from "../utils/user.mts";
import { ReviewPurchaseOfferRequest } from "../db/zod/types.zod.mjs";
import { extractUserInfo } from "../utils/auth.mts";
import {
  containsAnyUserRoles,
  getPhoneModelString,
  getPaymentStatusString,
} from "../utils/commonUtil.mjs";

import { z } from "zod";
import {
  PurchaseOfferStatus,
  ProductStatus,
  NotificationType,
  UserRolesEnum,
  PaymentStatus,
} from "../db/types.mjs";
import { sendGenericNotifications } from "../utils/notification.mts";
interface PaymentDetails {
  buyerUserIdFk: number;
  model?: number | null; // Make model optional as it might not always be there
  title?: string | null; // Make title optional as it might not always be there
}
/**
 * @controller POST /api/trades/offers/:purchaseOfferId/review
 * @desc Seller reviews a purchase offer, selects arbiters (if accepting), and accepts/rejects the offer.
 * @access Private (Seller Users)
 */
export const handleReviewPurchaseOffer = async (
  req: Request,
  res: Response
) => {
  console.log("handleReviewPurchaseOffer 20");
  let action = "";
  //let userIds: number[] = [];

  try {
    if (!req.user || !req.user.id) {
      console.log("handleReviewPurchaseOffer 26");
      return res
        .status(401)
        .json({ message: "Unauthorized: Missing user information." });
    }
    const sellerUserId = req.user.id;
    const purchaseOfferId = parseInt(req.params.purchaseOfferId, 10); // Get purchaseOfferId from URL params

    if (isNaN(purchaseOfferId) || purchaseOfferId <= 0) {
      console.log("handleReviewPurchaseOffer 35 ", req.params.purchaseOfferId);
      return res.status(400).json({ message: "Invalid purchaseOfferId." });
    }

    const reviewData: ReviewPurchaseOfferRequest = req.body; // Already validated by middleware
    console.log("reviewData");
    console.log(reviewData);

    // 1. Fetch Purchase Offer and Related Phone Listing (og.purchaseOffers, og.phones)
    const purchaseOffer = await db
      .selectFrom("og.purchaseOffers")
      .where("og.purchaseOffers.id", "=", purchaseOfferId)
      .innerJoin("og.phones", "og.purchaseOffers.phoneIdFk", "og.phones.id") // Join to get phone listing details
      .select([
        "og.purchaseOffers.id",
        "og.purchaseOffers.status",
        "og.purchaseOffers.phoneIdFk",
        "og.purchaseOffers.buyerUserIdFk",
        "og.phones.userIdFk as sellerUserId", // To verify seller authorization
        "og.phones.status as phoneStatus", // To check phone listing status
        "og.purchaseOffers.arbiter1UserIdFk",
        "og.purchaseOffers.arbiter2UserIdFk",
        "og.purchaseOffers.arbiter3UserIdFk",
        "og.purchaseOffers.arbiter4UserIdFk",
        "og.purchaseOffers.arbiter5UserIdFk",
        "og.purchaseOffers.arbiter6UserIdFk",
      ])
      .executeTakeFirst();

    if (!purchaseOffer) {
      return res.status(404).json({ message: "Purchase offer not found." });
    }

    // 2. Authorization Check: Verify seller is the seller of the phone listing
    if (
      purchaseOffer.sellerUserId !== sellerUserId ||
      purchaseOffer.buyerUserIdFk === sellerUserId
    ) {
      return res.status(403).json({
        message:
          "Unauthorized: You are not the seller/buyer for this listing. 62",
      });
    }

    // 3. Validate Purchase Offer Status: Ensure it's in a state that allows seller review (e.g., 'Pending')
    if (purchaseOffer.status !== PurchaseOfferStatus.Pending) {
      return res.status(400).json({
        message: "Purchase offer is not in a state that allows seller review.",
        errorCode: "INVALID_OFFER_STATUS",
      }); // Or more specific status related message
    }

    const buyerAndSellerDetails = await getUserDetailsList([
      purchaseOffer.buyerUserIdFk,
      sellerUserId,
    ]);

    if (buyerAndSellerDetails.length !== 2) {
      return res.status(400).json({
        message: "Invalid user input",
      });
    }
    const buyerDetails = buyerAndSellerDetails[0];
    const sellerDetails = buyerAndSellerDetails[1];
    // TODO: Maybe also check if the 48-hour review period is still active? (If you implement a timer)

    // 4. Handle Seller Action ("accept" or "reject")
    if (reviewData.status === PurchaseOfferStatus.AcceptedBySeller) {
      // 4.a. Accept Offer Logic
      const selectedArbiterIds = reviewData.selectedArbiterIds;

      // 4.a.i. Verify Seller Selected 3 Arbiters
      if (!selectedArbiterIds || selectedArbiterIds.length !== 3) {
        // Already validated by Zod, but double-check
        return res.status(400).json({
          message: "Please select exactly 3 arbiters to accept the offer.",
        }); // Should not reach here if Zod is working
      }

      // 4.a.ii. Verify Selected Arbiters are from Buyer's Initial List
      const buyerInitialArbiterIds = [
        purchaseOffer.arbiter1UserIdFk,
        purchaseOffer.arbiter2UserIdFk,
        purchaseOffer.arbiter3UserIdFk,
        purchaseOffer.arbiter4UserIdFk,
        purchaseOffer.arbiter5UserIdFk,
        purchaseOffer.arbiter6UserIdFk,
      ].filter(
        (arbiterId) => arbiterId !== null && arbiterId !== undefined
      ) as number[];

      const validSelectedArbiters = selectedArbiterIds.every(
        (arbiterId: number) => buyerInitialArbiterIds.includes(arbiterId)
      );
      if (!validSelectedArbiters) {
        return res.status(400).json({
          message:
            "Selected arbiters must be from the list initially provided by the buyer.",
        });
      }

      // TODO: Verify selected arbiters are actually valid arbiters (isArbiter = true and exist in og.users)? (Optional, maybe already checked in Create Offer)

      const arbiterAuthStatuses = await db
        .selectFrom("og.authStatus")
        .where("og.authStatus.userIdFk", "in", selectedArbiterIds) // WHERE IN clause for all selected arbiter IDs
        .select(["og.authStatus.userIdFk", "og.authStatus.isArbiter"]) // Select both userIdFk and isArbiter
        .execute();
      const invalidArbiters = [];
      for (const arbiterId of selectedArbiterIds) {
        const authStatus = arbiterAuthStatuses.find(
          (status) => status.userIdFk === arbiterId
        ); // Find status for current arbiterId
        if (!authStatus || !authStatus.isArbiter) {
          invalidArbiters.push(arbiterId);
        }
      }

      if (invalidArbiters.length > 0) {
        //TODO: needs to notify buyer and sellers
        await db
          .deleteFrom("og.purchaseOffers")
          .where("og.purchaseOffers.id", "=", purchaseOfferId)
          .execute();
        const deletionMessageBuyer = `Purchase offer for phone listing has been deleted because seller selected invalid arbiters.`;

        try {
          if (buyerDetails.phone)
            sendGenericNotifications(
              purchaseOffer.buyerUserIdFk,
              deletionMessageBuyer,
              deletionMessageBuyer,
              NotificationType.RejectOffers
            );

          console.log(
            `SMS notifications sent for offer deletion ${purchaseOfferId}.`
          ); // Success log
        } catch (smsError) {
          console.error("SMS notification error (deletion):", smsError); // Log SMS sending errors, but don't block
        }
        return res.status(400).json({
          message:
            "One or more selected arbiters are invalid or not registered as arbiters.",
          invalidArbiterIds: invalidArbiters,
        });
      }
      // 4.a.iii. Update Purchase Offer Status to "AcceptedBySeller" and store selected arbiters
      await db
        .updateTable("og.purchaseOffers")
        .set({
          status: PurchaseOfferStatus.AcceptedBySeller,
          arbiter1UserIdFk: selectedArbiterIds[0],
          arbiter2UserIdFk: selectedArbiterIds[1],
          arbiter3UserIdFk: selectedArbiterIds[2],
        })
        .where("id", "=", purchaseOfferId)
        .execute();

      // 4.a.iv. Update Phone Listing Status to "Sold" (or "OfferAccepted" - decide on final status name)
      await db
        .updateTable("og.phones")
        .set({ status: ProductStatus.OfferAccepted }) // Or ProductStatus.OfferAccepted - choose appropriate status
        .where("id", "=", purchaseOffer.phoneIdFk)
        .execute();

      // 4.a.v. Notifications - Notify Buyer about offer acceptance and next steps (payment) - TODO: Implement SMS notification
      console.log(
        `Purchase offer ${purchaseOfferId} accepted by seller ${sellerUserId}. Notifying buyer and agreed arbiters.`
      );

      const acceptedMessageBuyer = `Purchase offer for phone accepted. Please make payment in 48 hours`;
      if (buyerDetails.phone) {
        //await sendSMS(buyerDetails.phone, acceptedMessageBuyer);
        sendGenericNotifications(
          purchaseOffer.buyerUserIdFk,
          acceptedMessageBuyer,
          acceptedMessageBuyer,
          NotificationType.Accepts
        );
      }

      action = "accepted";
    } else if (reviewData.status === PurchaseOfferStatus.RejectedBySeller) {
      // 4.b. Reject Offer Logic
      // 4.b.i. Update Purchase Offer Status to "RejectedBySeller"

      const rejectedMessageBuyer = `Purchase offer for phone listing is not available. Try another one.`;
      if (buyerDetails.phone) {
        sendGenericNotifications(
          purchaseOffer.buyerUserIdFk,
          rejectedMessageBuyer,
          rejectedMessageBuyer,
          NotificationType.RejectOffers
        );
      }

      await db
        .updateTable("og.purchaseOffers")
        .set({
          status: PurchaseOfferStatus.RejectedBySeller,
        })
        .where("id", "=", purchaseOfferId)
        .execute();

      // 4.b.ii. Update Phone Listing Status back to "Available"
      await db
        .updateTable("og.phones")
        .set({ status: ProductStatus.Available })
        .where("id", "=", purchaseOffer.phoneIdFk)
        .execute();

      // 4.b.iii. Notifications - Notify Buyer about offer rejection - TODO: Implement SMS notification
      console.log(
        `Purchase offer ${purchaseOfferId} rejected by seller ${sellerUserId}. Notifying buyer.`
      );
      action = "rejected";
    } else {
      // Should not reach here due to Zod enum validation
      return res.status(400).json({ message: "Invalid action." });
    }

    // 5. Success Response
    res.status(200).json({
      message: `Purchase offer ${action} successfully.`,
      purchaseOfferId: purchaseOfferId,
    });
  } catch (error: any) {
    console.error("Error reviewing purchase offer:", error);
    res.status(500).json({
      message: "Failed to review purchase offer.",
      error: error.message,
    });
  }
};

export const getSellerPaymentsController = async (
  req: Request,
  res: Response
) => {
  try {
    let userId = 0;
    const user = extractUserInfo(req);
    console.log("User ", user);
    if (user.userRoles.includes(UserRolesEnum.Seller)) {
      userId = user.userId;
      console.log("287 User ", userId);
    } else if (
      Number(req.params.sellerId) > 0 &&
      containsAnyUserRoles(user.userRoles, [
        UserRolesEnum.Staff,
        UserRolesEnum.Admin,
      ])
    ) {
      userId = Number(req.params.sellerId);

      console.log("297 User ", userId);
    }

    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = 100;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const result = await db
      .selectFrom("og.payments")
      .innerJoin(
        "og.purchaseOffers",
        "og.payments.purchaseOfferIdFk",
        "og.purchaseOffers.id"
      )
      .leftJoin("og.phones", "og.purchaseOffers.phoneIdFk", "og.phones.id")
      .leftJoin(
        "og.products",
        "og.purchaseOffers.productIdFk",
        "og.products.id"
      )
      .where((eb) =>
        eb.or([
          eb("og.phones.userIdFk", "=", userId),
          eb("og.products.userIdFk", "=", userId),
        ])
      )
      .selectAll("og.payments") // Select all columns from og.payments
      .select([
        "og.phones.id as phoneId",
        "og.products.id as productId",
        "og.phones.model as phoneModel",
        "og.phones.coverPhotoUrl as phoneUrl",
        "og.products.title as productTitle",
        "og.products.coverPhotoUrl as productUrl",
        "og.purchaseOffers.buyerUserIdFk as buyerUserId",
        "og.purchaseOffers.status as purchaseOfferStatus",
        ({ fn }) => fn.countAll().over().as("total"),
      ])
      .orderBy("og.payments.id", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    // The total count is available on any row
    const totalCount = result.length > 0 ? Number(result[0].total) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Your payments data is in the result array
    // const payments = result;

    return res.status(200).json({
      result,
      totalCount,
      currentPage: page,
      totalPages,
    });
  } catch (error: any) {
    console.error("Error fetching seller payments:", error);
    return res.status(500).json({
      message: "Failed to fetch payment records.",
      error: error.message,
    });
  }
};

const updateSellerPaymentSchema = z.object({
  status: z.nativeEnum(PaymentStatus), // Assuming 'status' is a number in your enum
});

type UpdateSellerPaymentPayload = z.infer<typeof updateSellerPaymentSchema>;
async function handleSuccessfulPaymentUpdate(
  paymentId: number,
  payment: PaymentDetails,
  parsedBody: UpdateSellerPaymentPayload,
  notificationType: NotificationType,
  res: Response
) {
  const buyerUserId = payment.buyerUserIdFk;
  const phoneString =
    payment.model !== undefined ? getPhoneModelString(payment.model) : "";
  const productString = payment.title ? payment.title : "";
  const statusString =
    parsedBody.status !== undefined
      ? getPaymentStatusString(parsedBody.status)
      : "";
  const itemName = phoneString ? phoneString : productString;
  const message = `PaymentId:${paymentId} for item ${itemName} updated to ${statusString} status `;

  sendGenericNotifications(
    buyerUserId,
    message,
    message,
    notificationType // Assuming this NotificationType exists
  );
  return res.status(200).json({ message: "Payment updated successfully." });
}
export const updateSellerPaymentController = async (
  req: Request,
  res: Response
) => {
  try {
    const user = extractUserInfo(req);
    const paymentId = parseInt(req.params.paymentId, 10);
    const sellerUserId = user.userId;
    // 1. Validate request body using Zod
    const parsedBody: UpdateSellerPaymentPayload =
      updateSellerPaymentSchema.parse(req.body);
    if (isNaN(paymentId) || paymentId <= 0) {
      return res.status(400).json({ message: "Invalid paymentId." });
    }

    if (
      containsAnyUserRoles(user.userRoles, [
        UserRolesEnum.Admin,
        UserRolesEnum.Staff,
      ])
    ) {
      const paymentDetailsForAdmin = (await db
        .selectFrom("og.payments")
        .innerJoin(
          "og.purchaseOffers",
          "og.payments.purchaseOfferIdFk",
          "og.purchaseOffers.id"
        )
        .leftJoin("og.phones", "og.purchaseOffers.phoneIdFk", "og.phones.id")
        .leftJoin(
          "og.products",
          "og.purchaseOffers.productIdFk",
          "og.products.id"
        )
        .where("og.payments.id", "=", paymentId)
        .select([
          "og.purchaseOffers.buyerUserIdFk",
          "og.phones.model",
          "og.products.title",
        ])
        .executeTakeFirst()) as PaymentDetails; // Type assertion

      if (paymentDetailsForAdmin) {
        const updatedPayment = await db
          .updateTable("og.payments")
          .set(parsedBody)
          .where("id", "=", paymentId)
          .executeTakeFirst();

        if (updatedPayment) {
          return handleSuccessfulPaymentUpdate(
            paymentId,
            paymentDetailsForAdmin,
            parsedBody,
            NotificationType.PaymentUpdates,
            res
          );
        } else {
          return res.status(500).json({ message: "Failed to update payment." });
        }
      }
    }

    if (!sellerUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    // 2. Fetch the payment record to verify ownership
    const payment = (await db
      .selectFrom("og.payments")
      .innerJoin(
        "og.purchaseOffers",
        "og.payments.purchaseOfferIdFk",
        "og.purchaseOffers.id"
      )
      .leftJoin("og.phones", "og.purchaseOffers.phoneIdFk", "og.phones.id")
      .leftJoin(
        "og.products",
        "og.purchaseOffers.productIdFk",
        "og.products.id"
      )
      .where("og.payments.id", "=", paymentId)
      .where((eb) =>
        eb.or([
          eb("og.phones.userIdFk", "=", sellerUserId),
          eb("og.products.userIdFk", "=", sellerUserId),
        ])
      )
      .select([
        "og.payments.id",
        "og.purchaseOffers.buyerUserIdFk",
        "og.phones.model",
        "og.products.title",
      ])
      .executeTakeFirst()) as PaymentDetails;

    if (!payment) {
      return res.status(404).json({
        message:
          "Payment record not found or not associated with your listings.",
      });
    }

    // 3. Update the payment record
    const updatedPayment = await db
      .updateTable("og.payments")
      .set(parsedBody)
      .where("id", "=", paymentId)
      .executeTakeFirst();

    if (updatedPayment) {
      return handleSuccessfulPaymentUpdate(
        paymentId,
        payment,
        parsedBody,
        NotificationType.PaymentUpdates,
        res
      );
    } else {
      return res.status(500).json({ message: "Failed to update payment." });
    }
  } catch (error: any) {
    console.error("Error updating seller payment:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid request body", errors: error.errors });
    }
    return res.status(500).json({
      message: "Failed to update payment.",
      error: error.message,
    });
  }
};
