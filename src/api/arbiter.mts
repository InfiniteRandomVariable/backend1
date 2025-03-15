//src/api/arbiter.ts
import { Router } from "express";
import { handleCreateArbiterProfile } from "../controllers/arbiter.controller.mjs"; // Controller path might need adjustment
import { UserRolesEnum } from "../db/types.mts";
import {
  authorizeRole,
  authenticateTokenUserAuth,
} from "../middleware/authMiddleware.mts";
import { uploadImageS3 } from "../utils/imageManagerS3v1.mjs";
import { multerMiddleware } from "../middleware/multerMiddleware.mjs";
import { getPaginatedArbiters } from "../controllers/arbiter.controller.mts";
const router = Router();
/**
 * @route POST /api/arbiter/profiles  <-- Changed route path to /api/arbiter/profiles
 * @desc Create an arbiter profile for a Stripe Identity Verified user.
 * @access Private (Stripe Verified Users)
 */
router.post(
  "/profiles", // <-- Changed route path to /profiles (relative to /api/arbiter)
  authenticateTokenUserAuth,
  authorizeRole([
    UserRolesEnum.Buyer,
    UserRolesEnum.Seller,
    UserRolesEnum.Arbiter,
  ]),
  handleCreateArbiterProfile
);

router.get("/paginated", getPaginatedArbiters);

export default router;
