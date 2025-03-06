// backend/src/controllers/authentication.controller.mts
import { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../db/database.mts";
import {
  generateVerificationCode,
  validatePhoneNumber,
} from "../utils/commonUtil.mts";
import { UserVerifiedStatus } from "../db/types.mjs";
import redisClient from "../utils/redis.mts";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { sendSMS } from "../utils/sns.mts";
import * as dotenv from "dotenv";
dotenv.config();
// Configure Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15",
});
const storeVerificationData = async (
  phoneNumber: string,
  verificationCode: string,
  userId: string,
  expirationTime: number
) => {
  //@ts-ignore
  await redisClient.set(
    phoneNumber,
    JSON.stringify({ verificationCode, userId }),
    { EX: expirationTime }
  );
};
const updateUserVerifiedStatus = async (
  userId: number,
  status: UserVerifiedStatus
) => {
  await updateOgAuthStatus(userId, status);
};

export const verifyPhone = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, userId } = req.body;

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const verificationCode = generateVerificationCode();
    const expirationTime = 15 * 60; // 15 minutes in seconds

    // Store verification data in Redis immediately
    // @ts-ignore

    await storeVerificationData(
      phoneNumber,
      verificationCode,
      userId,
      expirationTime
    );

    // Send SMS via AWS SNS
    await sendSMS(
      phoneNumber,
      `Your verification code is: ${verificationCode}`
    );

    res.status(200).json({ message: "Verification code sent" });
  } catch (error) {
    // If the redis is not connected, the catch portion of the code is being run.
    console.error("Error verifying phone:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const cognito = new CognitoIdentityServiceProvider({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const updateOgAuthStatus = async (
  userId: number,
  verifiedStatus: UserVerifiedStatus
) => {
  let userStatus: number | null = null;
  let verifiedEmail: boolean | null = false;
  let verifiedPhone: boolean | null = false;
  let verifiedUserId: boolean | null = false;

  switch (verifiedStatus) {
    case UserVerifiedStatus.None:
      userStatus = 0;
      break;
    case UserVerifiedStatus.PhoneVerified:
      userStatus = 1;
      verifiedPhone = true;
      break;
    case UserVerifiedStatus.StripeVerified:
      userStatus = 2;
      verifiedUserId = true;
      break;
    case UserVerifiedStatus.PhoneAndStripeVerified:
      userStatus = 3;
      verifiedPhone = true;
      verifiedUserId = true;
      break;
    case UserVerifiedStatus.SellerApproved:
      userStatus = 4;
      verifiedEmail = true;
      break;
    case UserVerifiedStatus.SellerAndPhoneVerified:
      userStatus = 5;
      verifiedEmail = true;
      verifiedPhone = true;
      break;
    case UserVerifiedStatus.SellerAndStripeVerified:
      userStatus = 6;
      verifiedEmail = true;
      verifiedUserId = true;
      break;
    case UserVerifiedStatus.FullVerification:
      userStatus = 8;
      verifiedEmail = true;
      verifiedPhone = true;
      verifiedUserId = true;
      break;
    case UserVerifiedStatus.UserIdVerified:
      userStatus = 7;
      verifiedUserId = true;
      break;
  }

  // Find the OgAuthStatus record.

  // Update OgAuthStatus table
  await db
    .updateTable("og.authStatus")
    .set({
      userStatus: userStatus,
      verifiedEmail: verifiedEmail,
      verifiedPhone: verifiedPhone,
      verifiedUserId: verifiedUserId,
    })
    .where("userIdFk", "=", userId)
    .execute();
};
export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, verificationCode, userId } = req.body;

    // Retrieve verification data from Redis
    // @ts-ignore
    const storedData = await redisClient.get(phoneNumber);

    if (!storedData) {
      return res
        .status(404)
        .json({ message: "Verification code not found or expired" });
    }

    const { verificationCode: storedCode } = JSON.parse(storedData);

    if (verificationCode !== storedCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    const userDetails = await db
      .selectFrom("og.userDetails")
      .select("og.userDetails.phone")
      .where("og.userDetails.userIdFk", "=", userId)
      .executeTakeFirst();

    if (!userDetails || userDetails.phone !== phoneNumber) {
      return res.status(400).json({ message: "Phone number mismatch" });
    }

    // Update Cognito user custom attribute
    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID as string,
      Username: phoneNumber, // Use phone number as username
      UserAttributes: [
        {
          Name: "custom:phone_verified", // Custom attribute name
          Value: "true",
        },
      ],
    };

    await cognito.adminUpdateUserAttributes(params).promise();

    updateUserVerification(userId, UserVerifiedStatus.PhoneVerified);
    // Delete verification data from Redis
    // @ts-ignore
    await redisClient.del(phoneNumber);

    res.status(200).json({ message: "Phone number verified successfully" });
  } catch (error) {
    console.error("Error verifying code:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const verifyStripe = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        userId: userId,
      },
      options: {
        document: {
          allowed_types: ["passport", "driving_license", "id_card"],
        },
      },
    });

    //@ts-ignore
    await redisClient.set(`stripe-session:${session.id}`, userId);

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error verifying Stripe:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const rawBody = req.body;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      console.error("Stripe webhook signature verification failed.", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "identity.verification_session.verified") {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      //@ts-ignore
      const userId = await redisClient.get(`stripe-session:${session.id}`);

      if (!userId) {
        console.error(`Stripe session ${session.id} not found in Redis.`);
        return res.status(404).send("Session not found.");
      }

      try {
        const params = {
          UserPoolId: process.env.COGNITO_USER_POOL_ID as string,
          Username: userId,
          UserAttributes: [{ Name: "custom:stripe_verified", Value: "true" }],
        };

        await cognito.adminUpdateUserAttributes(params).promise();
        //@ts-ignore
        await redisClient.del(`stripe-session:${session.id}`);

        updateUserVerification(userId, UserVerifiedStatus.StripeVerified);

        res.json({ received: true });
      } catch (err: any) {
        console.error("Error updating Cognito user attribute:", err);
        return res.status(500).send("Internal server error.");
      }
    } else {
      res.json({ received: true }); // Acknowledge other events.
    }
  } catch (err: any) {
    console.error("General Stripe webhook error:", err);
    res.status(500).send("Internal server error.");
  }
};

