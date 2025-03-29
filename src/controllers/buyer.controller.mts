// src/controllers/seller.controller.mts
import { Request, Response } from "express";
import { db } from "../db/database.mts";
import { extractUserInfo } from "../utils/auth.mts";
import { containsAnyUserRoles } from "../utils/commonUtil.mjs";
import { UserRolesEnum } from "../db/types.mjs";

export const getBuyerPaymentsController = async (
  req: Request,
  res: Response
) => {
  try {
    let userId = 0;
    const user = extractUserInfo(req);
    console.log("User ", user);
    if (user.userRoles.includes(UserRolesEnum.Buyer)) {
      userId = user.userId;
      console.log("Buyer User ", userId);
    } else if (
      Number(req.params.buyerId) > 0 &&
      containsAnyUserRoles(user.userRoles, [
        UserRolesEnum.Staff,
        UserRolesEnum.Admin,
      ])
    ) {
      userId = Number(req.params.buyerId);

      console.log("Buyer User (Staff/Admin View) ", userId);
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
      .where("og.purchaseOffers.buyerUserIdFk", "=", userId)
      .selectAll("og.payments") // Select all columns from og.payments
      .select([
        "og.phones.id as phoneId",
        "og.products.id as productId",
        "og.phones.model as phoneModel",
        "og.phones.coverPhotoUrl as phoneUrl",
        "og.products.title as productTitle",
        "og.products.coverPhotoUrl as productUrl",
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

    return res.status(200).json({
      result,
      totalCount,
      currentPage: page,
      totalPages,
    });
  } catch (error: any) {
    console.error("Error fetching buyer payments:", error);
    return res.status(500).json({
      message: "Failed to fetch payment records.",
      error: error.message,
    });
  }
};
