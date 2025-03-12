import { S3Client } from "@aws-sdk/client-s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Request, Response, NextFunction } from "express";
//setup client-s3 credentials https://stackoverflow.com/questions/68264237/how-to-set-credentials-in-aws-sdk-v3-javascript
import { Upload } from "@aws-sdk/lib-storage";
import { pipeline } from "stream";
import {
  deleteLocalFiles,
  deleteAllLocalImages,
  isDevEnviroment,
} from "./commonUtil.mjs";
import util from "util";
import fs from "fs";
import { v4 as uuid } from "uuid";
import sharp from "sharp"; // Import as default
import { fileURLToPath } from "url";
const _pipeline = util.promisify(pipeline);
const s3 = new S3Client();
const BUCKET = process.env.AWS_S3_LISTING_BUCKET_NAME;
const PROFILE_BUCKET = process.env.AWS_S3_PROFILE_BUCKET_NAME;
import { db } from "../db/database.mts";
declare global {
  // {{ edit_1 }}
  namespace Express {
    // {{ edit_1 }}
    interface Request {
      userId?: number; // {{ edit_1 }}
      payload: any;
    } // {{ edit_1 }}
  } // {{ edit_1 }}
} // {{ edit_1 }}

// interface Request {
//   files: any;
//   userId?: number;
// }
//change your S3 bucket key
// e.g. bucket/p/yourasset
//https://github.com/aws/aws-sdk-js/issues/2961

//Further optimization https://www.geeksforgeeks.org/node-js-util-promisify-method/

//This method can delete the asset after its task as you choose.
export const bucket_base_path = BUCKET;

export function S3UploadProcedure(
  key: string,
  fileURIExtension: string,
  fileType: string
) {
  console.log("S3UploadProcedure");
  const awsFileStream = fs.createReadStream(fileURIExtension);
  const input = {
    Bucket: BUCKET,
    Key: key,
    Body: awsFileStream,
    ContentType: fileType,
  };

  const multipartUpload = new Upload({
    client: s3,
    params: input,
  });
  //Debugging (optional)
  //multipartUpload.on("httpUploadProgress");
  //return a promise
  return multipartUpload.done();
}
export const uploadImageS3 = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("post images 1");
  const files = req.files;
  if (!files || !files.length) {
    console.log("post images 2");
    if (isDevEnviroment()) {
      return next();
    }
    return res.status(500).json({ error: "files is empty" });
  }
  const userId: number = typeof req.userId === "number" ? req.userId : 1003;

  // console.log("files.length " + files.length);

  let keys = [];
  try {
    if (files && Array.isArray(files) && files.length > 0) {
      for await (const theFile of files) {
        const file_URI = `${theFile.path}`;

        //  const userId = 10034; // Consider making this dynamic if it comes from req.body or elsewhere
        const fileType = `${theFile.mimetype}`;

        const { error, key } = await imageUploaderS3(
          file_URI,
          userId,
          fileType,
          uuid()
        );

        console.log("outer for loop await uploaded key: ", key);

        keys.push(key);
        if (error) {
          throw error;
        }
      }
    }

    req.payload = keys;
    // Send success response
    next();
    //return res.status(200).json({ keys });
  } catch (err: any) {
    const msg = err.message ? err.message : "error 80 image uplaod";
    deleteAllLocalImages(files);
    console.log("Error message - " + msg);
    return res.status(500).json({ error: msg });
  }
};

export const imageUploaderS3 = async (
  file_URI: string,
  userId: number,
  fileType: string,
  dest_file_path: string,
  resizeImageTo: number = 320,
  extensionType: string = ".jpg"
): Promise<{ key?: string; error?: any }> => {
  try {
    const fileURIExtension = file_URI + extensionType;

    //best to remove userId for better security
    const originalFileStream = fs.createReadStream(file_URI);
    const key = `${bucket_base_path}/${userId}/${dest_file_path}${extensionType}`;
    // const key = `${bucket_base_path}/${userId}/${uuid()}${extensionType}`;
    const transfomer = sharp()
      .resize({
        width: resizeImageTo,
        height: resizeImageTo,
        fit: sharp.fit.cover,
        position: sharp.strategy.entropy,
      })
      .jpeg({ mozjpeg: true });

    let writer = fs.createWriteStream(fileURIExtension);

    await _pipeline(originalFileStream, transfomer, writer);
    await S3UploadProcedure(key, fileURIExtension, fileType);
    await deleteLocalFiles(file_URI, true, extensionType);

    return new Promise((resolve) => {
      console.log("returning key");
      resolve({
        key,
      });
    });
  } catch (e) {
    console.log("image uploader 92");
    console.log(e);
    throw e;
  }
};

export const deleteImagesFromS3AndDB = async (
  urls: string[],
  phoneId: number | null = null
): Promise<{ url: string; success: boolean; error?: any }[]> => {
  try {
    if (!urls || !Array.isArray(urls)) {
      throw new Error("Invalid URLs provided");
    }

    const phoneDetails = await db
      .selectFrom("og.phoneDetails")
      .where("phoneIdFk", "=", phoneId)
      .select(["og.phoneDetails.photoUrls"])
      .executeTakeFirst();

    if (!phoneDetails) {
      throw new Error("Phone details not found");
    }
    let urlsToDelete = urls;
    // Filter URLs that exist in phoneDetails.photoUrls

    if (phoneDetails && phoneDetails.photoUrls) {
      urlsToDelete = urls.filter((url: string) =>
        phoneDetails.photoUrls?.includes(url)
      );
    }

    const deletePromises = urlsToDelete.map(async (url: string) => {
      try {
        const key = decodeURIComponent(
          url.split(process.env.AWS_S3_LISTING_BUCKET_NAME + "/")[1]
        );

        const deleteParams = {
          Bucket: process.env.AWS_S3_LISTING_BUCKET_NAME as string,
          Key: key,
        };

        await s3.send(new DeleteObjectCommand(deleteParams)); // {{ edit_2 }}
        return { url, success: true };
      } catch (error) {
        console.error(`Error deleting ${url}:`, error);
        return { url, success: false, error: error };
      }
    });

    const results = await Promise.all(deletePromises);

    if (phoneDetails && phoneDetails.photoUrls) {
      const updatedUrls = phoneDetails.photoUrls.filter(
        (url: string) => !urlsToDelete.includes(url)
      );

      await db
        .updateTable("og.phoneDetails")
        .set({ photoUrls: updatedUrls })
        .where("phoneIdFk", "=", phoneId as number)
        .execute();
    }

    if (phoneId !== null) {
      const phone = await db
        .selectFrom("og.phones")
        .where("id", "=", phoneId)
        .select(["og.phones.coverPhotoUrl"])
        .executeTakeFirst();
      if (phone && urls.includes(phone.coverPhotoUrl as string)) {
        await db
          .updateTable("og.phones")
          .set({ coverPhotoUrl: null })
          .where("id", "=", phoneId)
          .execute();
      }
    }

    return results;
  } catch (error) {
    console.error("Error deleting images:", error);
    throw error;
  }
};
