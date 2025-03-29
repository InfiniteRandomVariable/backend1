//src/controllers/payment.controller.mts

import { Request, Response } from "express";
import { db } from "../db/database.mts"; // Adjust path as needed
import { PurchaseOfferStatus } from "../db/types.mts"; // Adjust path as needed
import { extractUserInfo } from "../utils/commonUtil.mjs";
import {
  PaymentStatus,
  PaymentType,
  PaymentSource,
  UserRolesEnum,
} from "../db/types.mts"; // Assuming you have this enum defined
import { getSellerDetailsFromPurchaseOffer } from "../utils/user.mts";
import { isDevEnviroment } from "../utils/commonUtil.mts";
import { appName } from "../utils/constants.mts";
import { NotificationType } from "../db/types.mts";
import { sendGenericNotifications } from "../utils/notification.mts";
import { z } from "zod";

const initiatePaymentSchema = z.object({
  paymentSource: z.nativeEnum(PaymentSource),
  transactionCode: z.string().optional(),
  referenceCode: z.string().optional(),
  amountPaid: z.number().positive(),
  type: z.nativeEnum(PaymentType),
});
type InitiatePaymentPayload = z.infer<typeof initiatePaymentSchema>;
export const initiatePaymentController = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("createListing 84");
    const files = req.payload;

    console.log(req.payload);
    console.log("createListing 86");
    if (!Array.isArray(files) && !files && isDevEnviroment() === false) {
      return res.status(500).json({ message: "Failed to create listing 20" });
    }

    console.log("createListing 94");
    const firstPhotoUrl =
      Array.isArray(files) && files.length > 0
        ? files[0]
        : isDevEnviroment()
        ? ""
        : null; //remove the first element and return the first element
    const secondPhotoUrl =
      Array.isArray(files) && files.length > 1
        ? files[1]
        : isDevEnviroment()
        ? ""
        : null; //r
    // 1. Extract purchaseOfferId from parameters
    const purchaseOfferId = parseInt(req.params.purchaseOfferId, 10);
    if (isNaN(purchaseOfferId) || purchaseOfferId <= 0) {
      return res.status(400).json({ message: "Invalid purchaseOfferId." });
    }

    // 2. Authenticate user (already done by middleware)
    const buyerUserId = req.user?.id;
    if (!buyerUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    // 3. Fetch seller and buyer details using the reusable function
    const sellerDetails = await getSellerDetailsFromPurchaseOffer(
      purchaseOfferId
    );

    if (!sellerDetails) {
      return res
        .status(404)
        .json({ message: "User record not found when creating payment 35" });
    }

    // 4. Authorize user is the buyer for this purchase offer
    if (sellerDetails.buyerUserId !== buyerUserId) {
      return res.status(403).json({
        message: "Unauthorized: You are not the buyer for this offer.",
      });
    }

    // 4. Verify offer status is AcceptedBySeller
    if (sellerDetails.purchaseStatus !== PurchaseOfferStatus.AcceptedBySeller) {
      return res.status(400).json({
        message:
          "Payment proof can only be submitted for offers accepted by the seller.",
      });
    }
    // 5. Parse and validate the request body using Zod
    let parsedBody: InitiatePaymentPayload;
    try {
      parsedBody = initiatePaymentSchema.parse(req.body);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: "Invalid request body", errors: error.errors });
    }

    const { paymentSource, transactionCode, referenceCode, amountPaid, type } =
      parsedBody;

    // 8. Create a new record in the OgPayments table

    //TODO add second photoUrls secondPhotoUrl
    const newPaymentId = await db
      .insertInto("og.payments")
      .values({
        purchaseOfferIdFk: purchaseOfferId,
        photoUrl: firstPhotoUrl,
        photoUrl2: secondPhotoUrl,
        paymentSource: paymentSource,
        paymentReference: transactionCode || referenceCode || null,
        amountPaid: amountPaid,
        status: PaymentStatus.ProofSubmitted,
        type: type,
      })
      .returning("id")
      .executeTakeFirst();

    if (!newPaymentId) {
      return res
        .status(500)
        .json({ message: "Failed to record payment proof." });
    }

    // 9. Update the PurchaseOfferStatus to Pending (assuming this means Payment Proof Submitted)
    await db
      .updateTable("og.purchaseOffers")
      .set({ status: PurchaseOfferStatus.Pending })
      .where("id", "=", purchaseOfferId)
      .execute();

    // 6. Send notification to the seller
    const notificationSubject = "Payment Initiated";
    const notificationMessage = `The buyer has submitted payment proof for ${sellerDetails.productName} ${sellerDetails.modelName} ${sellerDetails.modelNum}. OfferId ${purchaseOfferId} Please verify it in your dashboard.`;
    await sendGenericNotifications(
      sellerDetails.userId, // Assuming sellerDetails has sellerUserId
      notificationSubject,
      notificationMessage,
      NotificationType.PaymnetPendingApproval
    );

    // 14. Return a success response
    return res.status(200).json({
      message: "Payment proof submitted successfully.",
      purchaseOfferId,
      paymentId: newPaymentId,
    });
  } catch (error: any) {
    console.error("Error submitting payment proof:", error);
    return res.status(500).json({
      message: "Failed to submit payment proof.",
      error: error.message,
    });
  }
};

