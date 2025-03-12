// backend/src/db/queries/authStatus.queries.mjs (You can create a new file for authStatus related DB queries)
import { db } from "../database.mts";
import { OgAuthStatus } from "../kysely-types";

export const updateUserAuthStatusInDatabase = async (
  userId: number,
  updatePayload: { isSeller?: boolean | null; isArbiter?: boolean | null }
): Promise<OgAuthStatus | undefined> => {
  try {
    const updatedAuthStatus = await db
      .updateTable("og.authStatus")
      .set(updatePayload)
      .where("userIdFk", "=", userId)
      .returningAll()
      .executeTakeFirst();

    return updatedAuthStatus as OgAuthStatus | undefined; // Returns updated OgAuthStatus or undefined if not found
  } catch (error) {
    console.error("Error updating auth status in database:", error);
    throw new Error("Database error updating auth status."); // Re-throw a generic error for controller to handle
  }
};