// General function to determine combined verification status
const determineCombinedStatus = (
  currentStatus: UserVerifiedStatus,
  newVerification: UserVerifiedStatus
): UserVerifiedStatus => {
  switch (currentStatus) {
    case UserVerifiedStatus.None:
      return newVerification;
    case UserVerifiedStatus.PhoneVerified:
      if (newVerification === UserVerifiedStatus.StripeVerified) {
        return UserVerifiedStatus.PhoneAndStripeVerified;
      }
      if (newVerification === UserVerifiedStatus.SellerApproved) {
        return UserVerifiedStatus.SellerAndPhoneVerified;
      }
      return currentStatus;
    case UserVerifiedStatus.StripeVerified:
      if (newVerification === UserVerifiedStatus.PhoneVerified) {
        return UserVerifiedStatus.PhoneAndStripeVerified;
      }
      if (newVerification === UserVerifiedStatus.SellerApproved) {
        return UserVerifiedStatus.SellerAndStripeVerified;
      }
      return currentStatus;
    case UserVerifiedStatus.PhoneAndStripeVerified:
      if (newVerification === UserVerifiedStatus.SellerApproved) {
        return UserVerifiedStatus.FullVerification;
      }
      return currentStatus;
    case UserVerifiedStatus.SellerApproved:
      if (newVerification === UserVerifiedStatus.PhoneVerified) {
        return UserVerifiedStatus.SellerAndPhoneVerified;
      }
      if (newVerification === UserVerifiedStatus.StripeVerified) {
        return UserVerifiedStatus.SellerAndStripeVerified;
      }
      return currentStatus;
    case UserVerifiedStatus.SellerAndPhoneVerified:
      if (newVerification === UserVerifiedStatus.StripeVerified) {
        return UserVerifiedStatus.FullVerification;
      }
      return currentStatus;
    case UserVerifiedStatus.SellerAndStripeVerified:
      if (newVerification === UserVerifiedStatus.PhoneVerified) {
        return UserVerifiedStatus.FullVerification;
      }
      return currentStatus;
    case UserVerifiedStatus.FullVerification:
      return currentStatus;
    case UserVerifiedStatus.UserIdVerified:
      return currentStatus;
    default:
      return currentStatus;
  }
};

// Get current status
// Update UserAccount status
const updateUserVerification = async (
  userId: number,
  newVerification: UserVerifiedStatus
) => {
  const currentStatusObj = await db
    .selectFrom("og.authStatus")
    .select(["userStatus", "verifiedEmail", "verifiedPhone", "verifiedUserId"])
    .where("og.authStatus.userIdFk", "=", userId)
    .executeTakeFirst();
  //Write a status interpreter that match the UserVerifiedStatus.Enum conditions based on this table design by checking the columns appropriate and reasonably and return a  UserVerifiedStatus Enum that meets the condition.
  const verifiedStatus = interpretOgAuthStatus(
    currentStatusObj?.userStatus ?? null,
    currentStatusObj?.verifiedEmail ?? null,
    currentStatusObj?.verifiedPhone ?? null,
    currentStatusObj?.verifiedUserId ?? null
  );

  // const currentStatus = currentStatusObj?.status || UserVerifiedStatus.None;
  const newStatus = determineCombinedStatus(verifiedStatus, newVerification);

  await updateUserVerifiedStatus(userId, newStatus);
};

const interpretOgAuthStatus = (
  userStatus: number | null,
  verifiedEmail: boolean | null,
  verifiedPhone: boolean | null,
  verifiedUserId: boolean | null
): UserVerifiedStatus => {
  if (verifiedEmail && verifiedPhone && verifiedUserId) {
    return UserVerifiedStatus.FullVerification;
  }

  if (verifiedEmail && verifiedPhone) {
    return UserVerifiedStatus.SellerAndPhoneVerified;
  }

  if (verifiedEmail && verifiedUserId) {
    return UserVerifiedStatus.SellerAndStripeVerified;
  }

  if (verifiedPhone && verifiedUserId) {
    return UserVerifiedStatus.PhoneAndStripeVerified;
  }

  if (verifiedEmail) {
    return UserVerifiedStatus.SellerApproved;
  }

  if (verifiedPhone) {
    return UserVerifiedStatus.PhoneVerified;
  }

  if (verifiedUserId) {
    return UserVerifiedStatus.UserIdVerified;
  }

  return UserVerifiedStatus.None;
};
