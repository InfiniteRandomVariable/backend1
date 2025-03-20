//../db/zod/types.zod.mjs
import z from "zod";
export const verifyPhoneSchema = z.object({
  phoneNumber: z.string(),
});

export const verifyCodeSchema = z.object({
  phoneNumber: z.string(),
  verificationCode: z.string(),
});

export const verifyStripeSchema = z.object({
  userId: z.string(),
});

export const arbiterProfileSchema = z.object({
  id: z.number().int().positive().optional(), // SERIAL PRIMARY KEY, optional on create
  arbiterUserIdFk: z.number().int().positive({
    message: "Arbiter User ID is required and must be a positive integer.",
  }), // INTEGER NOT NULL, Foreign Key, Required
  arbiterName: z.string().max(255).optional().nullable(), // character varying(255), Optional, Nullable
  intro: z.string().max(1000).optional().nullable(), // character varying(200) in DB, but using max(1000) as in previous schema, Optional, Nullable
  country: z.string().max(255).optional().nullable(), // character varying(255), Optional, Nullable
  status: z.number().int().optional().nullable(), // integer, Optional, Nullable (Assuming it's an enum or status code, so keeping as number().int())
  overallRating: z.number().optional().nullable(), // integer, Optional, Nullable
  totalResolvedDisputes: z.number().int().optional().nullable(), // integer, Optional, Nullable
  pinBuyerReview: z.string().max(1000).optional().nullable(), // character varying(1000), Optional, Nullable
  pinBuyerReviewId: z.number().int().positive().optional().nullable(), // integer, Optional, Nullable
  pinSellerReview: z.string().max(1000).optional().nullable(), // character varying(1000), Optional, Nullable
  pinSellerReviewId: z.number().int().positive().optional().nullable(), // integer, Optional, Nullable
  recentBuyerReview: z.string().max(1000).optional().nullable(), // character varying(1000), Optional, Nullable
  recentBuyerReviewId: z.number().int().positive().optional().nullable(), // integer, Optional, Nullable
  recentSellerReview: z.string().max(1000).optional().nullable(), // character varying(1000), Optional, Nullable
  recentSellerReviewId: z.number().int().positive().optional().nullable(), // integer, Optional, Nullable
  lastLoggedIn: z.date().optional().nullable(), // Timestamp, Optional, Nullable (Zod `date()` type for Timestamp/Date)
  chargeFee: z.number().optional().nullable(), // integer, Optional, Nullable (Assuming it represents a numerical fee)
});
export const updateAuthStatusSchema = z.object({
  isSeller: z.boolean().optional(),
  isArbiter: z.boolean().optional(),
  isStaffAdmin: z.boolean().optional(),
  userStatus: z.number().optional(), // {{ edit_1 }}
  verifiedEmail: z.boolean().optional(), // {{ edit_1 }}
  verifiedPhone: z.boolean().optional(), // {{ edit_1 }}
  verifiedUserId: z.boolean().optional(), // {{ edit_1 }}
});
export const ReviewPurchaseOfferRequestSchema = z.object({
  status: z.number().positive().int({
    message: "Enum status",
  }),
  selectedArbiterIds: z
    .array(z.number().int().positive(), {
      // Array of positive integers
      required_error: "Arbiter IDs are required when accepting an offer",
      invalid_type_error: "Arbiter IDs must be an array of numbers",
    })
    .min(3, "Please select exactly 3 arbiters")
    .max(3, "Please select exactly 3 arbiters")
    .optional(), // Optional because not needed for 'reject' action
});

export const createMessageThreadSchema = z.object({
  receiverUserIdFk: z.number().int().positive(),
  phoneIdFk: z.number().int().positive().nullable().optional(),
  productIdFk: z.number().int().positive().nullable().optional(),
  title: z.string().min(1),
  message: z.string().nullable().optional(),
  disputeIdFk: z.number().int().positive().nullable().optional(),
});

export const createMessageCommentSchema = z.object({
  message: z.string().nullable().optional(),
});

export type ReviewPurchaseOfferRequest = z.infer<
  typeof ReviewPurchaseOfferRequestSchema
>;

export const createPurchaseOfferSchema = z.object({
  phonePostIdFk: z.number().positive().int({
    message: "Phone Post ID is required and must be a positive integer.",
  }),
  offeredPrice: z.number().positive({
    message: "Offered price is required and must be a positive number.",
  }),
  status: z.number().positive().int({
    message: "Enum status",
  }),
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter code (e.g., USD).")
    .toUpperCase()
    .refine((value) => /^[A-Z]{3}$/.test(value), {
      message: "Currency must be a valid 3-letter currency code (e.g., USD).",
    }),
  arbiterUserIds: z
    .array(z.number().int().positive())
    .min(3, "At least 3 arbiters must be selected.")
    .max(6, "Maximum 6 arbiters can be selected.")
    .refine((arbiterIds) => arbiterIds.length === new Set(arbiterIds).size, {
      message: "Arbiter User IDs must be unique.",
    }),
});
export type CreatePurchaseOfferRequest = z.infer<
  typeof createPurchaseOfferSchema
>;
export const makePurchaseOfferSchema = z.object({
  id: z.number().int().positive().optional(), // Assuming 'id' is auto-generated and optional on creation
  createdAt: z.date().optional(), // Assuming 'createdAt' is auto-generated timestamp
  phoneIdFk: z
    .number()
    .int()
    .positive({ message: "Phone ID (Listing ID) must be a positive integer" }),
  buyerUserIdFk: z.number().int().positive(),
  arbiter1UserIdFk: z.number().int().positive().nullable(),
  arbiter2UserIdFk: z.number().int().positive().nullable(),
  arbiter3UserIdFk: z.number().int().positive().nullable(),
  arbiter4UserIdFk: z.number().int().positive().nullable(),
  arbiter5UserIdFk: z.number().int().positive().nullable(),
  arbiter6UserIdFk: z.number().int().positive().nullable(),
  status: z.number().int().nullable().optional(), // Using number for status as per your interface
  sellerDidRead: z.boolean().nullable().optional(),
  acceptedArbiterPositions: z.number().int().nullable().optional(),
  acceptedArbiterStatus: z.number().int().nullable().optional(),
  productIdFk: z.number().int().positive().nullable().optional(), // Assuming productIdFk is positive integer if present

  // Note: 'offerPrice' and 'messageToSeller' are still *not* included as per previous instructions.
  // If 'offerPrice' or 'messageToSeller' *are* needed, you must add them here with appropriate Zod types.
});

export type MakePurchaseOfferPayload = z.infer<typeof makePurchaseOfferSchema>; // Type name kept as MakePurchaseOfferPayload for consistency
export type OgPurchaseOffersType = MakePurchaseOfferPayload; // Re-exporting type with original name for potential broader use.
