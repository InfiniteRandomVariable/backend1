//path src/db/queries/user.queries.mts

import { db } from "../database.mts";
import { ListingAndSellerInfo, ProductStatus } from "../types.mts";

export const updateLastSeen = async (userId: number) => {
  try {
    // 1. Fetch the current lastSeen timestamp for the user
    const userRating = await db
      .selectFrom("og.userRatings")
      .select(["lastSeen"])
      .where("userIdFk", "=", userId)
      .executeTakeFirst();

    if (userRating && userRating.lastSeen) {
      const lastSeenTime = new Date(userRating.lastSeen);
      const currentTime = new Date();
      const timeDifferenceInHours =
        (currentTime.getTime() - lastSeenTime.getTime()) / (1000 * 60 * 60); // milliseconds to hours

      // 2. Check if the time difference is greater than 12 hours
      if (timeDifferenceInHours >= 12) {
        // 3. Update the lastSeen timestamp in the database
        await db
          .updateTable("og.userRatings")
          .set({ lastSeen: currentTime })
          .where("userIdFk", "=", userId)
          .execute();
        console.log(`Updated lastSeen for user ${userId}`);
      } else {
        console.log(
          `Last seen for user ${userId} was less than 12 hours ago, skipping update.`
        );
      }
    } else {
      const errorMessage = `userRatings row not found for user ID: ${userId} during login.`;
      console.error(errorMessage); // Log the error for investigation
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error(`Error updating lastSeen for user ${userId}:`, error);
    // You might want to log this error or handle it in a more specific way
  }
};
/**
 * Reusable function to fetch listing and seller information based on phoneId.
 *
 * @param {number} phoneId - The ID of the phone listing (phoneIdFk).
 * @returns {Promise<ListingAndSellerInfo | undefined>} - A promise that resolves to listing and seller info, or undefined if not found.
 * @throws {Error} - Throws an error if database query fails.
 */
export const getListingAndSellerDetails = async (
  phoneId: number,
  productStatus: ProductStatus
): Promise<ListingAndSellerInfo | undefined> => {
  try {
    const listingAndSellerInfo = await db
      .selectFrom("og.phones as phones")
      .innerJoin(
        "og.userDetails as userDetails",
        "phones.userIdFk",
        "userDetails.userIdFk"
      )
      .select([
        "phones.id",
        "phones.status",
        "phones.userIdFk as sellerUserIdFk",
        "userDetails.phone as sellerPhone",
      ])
      .where("phones.id", "=", phoneId)
      .where("phones.status", "=", productStatus)
      .executeTakeFirst();

    return listingAndSellerInfo as ListingAndSellerInfo; // Type assertion to ListingAndSellerInfo
  } catch (dbError) {
    console.error("Database error fetching listing and seller info:", dbError);
    throw new Error(
      "Failed to fetch listing and seller information from the database."
    );
  }
};
