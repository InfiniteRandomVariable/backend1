//backend/src/utils/commonUtil.mts
import fs from "fs/promises";
import { UserRolesEnum } from "../db/types.mts";
import { isValidPhoneNumber } from "libphonenumber-js";
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
export function getMatchingElements(array1: any[], array2: any[]) {
  // Use the filter method on array1 to create a new array
  const matchingElements = array1.filter((element) => {
    // For each element in array1, check if it exists in array2 using includes()
    return array2.includes(element);
  });
  return matchingElements;
}
export const adminTrailingPassword = "#_#_";
export const staffTrailingPassword = "!_!_!";

export function isPasswordValid(password: string, userRole: string) {
  if (userRole === UserRolesEnum.Admin) {
    return password.endsWith(adminTrailingPassword);
  } else if (userRole === UserRolesEnum.Staff) {
    return password.endsWith(staffTrailingPassword);
  }
}

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
