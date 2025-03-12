// src/controllers/notification.controller.mts
import { db } from "../db/database.mts"; // Import your Kysely database instance
import { NotificationType } from "../db/types.mts";
import { OgUserNotifications } from "../db/kysely-types"; // Import OgUserNotifications interface

// Define the NotificationType enum for valid notification columns

/**
 * Core reusable function to update a specific notification counter in OgUserNotifications table.
 * Creates a record if one doesn't exist for the userIdFk.
 *
 * @param {number} userIdFk - The User ID to update.
 * @param {NotificationType} notificationType - The notification type column to update.
 * @param {number} newValue - The new value to set for the notification counter.
 * @returns {Promise<OgUserNotifications>} - A promise that resolves to the updated OgUserNotifications record.
 * @throws {Error} - Throws an error if database operation fails.
 */
const updateUserNotification = async (
  userIdFk: number,
  notificationType: NotificationType,
  newValue: number
): Promise<OgUserNotifications> => {
  try {
    // 1. Check if a notification record exists for the userIdFk
    const existingNotification = await db
      .selectFrom("og.userNotifications")
      .selectAll()
      .where("userIdFk", "=", userIdFk)
      .executeTakeFirst();

    let updatedNotification: OgUserNotifications;

    if (existingNotification) {
      // 2. If record exists, update ONLY the specified notificationType counter to newValue, leave others unchanged
      updatedNotification = await db
        .updateTable("og.userNotifications")
        .set({ [notificationType]: newValue } as Partial<OgUserNotifications>) // Dynamically set the notification column
        .where("userIdFk", "=", userIdFk)
        .returningAll()
        .executeTakeFirstOrThrow();
    } else {
      // 3. If no record exists, create a new record and initialize ALL counters to 0, then set the specified notificationType to newValue
      const newNotificationData = {
        userIdFk: userIdFk,
        [notificationType]: newValue, // Dynamically set the initial count for notificationType to newValue
      };

      updatedNotification = await db
        .insertInto("og.userNotifications")
        .values(newNotificationData)
        .returningAll()
        .executeTakeFirstOrThrow();
    }
    return updatedNotification;
  } catch (dbError) {
    console.error(
      `Database error updating user notification counter for type '${notificationType}':`,
      dbError
    );
    throw new Error(
      `Failed to update user notification counter for type '${notificationType}' in the database.`
    );
  }
};

/**
 * Reusable function to reset a specific notification counter to zero in OgUserNotifications.
 *
 * @param {number} userIdFk - The User ID for whom to reset the counter.
 * @param {NotificationType} notificationType - The notification type column to reset.
 * @returns {Promise<OgUserNotifications>} - A promise that resolves to the updated OgUserNotifications record.
 * @throws {Error} - Throws error if update fails.
 */
const resetUserNotificationCounter = async (
  userIdFk: number,
  notificationType: NotificationType
): Promise<OgUserNotifications> => {
  return updateUserNotification(userIdFk, notificationType, 0); // Use updateUserNotification to set value to 0
};

/**
 * Reusable function to increment a specific notification counter by one in OgUserNotifications.
 *
 * @param {number} userIdFk - The User ID for whom to increment the counter.
 * @param {NotificationType} notificationType - The notification type column to increment.
 * @returns {Promise<OgUserNotifications>} - A promise that resolves to the updated OgUserNotifications record.
 * @throws {Error} - Throws error if update fails.
 */
const incrementUserNotificationCounter = async (
  userIdFk: number,
  notificationType: NotificationType
): Promise<OgUserNotifications> => {
  try {
    // 1. Get the current value of the notification counter
    const existingNotification = await db
      .selectFrom("og.userNotifications")
      .select([notificationType]) // Select only the specific notificationType column
      .where("userIdFk", "=", userIdFk)
      .executeTakeFirst();

    const currentCount =
      (existingNotification?.[notificationType] as number) || 0; // Default to 0 if no record or value is null
    const incrementedCount = currentCount + 1;

    // 2. Use updateUserNotification to set the incremented value
    return updateUserNotification(userIdFk, notificationType, incrementedCount);
  } catch (error) {
    console.error(
      `Error getting current notification count for increment:`,
      error
    );
    throw new Error(
      `Failed to increment user notification counter for type '${notificationType}'.`
    );
  }
};

export {
  updateUserNotification,
  resetUserNotificationCounter,
  incrementUserNotificationCounter,
};
