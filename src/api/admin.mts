// backend/src/api/admin.mts (or your admin routes file)
import express from "express";
import { updateUserAuthStatusByAdmin } from "../controllers/admin.controller.mts";
import {
  authorizeRole,
  authenticateTokenUserAuth,
} from "../middleware/authMiddleware.mts";
import { UserRoles } from "../db/types.mts";

const router = express.Router();

// PUT /api/admin/users/:userId/auth-status
// router.put("/users/:userId/auth-status", updateUserAuthStatusByAdmin);
router.put(
  "/users/auth-status",
  authenticateTokenUserAuth,
  updateUserAuthStatusByAdmin
);

export default router;
