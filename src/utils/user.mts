import { db } from "../db/database.mts";
import { getPhoneModelName } from "../utils/phoneModelInterpreter.mts";
import { isDevEnviroment } from "./commonUtil.mts";
import { OgUserDetails } from "../db/kysely-types";
// export interface UserDetails {
//   userIdFk: number;
//   phoneNumber: string | null;
//   email: string | null;
// }

/**
 * @function getUserDetailsList
 * @desc Retrieves details (including phone numbers) for a list of user IDs from the OgUserDetails table.
 * @param userIds An array of user IDs to fetch details for.
 * @returns Promise<UserDetails[]> A promise that resolves to an array of UserDetails objects,
 *          or an empty array if no users are found for the given IDs.
 */
export const getUserDetailsList = async (
  userIds: number[]
): Promise<OgUserDetails[]> => {
  if (!userIds || userIds.length === 0) {
    return []; // Return empty array if no user IDs are provided
  }

  const userDetailsList = await db
    .selectFrom("og.userDetails") // Use your actual OgUserDetails table name here if different
    .where("og.userDetails.userIdFk", "in", userIds)
    .selectAll()
    .$castTo<OgUserDetails>() // Cast the result to the UserDetails interface
    .execute();

  return userDetailsList;
};

export const getSellerDetailsFromPurchaseOffer = async (
  purchaseOfferId: number
): Promise<{
  userPhoneNumber: string;
  modelNum: number | null;
  userId: number;
  buyerUserId: number;
  purchaseStatus: number;
  productName: string | null;
  modelName: string | null;
}> => {
  try {
    const purchaseOffer = await db
      .selectFrom("og.purchaseOffers")
      .where("id", "=", purchaseOfferId)
      .select(["phoneIdFk", "productIdFk", "buyerUserIdFk", "status"])
      .executeTakeFirst();

    if (!purchaseOffer) {
      throw Error("invalid purchaseOffer 46");
    }

    const {
      phoneIdFk: phoneIdFk,
      buyerUserIdFk: buyerUserIdFk,
      status: purchaseStatus,
    } = purchaseOffer;

    if (Number.isNaN(buyerUserIdFk)) {
      throw Error("Invalid userId getSellerDetailsFromPurchaseOffer 54");
    }
    let userPhoneNumber: string;
    let modelNum: number;
    let userId: number;
    if (phoneIdFk && phoneIdFk > 0) {
      const phoneDetails = await db
        .selectFrom("og.phones")
        .where("id", "=", phoneIdFk)
        .innerJoin(
          "og.userDetails",
          "og.phones.userIdFk",
          "og.userDetails.userIdFk"
        )
        .select([
          "og.userDetails.phone as phoneNum",
          "og.userDetails.userIdFk as userId",
          "og.phones.model as phoneModel",
        ])
        .executeTakeFirst();

      console.log("phoneDetails ", phoneDetails);

      if (!phoneDetails || Number.isNaN(phoneDetails.userId)) {
        throw Error("invalid userId 67 for phone details");
      }
      const { phoneNum } = phoneDetails;
      const fakeNumber = "2334343";
      let userPhoneNumber: string;

      if (typeof phoneNum === "string") {
        userPhoneNumber = phoneNum;
      } else if (isDevEnviroment()) {
        userPhoneNumber = fakeNumber;
      } else {
        throw Error(
          "Phone number is not a string in a non-development environment."
        );
      }

      if (Number.isNaN(purchaseStatus) || purchaseStatus == null) {
        throw Error("invalid userId 89 for purchaseStatus is null");
      }

      userId = phoneDetails.userId;
      modelNum = phoneDetails.phoneModel;

      const modelName = getPhoneModelName(modelNum);
      return {
        userPhoneNumber: userPhoneNumber,
        modelNum: modelNum,
        userId: userId,
        buyerUserId: buyerUserIdFk,
        purchaseStatus: purchaseStatus,
        productName: null,
        modelName: modelName,
      };
    } else if (purchaseOffer.productIdFk && purchaseOffer.productIdFk > 0) {
      //TODO
      throw Error("invalid userId 88 for phone details");
    } else {
      throw Error("invalid userId 90 for phone details");
    }
  } catch (error) {
    console.error("Error fetching seller details:", error);
    throw Error("invalid getSellerDetailsFromPurchaseOffer 91 ");
  }
};
