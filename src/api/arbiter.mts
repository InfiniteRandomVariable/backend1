import { Router } from "express";
import { handleCreateArbiterProfile } from "../controllers/arbiter.controller.mjs"; // Controller path might need adjustment
import { UserRolesEnum } from "../db/types.mts";
import { authenticateTokenUserRole } from "../middleware/authMiddleware.mts";
import { authorizeRole } from "../middleware/authorizeMiddleware.mts";
// import { uploadImageS3 } from "../utils/imageManagerS3v1.mjs";
// import { multerMiddleware } from "../middleware/multerMiddleware.mjs";
const router = Router();
/**
 * @route POST /api/arbiter/profiles  <-- Changed route path to /api/arbiter/profiles
 * @desc Create an arbiter profile for a Stripe Identity Verified user.
 * @access Private (Stripe Verified Users)
 */
router.post(
  "/profiles", // <-- Changed route path to /profiles (relative to /api/arbiter)
  authenticateTokenUserRole,
  authorizeRole([UserRolesEnum.BuyerSeller, UserRolesEnum.Arbiter]),
  handleCreateArbiterProfile
);

export default router;
