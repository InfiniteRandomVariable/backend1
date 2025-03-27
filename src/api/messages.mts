// backend/src/api/messages.mts

import { Router } from "express";
import { authenticateTokenUserAuth } from "../middleware/authMiddleware.mts";
import {
  createMessageThreadController,
  createMessageCommentController,
  getMessageCommentsController,
} from "../controllers/message.controller.mts"; // We will create this controller next

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

/**
 * @route POST /api/messages/threads/:postId/comments
 * @desc Send a new message (comment) to a thread
 * @access Private (Authenticated Users)
 */
router.post(
  "/threads/:postId/comments",
  authenticateTokenUserAuth,
  createMessageCommentController
);
/**
 * @route GET /api/messages/threads/:postId
 * @desc Get all messages (comments) for a specific thread
 * @access Private (Authenticated Users) - For now, let's keep it authenticated
 */
router.get(
  "/threads/:postId",
  authenticateTokenUserAuth,
  getMessageCommentsController
);
export default router;
