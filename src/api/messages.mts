import { Router } from "express";
import { authenticateTokenUserAuth } from "../middleware/authMiddleware.mts";
import { createMessageThreadController } from "../controllers/message.controller.mts"; // We will create this controller next

const router = Router();

/**
 * @route POST /api/messages/threads
 * @desc Initiate a new message thread
 * @access Private (Authenticated Users)
 */
router.post(
  "/threads",
  authenticateTokenUserAuth,
  createMessageThreadController
);

export default router;
