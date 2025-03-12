import { Router } from "express";
import {
  verifyPhoneSchema,
  verifyCodeSchema,
  verifyStripeSchema,
} from "../db/zod/types.zod.mjs";
import {
  verifyPhone,
  verifyCode,
  verifyStripe,
  stripeWebhook,
} from "../controllers/authentication.controller.mts"; // Import verifyPhone and verifyCode

//import { verifyPhoneSchema, verifyCodeSchema } from '../api/user.zod.mts';
import { validateRequest } from "../middleware/validateRequest.mts";

import bodyParser from "body-parser";
// import bodyParser from 'body-parser'; // Consider using this if the above doesn't work and you are using commonjs modules
const router = Router();

router.post("/verify-phone", validateRequest(verifyPhoneSchema), verifyPhone);
router.post("/verify-code", validateRequest(verifyCodeSchema), verifyCode);
router.post(
  "/verify-stripe",
  validateRequest(verifyStripeSchema),
  verifyStripe
);
router.post(
  "/stripe-webhook",
  bodyParser.raw({ type: "application/json" }),
  stripeWebhook
); // Use raw body parser

export default router;
