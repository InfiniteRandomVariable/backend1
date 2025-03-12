import { db } from "../database.mts";
import { ListingAndSellerInfo } from "../types.mts";

/**
 * Reusable function to fetch listing and seller information based on phoneId.
 *
 * @param {number} phoneId - The ID of the phone listing (phoneIdFk).
 * @returns {Promise<ListingAndSellerInfo | undefined>} - A promise that resolves to listing and seller info, or undefined if not found.
 * @throws {Error} - Throws an error if database query fails.
 */
export const getListingAndSellerDetails = async (
  phoneId: number
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
      .where("phones.status", "=", 1)
      .executeTakeFirst();

    return listingAndSellerInfo as ListingAndSellerInfo; // Type assertion to ListingAndSellerInfo
  } catch (dbError) {
    console.error("Database error fetching listing and seller info:", dbError);
    throw new Error(
      "Failed to fetch listing and seller information from the database."
    );
  }
};
