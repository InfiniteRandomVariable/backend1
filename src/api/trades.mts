// src/api/trades.mts  <-- Corrected file path
import { Router } from "express";
import { handleReviewPurchaseOffer } from "../controllers/seller.controller.mts"; // Adjust path if needed, likely "../controllers/seller.controller.mts" is correct if 'controllers' is sibling to 'api'
import { validateRequest } from "../middleware/validateRequest.mts"; // Adjust path if needed, likely "../middleware/validateRequest.mts" is correct if 'middleware' is sibling to 'api'
import { ReviewPurchaseOfferRequestSchema } from "../db/zod/types.zod.mjs"; // Adjust path if needed, likely "../db/zod/types.zod.mjs" is correct if 'db' is sibling to 'api'
import {
  makePurchaseOfferController,
  getCurrentPurchaseOffers,
} from "../controllers/trade.controller.mts"; //
import {
  authorizeRole,
  authenticateTokenUserAuth,
} from "../middleware/authMiddleware.mts";
import { UserRolesEnum } from "../db/types.mts"; // Adjust path if needed, likely "../db/types.mts" is correct if 'db' is sibling to 'api'

const router = Router();

/**
 * @route POST /api/trades/offers/:purchaseOfferId/review
 * @desc Seller reviews a purchase offer (accept/reject)
 * @access Private (Seller Users)
 */
// router.post(
//   "/offers/:purchaseOfferId/review",
//   authenticateTokenUserRole,
//   authorizeRole([UserRolesEnum.Seller]),
//   validateRequest(ReviewPurchaseOfferRequestSchema),
//   handleReviewPurchaseOffer
// );
router.post(
  "/decideoffer/:purchaseOfferId",
  authenticateTokenUserAuth,
  authorizeRole([UserRolesEnum.Seller]),
  handleReviewPurchaseOffer
);
///api/offers/purchaseoffers/current?status=2
router.get(
  "/purchaseoffers/current",
  authenticateTokenUserAuth,
  authorizeRole([UserRolesEnum.Seller, UserRolesEnum.Buyer]),
  getCurrentPurchaseOffers
);

router.post(
  "/purchaseoffer/make", // Path is just "/", relative to "/api/offers" as defined when you mount this router
  authenticateTokenUserAuth, // Protect this route, only authenticated users can make offers // Validate the incoming request body against the schema
  makePurchaseOfferController // Controller function to handle the actual offer creation logic
);
// Add other routes related to trades or purchase offers below this line

export default router;
