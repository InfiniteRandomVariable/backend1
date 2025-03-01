// backend/src/api/users.mts
import { Router } from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  getAllUsers,
  deleteUser,
} from "../controllers/user.controller.mts";
const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authenticateToken, getUserProfile);

//Admin routes
router.get("/all", authenticateToken, authorizeRole([4]), getAllUsers);
router.delete("/:id", authenticateToken, authorizeRole([4]), deleteUser);

export default router;
