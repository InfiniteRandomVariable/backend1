// backend/src/api/listings.mts
import { Router } from "express";
import {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing,
  shuffleImages,
  uploadMoreImages,
  deleteImagesAPI,
  getListingBySellerId,
} from "../controllers/listing.controller.mts";
import { multerMiddleware } from "../middleware/multerMiddleware.mjs";
import { uploadImageS3 } from "../utils/imageManagerS3v1.mjs";
import { UserRolesEnum } from "../db/types.mts";
import {
  authorizeRole,
  authenticateTokenUserAuth,
} from "../middleware/authMiddleware.mts";
const router = Router();

router.post(
  "/",
  authenticateTokenUserAuth,
  authorizeRole([UserRolesEnum.Seller]),
  multerMiddleware,
  uploadImageS3,
  createListing
);
router.get("/", getAllListings);
router.get("/:id", getListingById);
router.get("/seller/:sellerId", getListingBySellerId);
router.put(
  "/:id",
  authenticateTokenUserAuth,
  authorizeRole([
    UserRolesEnum.Admin,
    UserRolesEnum.Seller,
    UserRolesEnum.Staff,
  ]),
  updateListing
);
router.delete(
  "/:id",
  authenticateTokenUserAuth,
  authorizeRole([
    UserRolesEnum.Admin,
    UserRolesEnum.Seller,
    UserRolesEnum.Staff,
  ]),
  deleteListing
); // Admin only

// {
//     "phoneId": 123,
//     "photoUrls": [
//       "https://your-s3-bucket.s3.amazonaws.com/listings/image3.jpg",
//       "https://your-s3-bucket.s3.amazonaws.com/listings/image1.jpg",
//       "https://your-s3-bucket.s3.amazonaws.com/listings/image2.jpg"
//     ],
//     "coverPhotoUrl": "https://your-s3-bucket.s3.amazonaws.com/listings/image3.jpg"
//   }
router.put(
  "/shuffle-cover",
  authenticateTokenUserAuth,
  authorizeRole([UserRolesEnum.Seller]),
  multerMiddleware,
  shuffleImages
);
router.post(
  "/images",
  authenticateTokenUserAuth,
  authorizeRole([UserRolesEnum.Seller, UserRolesEnum.Arbiter]),
  multerMiddleware,
  uploadImageS3,
  uploadMoreImages
);

// {
//     "urls": [
//       "https://your-s3-bucket.s3.amazonaws.com/listings/1678886400000-image1.jpg",
//       "https://your-s3-bucket.s3.amazonaws.com/listings/1678886400001-image2.jpg"
//     ],
//     "phoneId": 123
//   }
router.delete(
  "/images",
  authenticateTokenUserAuth,
  authorizeRole([
    UserRolesEnum.Seller,
    UserRolesEnum.Admin,
    UserRolesEnum.Arbiter,
    UserRolesEnum.Staff,
  ]),
  multerMiddleware,
  deleteImagesAPI
); // Add the new route

export default router;