export const getPaymentsController = async (req: Request, res: Response) => {
  try {
    const userInfo = extractUserInfo(req);

    //console.log("req.params:", req.params);
    const loggedUserId = req.user?.id;

    const userRoles: string[] = userInfo.userRoles;

    const pageParam = req.query.page as string | undefined;
    const page = parseInt(pageParam || "1", 10);
    const pageSize = 40;
    const offset = (page - 1) * pageSize;
    let statusParam =
      req.params.status && typeof req.params.status === "string"
        ? Number(req.params.status)
        : 0;

    const paymentId = Number(req.query.paymentId);

    if (isNaN(page) || page < 1) {
      return res.status(400).json({ message: "Invalid page number." });
    }

    if (userRoles.includes(UserRolesEnum.Seller)) {
      const query = db
        .selectFrom("og.payments as p")
        .innerJoin("og.purchaseOffers as po", "p.purchaseOfferIdFk", "po.id")
        .leftJoin("og.phones as ph", "po.phoneIdFk", "ph.id");

      if (loggedUserId) {
        query.where("po.buyerUserIdFk", "=", loggedUserId);
        query.where((eb) =>
          eb
            .selectFrom("og.purchaseOffers as sub_po")
            .innerJoin("og.phones as sub_ph", "sub_po.phoneIdFk", "sub_ph.id")
            .whereRef("sub_po.id", "=", "po.id")
            .where("sub_ph.userIdFk", "=", loggedUserId)
        );
      } else {
        query.where((eb) =>
          eb
            .selectFrom("og.purchaseOffers as sub_po")
            .innerJoin("og.phones as sub_ph", "sub_po.phoneIdFk", "sub_ph.id")
            .whereRef("sub_po.id", "=", "po.id")
            .where("sub_ph.userIdFk", "=", loggedUserId)
        );
      }

      if (statusParam > 0) {
        if (!Object.values(PaymentStatus).includes(statusParam)) {
          return res
            .status(400)
            .json({ message: "Invalid payment status provided." });
        }

        query.where("p.status", "=", statusParam);
      }
      console.log("statusParam ", statusParam);
      // const totalResult = await query
      //   .select(db.fn.count("p.id").as("total"))
      //   .executeTakeFirst();

      // const totalItems = totalResult?.total
      //   ? parseInt(totalResult.total.toString(), 10)
      //   : 0;
      // const totalPages = Math.ceil(totalItems / pageSize);

      const sellerPayments = await query
        .select([
          "p.id as paymentId",
          "p.purchaseOfferIdFk as purchaseOfferId",
          "p.amountPaid",
          "p.paymentSource",
          "p.paymentReference",
          "p.photoUrl",
          "p.photoUrl2",
          "p.type as paymentType",
          "po.buyerUserIdFk as buyerId",
          "po.status as purchaseOfferStatus",
          "ph.model as itemTitle",
          "ph.id as itemId",
          "p.createdAt",
        ])
        .orderBy("p.createdAt", "desc")
        .limit(pageSize)
        .offset(offset)
        .execute();

      return res.status(200).json({
        currentPage: 0,
        totalPages: 0,
        totalItems: 0,
        pageSize: 0,
        data: sellerPayments,
      });
    } else if (userRoles.includes(UserRolesEnum.Buyer)) {
      const query = db
        .selectFrom("og.payments")
        .innerJoin(
          "og.purchaseOffers",
          "og.payments.purchaseOfferIdFk",
          "og.purchaseOffers.id"
        )
        .leftJoin("og.phones", "og.purchaseOffers.phoneIdFk", "og.phones.id") // Join with og.phones
        .where("og.purchaseOffers.buyerUserIdFk", "=", loggedUserId);

      if (statusParam > 0) {
        if (!Object.values(PaymentStatus).includes(statusParam)) {
          return res
            .status(400)
            .json({ message: "Invalid payment status provided." });
        }
        query.where("og.payments.status", "=", statusParam);
      }

      const buyerPayments = await query
        .select([
          "og.payments.id as paymentId",
          "og.payments.purchaseOfferIdFk as purchaseOfferId",
          "og.payments.amountPaid",
          "og.payments.paymentSource",
          "og.payments.paymentReference",
          "og.payments.photoUrl",
          "og.payments.photoUrl2",
          "og.payments.type as paymentType",
          "og.purchaseOffers.buyerUserIdFk as buyerId",
          "og.purchaseOffers.status as purchaseOfferStatus",
          "og.phones.model as itemTitle", // Directly select from og.phones
          "og.payments.createdAt",
        ])
        .orderBy("og.payments.createdAt", "desc")
        .limit(pageSize)
        .offset(offset)
        .execute();

      //TODO: find products and phones tables
      //         const query = db
      //   .selectFrom("og.payments")
      //   .innerJoin("og.purchaseOffers", "og.payments.purchaseOfferIdFk", "og.purchaseOffers.id")
      //   .leftJoin("og.phones", "og.purchaseOffers.phoneIdFk", "og.phones.id")
      //   .leftJoin("og.products", "og.purchaseOffers.productIdFk", "og.products.id")
      //   .where("og.purchaseOffers.buyerUserIdFk", "=", loggedUserId);
      // // ... (rest of the query)
      // const buyerPayments = await query
      //   .select([
      //     // ... other selections
      //     db.fn.coalesce("og.phones.model", "og.products.title").as("itemTitle"),
      //     // ... other selections
      //   ])
      //   .orderBy("og.payments.createdAt", "desc")
      //   .limit(pageSize)
      //   .offset(offset)
      //   .execute();
      return res.status(200).json({
        currentPage: page,
        totalPages: 0,
        totalItems: 0,
        pageSize: pageSize,
        data: buyerPayments,
      });
    } else if (
      (paymentId > 0 && userRoles.includes(UserRolesEnum.Staff)) ||
      (paymentId > 0 && userRoles.includes(UserRolesEnum.Admin))
    ) {
      // TODO: Implement logic for staff users later
      const payment = await db
        .selectFrom("og.payments as p")
        .innerJoin("og.purchaseOffers as po", "p.purchaseOfferIdFk", "po.id")
        .leftJoin("og.phones as ph", "po.phoneIdFk", "ph.id")
        .select([
          "p.id as paymentId",
          "p.purchaseOfferIdFk as purchaseOfferId",
          "p.amountPaid",
          "p.paymentSource",
          "p.paymentReference",
          "p.photoUrl",
          "p.photoUrl2",
          "p.type as paymentType",
          "po.buyerUserIdFk as buyerId",
          "po.status as purchaseOfferStatus",
          "ph.model as itemTitle",
          "ph.id as itemId",
          "p.createdAt",
        ])
        .where("p.id", "=", paymentId)
        .executeTakeFirst();

      if (payment) {
        return res.status(200).json(payment);
      } else {
        return res.status(404).json({ message: "Payment not found." });
      }
    } else {
      return res
        .status(403)
        .json({ message: "Forbidden - Invalid user role." });
    }
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({
      message: "Failed to fetch payments.",
      error: error.message,
    });
  }
};

