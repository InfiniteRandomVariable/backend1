// backend/src/controllers/listing.controller.mts
import { Request, Response } from "express";
import z from "zod";
import { db } from "../db/database.mts";
import { deleteImagesFromS3AndDB } from "../utils/imageManagerS3v1.mjs";
//TODO requests
//1 function
//Delete the images based on the client's provided URL strings on AWS S3
//Then, delete the Text[] that matches the client's provided URL strings.
//2 function
//From the client side, shuffle between image to be the cover images
//updating two tables. The backend needs a request to this operation.
//3 function
//Upload more images to this particular listing
//first upload to AWS S3 first, if succeeds, update the columne on the phone_details table.
// get the row from the phone_details and get photoUrls from this column and use the newly created urls from S3 to appending to the  on the photoUrls column in phone_details table

// Zod schemas for listing data
const listingSchema = z.object({
  userIdFk: z.number().int(),
  model: z.number().int(),
  price: z.number().int(),
  status: z.number().int(),
  currency: z.string().nullable(),
  battery: z.number().nullable(),
  bluetooth: z.number().nullable(),
  body: z.number().nullable(),
  buttons: z.number().nullable(),
  cam: z.number().nullable(),
  charger: z.boolean().nullable(),
  color: z.string().nullable(),
  condition: z.string().nullable(),
  cord: z.boolean().nullable(),
  damage: z.string().nullable(),
  frontCam: z.number().nullable(),
  photoUrls: z.string().array().nullable(),
  replacements: z.string().nullable(),
  screen: z.number().nullable(),
  shphoneFrom31662: z.string().nullable(),
  storage: z.number().nullable(),
  wifi: z.number().nullable(),
});

export const ogPhonesSchema = z.object({
  carrier: z.number().int(),
  condition: z.number().int(),
  coverPhotoUrl: z.string().nullable(),
  createdDate: z.date(),
  currency: z.string().nullable(),
  id: z.number().int(),
  model: z.number().int(),
  photoNum: z.number().int(),
  price: z.number().int(),
  saved: z.number().int(),
  status: z.number().int(),
  userIdFk: z.number().int(),
});

export const phoneDetailsSchema = z.object({
  id: z.number().int(),
  phoneIdFk: z.number().int(),
  battery: z.number().nullable(),
  bluetooth: z.number().nullable(),
  body: z.number().nullable(),
  buttons: z.number().nullable(),
  cam: z.number().nullable(),
  charger: z.boolean().nullable(),
  color: z.string().nullable(),
  condition: z.string().nullable(),
  cord: z.boolean().nullable(),
  damage: z.string().nullable(),
  freeShipping: z.boolean().nullable(),
  frontCam: z.number().nullable(),
  photoUrls: z.string().array().nullable(),
  replacements: z.string().nullable(),
  screen: z.number().nullable(),
  shphoneFrom31662: z.string().nullable(),
  storage: z.number().nullable(),
  wifi: z.number().nullable(),
});
export const createListing = async (req: Request, res: Response) => {
  try {
    const files = req.payload;
    if (!Array.isArray(files) && files.length < 1) {
      return res.status(500).json({ message: "Failed to create listing 20" });
    }
    const coverPhotoUrl = files.shift(); //remove the first element and return the first element

    const listingData = listingSchema.parse(req.body);
    const newListing = await db
      .insertInto("og.phones")
      .values({
        userIdFk: listingData.userIdFk,
        model: listingData.model,
        price: listingData.price,
        status: listingData.status,
        coverPhotoUrl: coverPhotoUrl,
        currency: listingData.currency,
        createdDate: new Date(),
      })
      .returningAll()
      .executeTakeFirst();

    if (!newListing) {
      return res.status(500).json({ message: "Failed to create listing" });
    }
    const newfilesName: string[] = files.filter((fileName: any) => {
      return typeof fileName === "string";
    });
    const _newNames = newfilesName.length === 0 ? null : newfilesName;

    await db
      .insertInto("og.phoneDetails")
      .values({
        phoneIdFk: newListing.id,
        battery: listingData.battery,
        bluetooth: listingData.bluetooth,
        body: listingData.body,
        buttons: listingData.buttons,
        cam: listingData.cam,
        charger: listingData.charger,
        color: listingData.color,
        condition: listingData.condition,
        cord: listingData.cord,
        damage: listingData.damage,
        frontCam: listingData.frontCam,
        photoUrls: _newNames,
        replacements: listingData.replacements,
        screen: listingData.screen,
        shphoneFrom31662: listingData.shphoneFrom31662,
        storage: listingData.storage,
        wifi: listingData.wifi,
      })
      .execute();

    res.status(201).json(newListing);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid listing data", errors: error.errors });
    }
    console.error("Error creating listing:", error);
    res.status(500).json({ message: "Error creating listing" });
  }
};
export const uploadMoreImages = async (req: Request, res: Response) => {
  try {
    const newUrls = req.payload;
    const { phoneId } = req.body;

    if (!phoneId || !newUrls || !Array.isArray(newUrls)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const phoneDetails = await db
      .selectFrom("og.phoneDetails")
      .where("phoneIdFk", "=", phoneId)
      .select("og.phoneDetails.photoUrls")
      .executeTakeFirst();

    if (!phoneDetails) {
      return res.status(404).json({ message: "Phone details not found" });
    }

    const currentUrls = phoneDetails.photoUrls || [];
    const updatedUrls = [...currentUrls, ...newUrls];

    await db
      .updateTable("og.phoneDetails")
      .set({ photoUrls: updatedUrls })
      .where("phoneIdFk", "=", phoneId)
      .execute();

    // const parsedResult = uploadMoreImagesResultSchema.parse();
    res.json({
      message: "Images uploaded successfully",
      urls: newUrls,
    });
  } catch (error) {
    console.error("Error uploading more images:", error);
    res.status(500).json({ message: "Error uploading more images" });
  }
};
export const getAllListings = async (req: Request, res: Response) => {
  try {
    const listings = await db.selectFrom("og.phones").selectAll().execute();
    res.json(listings);
  } catch (error) {
    console.error("Error getting listings:", error);
    res.status(500).json({ message: "Error getting listings" });
  }
};

export const getListingById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listing = await db
      .selectFrom("og.phones")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json(listing);
  } catch (error) {
    console.error("Error getting listing by ID:", error);
    res.status(500).json({ message: "Error getting listing by ID" });
  }
};

