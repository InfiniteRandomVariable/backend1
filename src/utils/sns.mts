// backend/src/utils/sns.mts
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
//import AWS from "aws-sdk";
import * as dotenv from "dotenv";
import { fromEnv } from "@aws-sdk/credential-providers";
import { isDevEnviroment } from "./commonUtil.mts";
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

const sesClient = new SESClient({
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
    if (isDevEnviroment()) {
      return;
    }
    const data = await snsClient.send(new PublishCommand(params));
    console.log("SMS message sent successfully:", data); // Optional: log successful sending (for debugging)
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    throw new Error("Failed to send SMS verification code."); // Throw specific error
  }
};

export const sendEmail = async (
  toEmail: string,
  subject: string,
  body: string
): Promise<void> => {
  if (isDevEnviroment()) {
    return;
  }

  const params = {
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: body, // You can also create a plain text version
        },
        Text: {
          Charset: "UTF-8",
          Data: body,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: "YOUR_VERIFIED_EMAIL@example.com", // Replace with your verified sender email address
  };

  try {
    const data = await sesClient.send(new SendEmailCommand(params));
    console.log("Email sent successfully:", data);
  } catch (error: any) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email notification.");
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