// export const getSellerPendingPaymentsController = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const sellerUserId = req.user?.id;
//     if (!sellerUserId) {
//       return res.status(401).json({ message: "Unauthorized." });
//     }

//     const statusParam = Number(req.params.status);
//     const pageParam = req.query.page as string | undefined;
//     const page = parseInt(pageParam || "1", 10);
//     const pageSize = 40;
//     const offset = (page - 1) * pageSize;

//     if (isNaN(page) || page < 1) {
//       return res.status(400).json({ message: "Invalid page number." });
//     }

//     // Validate if the status parameter is a valid PaymentStatus
//     if (!Object.values(PaymentStatus).includes(statusParam)) {
//       return res
//         .status(400)
//         .json({ message: "Invalid payment status provided." });
//     }

//     const paymentStatus = statusParam as PaymentStatus;

//     //Uncomment this to add page number functionality.

//     // Count total number of items
//     // const totalResult = await db
//     //   .selectFrom("og.payments as p")
//     //   .innerJoin("og.purchaseOffers as po", "p.purchaseOfferIdFk", "po.id")
//     //   .leftJoin("og.phones as ph", "po.phoneIdFk", "ph.id")
//     //   .where("p.status", "=", paymentStatus)
//     //   .where("ph.userIdFk", "=", sellerUserId)
//     //   .select(db.fn.count(db.dynamic.ref("p.id")).as("total"))
//     //   .executeTakeFirst();

