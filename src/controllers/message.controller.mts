// src/controllers/message.controller.mts
import { Request, Response } from "express";
import { db } from "../db/database.mts";

export const createMessageThreadController = async (
  req: Request,
  res: Response
) => {
  try {
    //TODO
    //enhance authentication.
    const authorUserIdFk = req.user?.id; // Get the logged-in user's ID
    if (!authorUserIdFk) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { receiverUserIdFk, phoneIdFk, productIdFk, title, message } =
      req.body;

    if (!receiverUserIdFk) {
      return res.status(400).json({ message: "Receiver user ID is required." });
    }

    if (typeof title !== "string" || title.length > 5) {
      return res.status(400).json({ message: "Title is required." });
    }

    if (!phoneIdFk && !productIdFk) {
      return res
        .status(400)
        .json({ message: "Either phone ID or product ID must be provided." });
    }

    if (phoneIdFk && productIdFk) {
      return res.status(400).json({
        message: "Only one of phone ID or product ID should be provided.",
      });
    }

    // Create the new post (thread)
    const newPost = await db
      .insertInto("og.posts")
      .values({
        authorUserIdFk: parseInt(authorUserIdFk, 10),
        receiverUserIdFk: parseInt(receiverUserIdFk, 10),
        phoneIdFk: phoneIdFk ? parseInt(phoneIdFk, 10) : null,
        productIdFk: productIdFk ? parseInt(productIdFk, 10) : null,
        title: title,
        createdBy: new Date(),
      })
      .returning("id") // Get the ID of the newly created post
      .executeTakeFirst();

    if (!newPost?.id) {
      return res
        .status(500)
        .json({ message: "Failed to create message thread." });
    }

    // Create the initial comment
    if (message) {
      await db
        .insertInto("og.comments")
        .values({
          postIdFk: newPost.id,
          commenterIdFk: parseInt(authorUserIdFk, 10),
          message: message,
          createdBy: new Date(), // Add the createdBy property with the current timestamp
        })
        .execute();
    }

    return res.status(201).json({
      message: "Message thread created successfully.",
      postId: newPost.id,
    });
  } catch (error: any) {
    console.error("Error creating message thread:", error);
    return res.status(500).json({
      message: "Failed to create message thread.",
      error: error.message,
    });
  }
};