//TODO: it needs a parser to get the urls from the AWS keys.
export const shuffleImages = async (req: Request, res: Response) => {
  try {
    let didAddCoverImage = false;
    const { phoneId, photoUrls, coverPhotoUrl } = req.body;

    if (!phoneId || !photoUrls || !coverPhotoUrl) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Update og.phones table

    // Update og.phones table
    if (coverPhotoUrl) {
      didAddCoverImage = true;
      await db
        .updateTable("og.phones")
        .set({ coverPhotoUrl: coverPhotoUrl })
        .where("id", "=", phoneId)
        .execute();
    }
    // Update og.phone_details table
    const phoneDetails = await db
      .selectFrom("og.phoneDetails")
      .where("phoneIdFk", "=", phoneId)
      .select(["og.phoneDetails.photoUrls"])
      .executeTakeFirst();

    if (phoneDetails && phoneDetails.photoUrls && phoneDetails.photoUrls) {
      const updatedUrls = phoneDetails.photoUrls.filter(
        (url) => photoUrls.includes(url) && url !== coverPhotoUrl
      );
      if (updatedUrls.length > 0) {
        await db
          .updateTable("og.phoneDetails")
          .set({ photoUrls: photoUrls })
          .where("phoneIdFk", "=", phoneId)
          .execute();
      }
      // Update og.phone_details table
    }

    res.json({
      message: "Cover image shuffled successfully",
    });
  } catch (error) {
    console.error("Error shuffling cover image:", error);
    res.status(500).json({ message: "Error shuffling cover image" });
  }
};

export const updateListing = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const listingData = ogPhonesSchema.partial().parse(req.body);

    const updatedListing = await db
      .updateTable("og.phones")
      .set(listingData)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json(updatedListing);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid listing data", errors: error.errors });
    }
    console.error("Error updating listing:", error);
    res.status(500).json({ message: "Error updating listing" });
  }
};

export const deleteImages = async (req: Request, res: Response) => {
  try {
    const { urls, phoneId } = req.body;

    const results = await deleteImagesFromS3AndDB(urls, phoneId);

    res.json({ results });
  } catch (error) {
    console.error("Error deleting images:", error);
    res.status(500).json({ message: "Error deleting images" });
  }
};

export const deleteImagesAPI = async (req: Request, res: Response) => {
  try {
    const { urls, phoneId } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ message: "Invalid URLs provided" });
    }

    const results = await deleteImagesFromS3AndDB(urls, phoneId);

    res.json({ results });
  } catch (error) {
    console.error("Error deleting images via API:", error);
    res.status(500).json({ message: "Error deleting images" });
  }
};

export const deleteListing = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid listing ID" });
    }

    const deletedListing = await db
      .deleteFrom("og.phones")
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!deletedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.json({ message: "Listing deleted successfully", deletedListing });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ message: "Error deleting listing" });
  }
};
