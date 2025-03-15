//path src/db/queries/arbiter.queries.mts

import { db } from "../database.mts"; // Adjust the import path as needed
import { UserStatus } from "../types.mts"; // Assuming you have UserStatus enum
import {
  PROFILE_ALLOWED_SELECT_FIELDS,
  isValidSelectFields,
} from "../../utils/databaseValidators.mjs";

// Define a type for the select parameters

//WARNING, this doesn't support Allias
const defaultSelectFields = [
  "auth.userIdFk",

  // Ratings fields - select only what's needed
  "ratings.lastSeen",
  "ratings.userRating",
  "ratings.arbiterDisputeNum",

  // All profile fields
  "profile.id",
  "profile.arbiterName",
  "profile.chargeFee",
  "profile.intro",
  "profile.lastLoggedIn",
  "profile.overallRating",
  "profile.pinBuyerReview",
  "profile.pinBuyerReviewId",
  "profile.pinSellerReview",
  "profile.pinSellerReviewId",
  "profile.recentBuyerReview",
  "profile.recentBuyerReviewId",
  "profile.recentSellerReview",
  "profile.recentSellerReviewId",
  "profile.totalResolvedDisputes",
];

export const getArbitersWithPagination = async (
  page: number,
  pageSize: number,
  selectFields: string[] = defaultSelectFields
) => {
  try {
    const { ref } = db.dynamic;
    const offset = (page - 1) * pageSize;
    let fieldsToSelect = selectFields || defaultSelectFields;

    if (!isValidSelectFields(selectFields, PROFILE_ALLOWED_SELECT_FIELDS)) {
      console.warn("Invalid select fields provided. Using default fields.");
      throw Error("Invalid select fields provided. Using default fields. 51");
      //fieldsToSelect = defaultSelectFields;
    }

    const arbiters = await db
      .selectFrom("og.authStatus as auth")
      // Join with user ratings
      .innerJoin(
        "og.userRatings as ratings",
        "auth.userIdFk",
        "ratings.userIdFk"
      )
      // Left join with arbiter profiles to include arbiters who may not have complete profiles
      .leftJoin(
        "og.arbiterProfiles as profile",
        "auth.userIdFk",
        "profile.arbiterUserIdFk"
      )
      // Filter conditions
      .where("auth.isArbiter", "=", true)
      .where("auth.userStatus", "=", UserStatus.Normal)
      // Sorting
      .orderBy("ratings.lastSeen", "desc")
      // Pagination
      .offset(offset)
      .limit(pageSize)
      // Select only the needed columns with clear aliases
      .select((eb) =>
        fieldsToSelect.map((field) => {
          return ref(field);
        })
      )
      .execute();

    // Extract the userIdFk values into an array
    // const arbiterUserIds = arbiters.map((arbiter) => arbiter.userIdFk);

    return arbiters;
  } catch (error: any) {
    console.error("Error fetching arbiters with pagination:", error);
    return; // Return an empty array in case of an error
  }
};
