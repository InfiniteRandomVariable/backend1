import { db } from "../db/database.mts";
interface UserDetails {
  userIdFk: number;
  phoneNumber: string | null;
}

/**
 * @function getUserDetailsList
 * @desc Retrieves details (including phone numbers) for a list of user IDs from the OgUserDetails table.
 * @param userIds An array of user IDs to fetch details for.
 * @returns Promise<UserDetails[]> A promise that resolves to an array of UserDetails objects,
 *          or an empty array if no users are found for the given IDs.
 */
export const getUserDetailsList = async (
  userIds: number[]
): Promise<UserDetails[]> => {
  if (!userIds || userIds.length === 0) {
    return []; // Return empty array if no user IDs are provided
  }

  const userDetailsList = await db
    .selectFrom("og.userDetails") // Use your actual OgUserDetails table name here if different
    .where("og.userDetails.userIdFk", "in", userIds)
    .selectAll()
    .$castTo<UserDetails>() // Cast the result to the UserDetails interface
    .execute();

  return userDetailsList;
};
