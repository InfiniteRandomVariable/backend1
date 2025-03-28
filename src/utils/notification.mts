// backend/src/utils/notification.mts
import { sendSMS, sendEmail } from "./sns.mjs"; // Adjust path if needed
import { getUserDetailsList } from "./user.mts"; // Import user details utility
import { NotificationType } from "../db/types.mts";
import { incrementUserNotificationCounter } from "../controllers/notification.controller.mts";
import { isDevEnviroment } from "./commonUtil.mts";
import { OgUserDetails } from "../db/kysely-types";
//import { UserDetails } from "aws-sdk/clients/transfer";

interface PurchaseOfferDetailsForNotification {
  // Interface to hold relevant purchase offer details for notifications
  purchaseOfferId: number;
  phoneIdFk: number;
  buyerPhoneNumber: string | null;
  sellerPhoneNumber: string | null; // Seller phone number is still useful for logging/potential future use, keep it.
  buyerUserIdFk: number;
  sellerUserId: number; // Seller User ID still useful for logging/potential future use, keep it.
}

/**
 * @function sendPurchaseOfferDeletionNotifications
 * @desc Sends SMS notification to buyer when a purchase offer is deleted due to invalid arbiters.
 *       Seller is NOT notified via SMS, but through UI/API response.
 * @param purchaseOfferDetails - Object containing relevant purchase offer details (phone numbers, IDs).
 */
export const sendPurchaseOfferDeletionNotifications = async (
  purchaseOfferDetails: PurchaseOfferDetailsForNotification
): Promise<void> => {
  const deletionMessageBuyer = `Purchase offer ${purchaseOfferDetails.purchaseOfferId} for phone listing ${purchaseOfferDetails.phoneIdFk} has been deleted because seller selected invalid arbiters.`;

  try {
    if (purchaseOfferDetails.buyerPhoneNumber)
      await sendSMS(
        purchaseOfferDetails.buyerPhoneNumber,
        deletionMessageBuyer
      );
    console.log(
      `SMS notification sent to buyer for offer deletion ${purchaseOfferDetails.purchaseOfferId}. Seller will be notified via UI.`
    ); // Updated log message
  } catch (smsError) {
    console.error("SMS notification error (deletion - buyer):", smsError); // More specific error log
  }
};

/**
 * @function sendPurchaseOfferAcceptanceNotifications
 * @desc Sends SMS notifications to buyer and agreed arbiters when a purchase offer is accepted.
 *       Seller is NOT notified via SMS, but through UI/API response.
 * @param purchaseOfferDetails - Object containing relevant purchase offer details.
 * @param selectedArbiterIds - Array of User IDs of the selected arbiters.
 */
export const sendPurchaseOfferAcceptanceNotifications = async (
  purchaseOfferDetails: PurchaseOfferDetailsForNotification,
  selectedArbiterIds: number[]
): Promise<void> => {
  const acceptanceMessageBuyer = `Purchase offer ${purchaseOfferDetails.purchaseOfferId} for phone listing ${purchaseOfferDetails.phoneIdFk} has been accepted by seller. Proceed with payment.`;
  const acceptanceMessageArbiter = (arbiterId: number) =>
    `You have been selected as an arbiter for purchase offer ${purchaseOfferDetails.purchaseOfferId}. Please monitor for disputes.`;

  // Fetch phone numbers of agreed arbiters using getUserDetailsList
  const arbiterDetails = await getUserDetailsList(selectedArbiterIds);
  const agreedArbiterPhoneNumbers = arbiterDetails
    .map((detail) => detail.phone)
    .filter((pn) => pn !== null) as string[]; // Filter out null phone numbers

  try {
    if (purchaseOfferDetails.buyerPhoneNumber)
      await sendSMS(
        purchaseOfferDetails.buyerPhoneNumber,
        acceptanceMessageBuyer
      );
    for (const phoneNumber of agreedArbiterPhoneNumbers) {
      await sendSMS(phoneNumber, acceptanceMessageArbiter(0)); //TODO: Arbiter ID should be added here if relevant to message, currently placeholder
    }
    console.log(
      `SMS notifications sent to buyer and arbiters for offer acceptance ${purchaseOfferDetails.purchaseOfferId}. Seller will be notified via UI.`
    ); // Updated log message
  } catch (smsError) {
    console.error(
      "SMS notification error (acceptance - buyer/arbiters):",
      smsError
    ); // More specific error log
  }
};

/**
 * @function sendPurchaseOfferRejectionNotifications
 * @desc Sends SMS notification to buyer when a purchase offer is rejected.
 *       Seller is NOT notified via SMS, but through UI/API response.
 * @param purchaseOfferDetails - Object containing relevant purchase offer details.
 */
export const sendPurchaseOfferRejectionNotifications = async (
  purchaseOfferDetails: PurchaseOfferDetailsForNotification
): Promise<void> => {
  const rejectionMessageBuyer = `Purchase offer ${purchaseOfferDetails.purchaseOfferId} for phone listing ${purchaseOfferDetails.phoneIdFk} has been rejected by the seller.`;
  const buyerPhoneNumber = purchaseOfferDetails.buyerPhoneNumber; // Get buyer phone number

  try {
    if (buyerPhoneNumber)
      await sendSMS(buyerPhoneNumber, rejectionMessageBuyer);
    console.log(
      `SMS notification sent to buyer for offer rejection ${purchaseOfferDetails.purchaseOfferId}. Seller will be notified via UI.`
    ); // Updated log message
  } catch (smsError) {
    console.error("SMS notification error (rejection - buyer):", smsError); // More specific error log
  }
};
export const sendGenericNotifications = async (
  receiverUserIdFk: number,
  notificationSubject: string,
  notificationMessage: string,
  internalNotificationType: NotificationType, // Pass the specific notification type
  receiverDetails: OgUserDetails | null = null
) => {
  try {
    const shouldUseReceiveDetails =
      receiverDetails !== null &&
      receiverDetails.email &&
      receiverDetails.phone;

    const recipientDetailsArray = shouldUseReceiveDetails
      ? Array(receiverDetails)
      : await getUserDetailsList([receiverUserIdFk]);

    if (recipientDetailsArray && recipientDetailsArray.length > 0) {
      const recipientDetails = recipientDetailsArray[0];

      const smsMessage = `${notificationMessage} theBestUsedPhones.com`;
      const emailSubject = notificationSubject;
      const emailBody = `${notificationMessage}\n\nView details here: theBestUsedPhones.com\n\nBest regards,\nThe Best Used Phones Team`; // Removed uName from the greeting

      if (recipientDetails.phone) {
        await sendSMS(recipientDetails.phone, smsMessage);
      } else {
        console.log(
          `Recipient ${receiverUserIdFk} has no phone number for SMS.`
        );
      }

      if (recipientDetails.email) {
        await sendEmail(recipientDetails.email, emailSubject, emailBody);
        console.log(
          `Email notification sent to ${recipientDetails.email} for: ${notificationSubject}`
        );
      } else {
        console.log(
          `Recipient ${receiverUserIdFk} has no email for email notification.`
        );
      }

      await incrementUserNotificationCounter(
        receiverUserIdFk,
        internalNotificationType
      );
    } else {
      console.warn(
        `Recipient user details not found for ID: ${receiverUserIdFk}`
      );
    }
  } catch (error: any) {
    console.error("Error sending generic notifications:", error);
  }
};
