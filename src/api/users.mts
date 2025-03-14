// backend/src/api/users.mts
import { Router } from "express";
//import { authorize } from "../middleware/authorizeMiddleware.mts";
import { UserRolesEnum } from "../db/types.mts";
import {
  authorizeRole,
  authenticateTokenUserAuth,
} from "../middleware/authMiddleware.mts";
import {
  registerUser,
  loginUser,
  getUserProfile,
  deleteUser,
  getAllUsers,
} from "../controllers/user.controller.mts";
const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authenticateTokenUserAuth, getUserProfile);

// router.get(
//   "/profile2",
//   (req, res, next) => {
//     console.log("Hit profile route");
//     next();
//   },
//   authenticateTokenUserRole,
//   getUserProfile
// );
//Admin routes
//router.get("/all", authenticateTokenUserRole, authorizeRole([4]), getAllUsers);
router.delete(
  "/:id",
  authenticateTokenUserAuth,
  authorizeRole([UserRolesEnum.Admin]),
  deleteUser
);
router.get(
  "/all",
  authenticateTokenUserAuth,
  authorizeRole([UserRolesEnum.Admin]),
  getAllUsers
);
export default router;
