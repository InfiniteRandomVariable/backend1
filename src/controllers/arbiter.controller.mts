// src/controllers/arbiter.controller.ts (Updated)
import { Request, Response } from "express";
import { arbiterProfileSchema } from "../db/zod/types.zod.mjs";
import { db } from "../db/database.mts";
import { UserStatus } from "../db/types.mjs";
declare global {
  // {{ edit_1 }}
  namespace Express {
    // {{ edit_1 }}
    interface Request {
      // {{ edit_1 }}
      user?: any; // {{ edit_1 }}
    } // {{ edit_1 }}
  } // {{ edit_1 }}
} // {{ edit_1 }}

export const handleCreateArbiterProfile = async (
  req: Request,
  res: Response
) => {
  let action = "created";

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized: Missing or invalid user information.",
      });
    }
    const userId = req.user.id;

    const arbiterProfileData = arbiterProfileSchema.parse(req.body);

    // 1. Check if Arbiter Profile already exists for this user AND fetch existing profile data:
    const existingProfile = await db
      .selectFrom("og.arbiterProfiles")
      .where("og.arbiterProfiles.arbiterUserIdFk", "=", userId)
      .selectAll() // Select all columns to compare with new data
      .executeTakeFirst();

    let arbiterProfileId: number;

    if (existingProfile) {
      // 2.a. Compare New Data with Existing Profile and Update if Different (excluding review fields)
      action = "updated";

      // Define fields to EXCLUDE from updates (review-related and rating fields)
      const excludedUpdateFields = [
        "pinSellerReviewId",
        "recentSellerReviewId",
        "recentBuyerReviewId",
        "recentSellerReview",
        "recentBuyerReview",
        "overallRating",
        "totalResolvedDisputes", // Added totalResolvedDisputes as it might be review-related
        "pinBuyerReviewId",
        "pinBuyerReview",
        // ... add other review/rating related fields from OgArbiterProfiles that should NOT be updated via this API ...
      ];

      // Create a payload with only fields that are allowed to be updated and are actually different
      const updatePayload: Partial<any> = {};
      let hasUpdates = false; // Flag to track if there are any updates to perform

      for (const key of Object.keys(
        arbiterProfileData
      ) as (keyof typeof arbiterProfileData)[]) {
        if (excludedUpdateFields.includes(key as string)) {
          continue; // Skip excluded fields
        }
        const newValue =
          arbiterProfileData[key as keyof typeof arbiterProfileData];
        const oldValue = existingProfile[key as keyof typeof existingProfile]; // existingProfile is of type OgArbiterProfiles

        if (newValue !== oldValue) {
          // Compare new value with old value

          updatePayload[key] = newValue as any; // Add to update payload if different (type assertion needed as we are iterating over keys)
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        await db
          .updateTable("og.arbiterProfiles")
          .set({
            ...updatePayload,
          })
          .where("arbiterUserIdFk", "=", userId)
          .execute();
      } else {
        action = "no_update"; // If no actual updates, set action to "no_update"
      }

      arbiterProfileId = existingProfile.id;
    } else {
      // 2.b. Create New Arbiter Profile (same as before)
      const newArbiterProfile = await db
        .insertInto("og.arbiterProfiles")
        .values({
          ...arbiterProfileData,
          arbiterUserIdFk: userId,
          lastLoggedIn: new Date(),
          status: UserStatus.Normal,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      arbiterProfileId = newArbiterProfile.id;
    }

    // 3. Ensure User's isArbiter status is TRUE (Idempotent) - No change needed here

    // 4. Success Response:
    let message = `Arbiter profile ${action} successfully.`;
    let statusCode = 200; // Default to 200 OK for updates or no updates
    if (action === "created") {
      statusCode = 201; // 201 Created for new profile
    } else if (action === "no_update") {
      message = "No arbiter profile updates needed as data is the same."; // Specific message for no updates
    }

    res.status(statusCode).json({
      message: message,
      arbiterProfileId: arbiterProfileId,
    });
  } catch (error: any) {
    console.error(`Error ${action} arbiter profile:`, error);
    res.status(500).json({
      message: `Failed to ${action} arbiter profile`,
      error: error.message,
    });
  }
};
