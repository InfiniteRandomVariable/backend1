import AWS from "aws-sdk";
import * as dotenv from "dotenv";
dotenv.config();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Configure AWS Cognito (if needed)
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION,
  // Add other necessary Cognito configurations
});

// Configure other AWS services as needed...

export { s3, cognito }; // Export the configured AWS clients
