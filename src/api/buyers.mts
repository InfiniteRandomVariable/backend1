// backend/src/api/sellers.mts
import { Router } from "express";
import { getBuyerPaymentsController } from "../controllers/buyer.controller.mjs"; // Adjust the path to your payment controller
import {
  authenticateTokenUserAuth,
  authorizeRole,
} from "../middleware/authMiddleware.mts"; // Adjust the path to your auth middleware
import { UserRolesEnum } from "../db/types.mts";
// import { multerMiddleware } from "../middleware/multerMiddleware.mjs";
// import { uploadImageS3 } from "../utils/imageManagerS3v1.mjs";
const router = Router();

/**
 * @route POST /api/payments/purchaseoffers/:purchaseOfferId/initiate-payment
 * @desc Buyer submits payment proof for a purchase offer
 * @access Private (Authenticated Buyer)
 */

router.get(
  "/payments/:buyerId",
  authenticateTokenUserAuth,
  authorizeRole([
    UserRolesEnum.Buyer,
    UserRolesEnum.Staff,
    UserRolesEnum.Admin,
  ]),
  getBuyerPaymentsController
);

export default router;
