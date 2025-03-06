// backend/src/utils/sns.mts
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
//import AWS from "aws-sdk";
import * as dotenv from "dotenv";
import { fromEnv } from "@aws-sdk/credential-providers";
dotenv.config();

// Configure AWS SNS
// const sns = new AWS.SNS({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(), // Reads credentials from process.env
});

// const snsClient = new SNSClient({
//     region: process.env.AWS_REGION,
//     credentials: {
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     },
//   });

export const sendSMS = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  const params = {
    Message: message,
    PhoneNumber: phoneNumber,
  };

  try {
    const data = await snsClient.send(new PublishCommand(params));
    console.log("SMS message sent successfully:", data); // Optional: log successful sending (for debugging)
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    throw new Error("Failed to send SMS verification code."); // Throw specific error
  }
};
// export const sendSMS = async (
//   phoneNumber: string,
//   message: string
// ): Promise<void> => {
//   try {
//     const params = {
//       Message: message,
//       PhoneNumber: phoneNumber,
//     };

//     await sns.publish(params).promise();
//   } catch (error) {
//     console.error("Error sending SMS:", error);
//     throw error; // Re-throw the error to be handled by the caller
//   }
// };
