export const PROFILE_ALLOWED_SELECT_FIELDS = new Set([
  "auth.userIdFk",
  "ratings.lastSeen",
  "ratings.userRating",
  "ratings.arbiterDisputeNum",
  "profile.id",
  "profile.arbiterName",
  "profile.chargeFee",
  "profile.country",
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
  "profile.status",
  "profile.totalResolvedDisputes",
]);

export const isValidSelectFields = (
  fieldsToValidate: string[] | undefined,
  allowedFields: Set<string>
): boolean => {
  if (
    !fieldsToValidate ||
    !Array.isArray(fieldsToValidate) ||
    fieldsToValidate.length === 0
  ) {
    console.log("isValidSelectFields 34");
    return false;
  }
  for (const field of fieldsToValidate) {
    if (!allowedFields.has(field)) {
      console.log(`isValidSelectFields Invalidated ${field} `);
      return false;
    }
  }
  return true;
};