//     // const totalItems = totalResult?.total
//     //   ? parseInt(totalResult.total.toString(), 10)
//     //   : 0;
//     // const totalPages = Math.ceil(totalItems / pageSize);

//     const sellerPayments = await db
//       .selectFrom("og.payments as p")
//       .innerJoin("og.purchaseOffers as po", "p.purchaseOfferIdFk", "po.id")
//       .leftJoin("og.phones as ph", "po.phoneIdFk", "ph.id")
//       .where("p.status", "=", paymentStatus)
//       .where("ph.userIdFk", "=", sellerUserId)
//       .select([
//         "p.id as paymentId",
//         "p.purchaseOfferIdFk as purchaseOfferId",
//         "p.amountPaid",
//         "p.paymentSource",
//         "p.paymentReference",
//         "p.photoUrl",
//         "p.photoUrl2",
//         "p.type as paymentType",
//         "po.buyerUserIdFk as buyerId",
//         "po.status as purchaseOfferStatus",
//         "ph.model as itemTitle",
//         "ph.id as itemId",
//         "p.createdAt",
//       ])
//       .orderBy("p.createdAt", "desc")
//       .limit(pageSize)
//       .offset(offset)
//       .execute();

//     //TODO add page functionality, currently we don't need this.
//     return res.status(200).json({
//       currentPage: page,
//       totalPages: 0,
//       totalItems: 0,
//       pageSize: 0,
//       data: sellerPayments,
//     });
//   } catch (error: any) {
//     console.error(
//       "Error fetching seller payments by status with pagination:",
//       error
//     );
//     return res.status(500).json({
//       message: "Failed to fetch payments.",
//       error: error.message,
//     });
//   }
// };
