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
