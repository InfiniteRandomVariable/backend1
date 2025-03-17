import { Router } from "express";
import {
  initiatePaymentController,
  getPaymentsController,
} from "../controllers/payment.controller.mts"; // Adjust the path to your payment controller
import {
  authenticateTokenUserAuth,
  authorizeRole,
} from "../middleware/authMiddleware.mts"; // Adjust the path to your auth middleware
import { UserRolesEnum } from "../db/types.mts";
import { multerMiddleware } from "../middleware/multerMiddleware.mjs";
import { uploadImageS3 } from "../utils/imageManagerS3v1.mjs";
const router = Router();

/**
 * @route POST /api/payments/purchaseoffers/:purchaseOfferId/initiate-payment
 * @desc Buyer submits payment proof for a purchase offer
 * @access Private (Authenticated Buyer)
 */
router.post(
  "/:purchaseOfferId/initiate-payment",
  authenticateTokenUserAuth,
  authorizeRole([UserRolesEnum.Buyer]),
  multerMiddleware,
  uploadImageS3,
  initiatePaymentController
);

router.get(
  "/:status",
  authenticateTokenUserAuth,
  authorizeRole([
    UserRolesEnum.Buyer,
    UserRolesEnum.Seller,
    UserRolesEnum.Staff,
    UserRolesEnum.Admin,
  ]),
  getPaymentsController
);

export default router;
