// backend/src/api/phones.zod.mts
import z from "zod";

export const phoneSchema = z.object({
  id: z.number().int().optional(),
  userIdFk: z.number().int(),
  model: z.number().int(),
  photoNum: z.number().int().optional().nullable(),
  createdDate: z.coerce.date(),
  price: z.number().int(),
  saved: z.number().int().optional().nullable(),
  condition: z.number().int().optional().nullable(),
  carrier: z.number().int().optional().nullable(),
  status: z.number().int(),
  coverPhotoUrl: z.string().nullable(),
  currency: z.string().nullable(),
});

export type Phone = z.infer<typeof phoneSchema>;
