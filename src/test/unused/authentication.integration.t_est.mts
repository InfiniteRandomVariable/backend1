// backend/src/controllers/authentication.integration.test.mts
import request from "supertest";
import { app } from "../server.mts"; // Your Express app instance
import { db } from "../db/database.mts";
import { UserVerifiedStatus } from "../db/types.mts";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
// ... other imports ...
import { CognitoIdentityServiceProvider } from "aws-sdk";
import Stripe from "stripe";
import getRedisClient from "../utils/redis.mts";
import * as dotenv from "dotenv";
dotenv.config();

// Configure AWS Cognito
const cognito = new CognitoIdentityServiceProvider({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

describe("Authentication Controller Integration Tests", () => {
  const phoneNumber = "+15551234567";
  const userId = 1;
  const cognitoUsername = phoneNumber;
  const verificationCode = "123456";
  const stripeSessionId = "test_stripe_session_id";
  let userIdFk: number; // Store userIdFk

  beforeEach(async () => {
    // Clear Redis and database before each test
    const redisClient = await getRedisClient();
    await redisClient.flushAll();

    // Setup test user in database
    const insertResult = await db
      .insertInto("og.userAccounts")
      .values({ userIdFk: userId })
      .returning("userIdFk")
      .executeTakeFirst();
    if (insertResult) {
      userIdFk = insertResult.userIdFk;
    } else {
      throw new Error("Failed to create og.userAccounts entry for testing");
    }

    await db
      .insertInto("og.userDetails")
      .values({
        userIdFk: userIdFk,
        phone: phoneNumber,
        email: "test@test.com",
      })
      .execute();
    await db
      .insertInto("og.authStatus")
      .values({ userIdFk: userIdFk })
      .execute();

    // Setup test user in Cognito
    try {
      await cognito
        .adminCreateUser({
          UserPoolId: process.env.COGNITO_USER_POOL_ID as string,
          Username: cognitoUsername,
        })
        .promise();
    } catch (error: any) {
      if (error.code !== "UsernameExistsException") {
        throw error;
      }
    }
  });

  afterEach(async () => {
    try {
      await cognito
        .adminDeleteUser({
          UserPoolId: process.env.COGNITO_USER_POOL_ID as string,
          Username: cognitoUsername,
        })
        .promise();
    } catch (error) {
      // Ignore errors if user doesn't exist
    }
  });

  it("should verify phone number successfully", async () => {
    // Send verification code
    await request(app)
      .post("/api/auth/verify-phone")
      .send({ phoneNumber, userId })
      .expect(200);

    // Store verification code in Redis
    const redisClient = await getRedisClient();
    await redisClient.set(
      phoneNumber,
      JSON.stringify({ verificationCode, userId })
    );

    // Verify code
    const response = await request(app)
      .post("/api/auth/verify-code")
      .send({ phoneNumber, verificationCode })
      .expect(200);

    expect(response.body.message).toBe("Phone number verified successfully");

    // Verify database and Cognito updates
    const userAccount = await db
      .selectFrom("og.userAccounts")
      .selectAll()
      .where("userIdFk", "=", userId)
      .executeTakeFirst();
    expect(userAccount?.status).toBe(UserVerifiedStatus.PhoneVerified);

    const cognitoUser = await cognito
      .adminGetUser({
        UserPoolId: process.env.COGNITO_USER_POOL_ID as string,
        Username: cognitoUsername,
      })
      .promise();

    const phoneVerifiedAttribute = cognitoUser.UserAttributes?.find(
      (attr) => attr.Name === "custom:phone_verified"
    );
    expect(phoneVerifiedAttribute?.Value).toBe("true");

    const ogAuthStatus = await db
      .selectFrom("og.authStatus")
      .selectAll()
      .where("userIdFk", "=", userIdFk)
      .executeTakeFirst();
    expect(ogAuthStatus?.verifiedPhone).toBe(true);
  });
  it("should verify stripe successfully via API", async () => {
    // Call the /verify-stripe API endpoint
    const response = await request(app)
      .post("/api/auth/verify-stripe")
      .send({ userId })
      .expect(200);

    // Verify that the response contains a URL
    expect(response.body.url).toBeDefined();

    // Verify that the session is stored in Redis
    const redisClient = await getRedisClient();
    const redisValue = await redisClient.get(
      `stripe-session:${stripeSessionId}`
    );
    expect(redisValue).toBe(userId);

    // Mock Stripe webhook event
    const mockStripeWebhookEvent = {
      id: "evt_test_webhook",
      type: "identity.verification_session.verified",
      data: {
        object: {
          id: stripeSessionId,
        },
      },
    };

    it("should verify stripe successfully", async () => {
      // Mock Stripe webhook event
      const mockStripeWebhookEvent = {
        id: "evt_test_webhook",
        type: "identity.verification_session.verified",
        data: {
          object: {
            id: stripeSessionId,
          },
        },
      };

      // Store stripe session in redis
      const redisClient = await getRedisClient();
      await redisClient.set(`stripe-session:${stripeSessionId}`, userId);

      // Verify stripe
      const response = await request(app)
        .post("/api/auth/stripe-webhook")
        .send(mockStripeWebhookEvent)
        .expect(200);

      expect(response.body.received).toBe(true);

      // Verify database and Cognito updates
      const userAccount = await db
        .selectFrom("og.userAccounts")
        .selectAll()
        .where("userIdFk", "=", userId)
        .executeTakeFirst();
      expect(userAccount?.status).toBe(UserVerifiedStatus.StripeVerified);

      const cognitoUser = await cognito
        .adminGetUser({
          UserPoolId: process.env.COGNITO_USER_POOL_ID as string,
          Username: cognitoUsername,
        })
        .promise();

      const stripeVerifiedAttribute = cognitoUser.UserAttributes?.find(
        (attr) => attr.Name === "custom:stripe_verified"
      );
      expect(stripeVerifiedAttribute?.Value).toBe("true");

      const ogAuthStatus = await db
        .selectFrom("og.authStatus")
        .selectAll()
        .where("userIdFk", "=", userIdFk)
        .executeTakeFirst();
      expect(ogAuthStatus?.verifiedUserId).toBe(true);
    });

    it("should return the correct UserVerifiedStatus from OgAuthStatus", async () => {
      // Setup test data
      await db
        .updateTable("og.authStatus")
        .set({ verifiedPhone: true, verifiedUserId: true })
        .where("userIdFk", "=", userIdFk)
        .execute();

      // Get status
      const response = await request(app)
        .get(`/api/auth/get-status?userId=${userId}`)
        .expect(200);

      expect(response.body.status).toBe(
        UserVerifiedStatus.PhoneAndStripeVerified
      );
    });
  });
});
