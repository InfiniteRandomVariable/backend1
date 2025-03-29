import { Request } from "express";

//backend/src/utils/commonUtil.mts
import fs from "fs/promises";
import { UserRolesEnum } from "../db/types.mts";
import { isValidPhoneNumber } from "libphonenumber-js";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import {
  staffTrailingPassword,
  adminTrailingPassword,
} from "../utils/constants.mts";
import dotenv from "dotenv";
dotenv.config();

let DOMPurifyInstance: typeof DOMPurify;
// Initialize DOMPurify
const initializeDOMPurify = () => {
  if (!DOMPurifyInstance) {
    const { window } = new JSDOM(""); // You can pass HTML content if needed
    DOMPurifyInstance = DOMPurify(window);
  }
};

export function isDevEnviroment() {
  const env = process.env.PRODUCTION_ENV;
  return env === "dev";
}
// import fs from "fs";
export function getRandomNumberInRange(min: number, max: number) {
  // Calculate the range (inclusive of min and max)
  const range = max - min + 1;

  // Generate a random number between 0 (inclusive) and 1 (exclusive)
  const randomNumber = Math.random();

  // Scale the random number to the range and shift it to start at min
  const scaledRandomNumber = randomNumber * range + min;

  // Use Math.floor to round down to the nearest integer
  const randomInteger = Math.floor(scaledRandomNumber);

  return randomInteger;
}
export function getMatchingElements(array1: string[], array2: string[]) {
  // Use the filter method on array1 to create a new array
  const matchingElements = array1.filter((element) => {
    // For each element in array1, check if it exists in array2 using includes()
    return array2.includes(element);
  });
  return matchingElements;
}

export function isPasswordValidForAdminOrStaff(
  password: string,
  userRole: string
) {
  if (userRole === UserRolesEnum.Admin) {
    return password.endsWith(adminTrailingPassword);
  } else if (userRole === UserRolesEnum.Staff) {
    return password.endsWith(staffTrailingPassword);
  } else {
    return false;
  }
}

export const sanitizeString = (
  html: string | null | undefined
): string | null | undefined => {
  if (!html) {
    return html;
  }

  initializeDOMPurify(); // Ensure DOMPurify is initialized

  if (DOMPurifyInstance && typeof DOMPurifyInstance.sanitize === "function") {
    return DOMPurifyInstance.sanitize(html);
  } else {
    console.error("DOMPurify is not correctly initialized.");
    return html;
  }
};
export const sanitizeStrings = (strings: string[]): boolean => {
  return strings.reduce(
    (accumulator: boolean, currentString: string | null | undefined) => {
      if (!accumulator) {
        return false; // If any previous string failed, keep it false
      }

      if (typeof currentString === "string") {
        DOMPurify.sanitize(currentString); // Sanitize the string
        return true; // Assume sanitization is always successful with DOMPurify
      } else if (currentString === null || currentString === undefined) {
        return true; // Treat null or undefined strings as successfully processed (no sanitization needed)
      } else {
        return false; // If an element in the array is not a string, null, or undefined
      }
    },
    true
  );
};

// export function deleteAllLocalImages(files: any) {
//   try {
//     if (files && Array.isArray(files) && files.length > 0)
//       files.forEach((file) => {
//         if (file && file.path) {
//           fs.unlink(file.path);
//         }
//       });
//   } catch (e) {
//     console.error(e);
//   }
// }

export function makeid(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
export async function deleteAllLocalImages(files: any): Promise<void> {
  // Make the function async and return Promise<void>
  if (files && Array.isArray(files) && files.length > 0) {
    for (const file of files) {
      // Use a for...of loop for async operations
      if (file && file.path) {
        try {
          await fs.unlink(file.path); // Use await with fs.promises.unlink for async deletion
          console.log(`Successfully deleted local image: ${file.path}`); // Optional: log successful deletion
        } catch (e: any) {
          console.error(`Error deleting local image: ${file.path}`, e); // Log error for each failed deletion
          // Decide how to handle individual deletion errors:
          // 1. Continue deleting other files (as in this example - error is logged, but loop continues)
          // 2. Stop the entire process and re-throw an error (if deletion is critical and all files must be deleted)
          //    throw new Error(`Failed to delete image ${file.path}. Details: ${e.message}`);
        }
      }
    }
  }
}
export const deleteLocalFiles = async (
  fileURI: string,
  shouldDeleteLocalAsset: boolean = true,
  extensionType: string = "jpg"
): Promise<void> => {
  if (shouldDeleteLocalAsset && fileURI.length > 3) {
    console.log("Deleting local files:", fileURI, fileURI + extensionType);
    try {
      await fs.unlink(fileURI);
      await fs.unlink(fileURI + extensionType);
    } catch (error: any) {
      console.error(
        "Error deleting local files:",
        fileURI,
        fileURI + extensionType,
        error
      );
      // Decide how to handle deletion errors:
      // 1. Re-throw the error to propagate it up the call chain (if deletion is critical)
      //    throw error;
      // 2. Handle silently (log the error and continue - if deletion is not critical)
      //    console.warn("File deletion failed, continuing...", error);
      // For now, let's re-throw to make errors explicit:
      throw new Error(
        `Failed to delete local files: ${fileURI}, ${
          fileURI + extensionType
        }. Details: ${error.message}`
      );
    }
  }
};
// export async function deleteLocalFiles(
//   file_URI: string,
//   shouldDeleteLocalAsset: boolean = true,
//   extensionType: string = "jpg"
// ) {
//   const fileURIExtension = file_URI + extensionType;
//   //Consider to use Promisify
//   return new Promise((resolve: any, reject: any) => {
//     if (shouldDeleteLocalAsset && file_URI.length > 3) {
//       console.log("Deleting the local files");
//       try {
//         fs.unlinkSync(file_URI);
//         fs.unlinkSync(fileURIExtension);
//         resolve();
//       } catch (e: any) {
//         reject();
//       }
//     } else {
//       resolve();
//     }
//   }).catch((e) => {
//     throw e;
//   });
// }
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  try {
    return isValidPhoneNumber(phoneNumber); // Uses libphonenumber-js for validation
  } catch (error) {
    return false; // If parsing/validation fails, consider it invalid
  }
};
export const generateVerificationCode = (): string => {
  // Generate a 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
};

interface UserInfo {
  userId: number;
  userRoles: string[];
}
const enumValues = Object.values(UserRolesEnum);
export const extractUserInfo = (req: Request): UserInfo => {
  let userId = 0;
  let userRoles: string[] = [];

  if (req && req.user && req.user.id && typeof req.user.id === "number") {
    userId = req.user.id;
  }

  if (
    Array.isArray(req.user.userRoles) &&
    req.user.userRoles.length > 0 &&
    enumValues.every((enumValue) => req.user.userRoles.includes(enumValue))
  ) {
    return {
      userId: userId,
      userRoles: req.user.userRoles,
    };
  }

  return {
    userId: userId,
    userRoles: userRoles,
  };
};

export function containsAnyUserRoles(
  mainArray: string[],
  elementsToCheck: UserRolesEnum[]
) {
  if (!Array.isArray(mainArray) || !Array.isArray(elementsToCheck)) {
    return false; // Or throw an error, depending on desired behavior for invalid input
  }

  return elementsToCheck.some((element) => mainArray.includes(element));
}
