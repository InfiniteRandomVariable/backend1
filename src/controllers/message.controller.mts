// src/controllers/message.controller.mts
import { Request, Response } from "express";
import { db } from "../db/database.mts";
import { sanitizeString, extractUserInfo } from "../utils/commonUtil.mts";
import { UserRolesEnum } from "../db/types.mts";

import {
  createMessageThreadSchema,
  createMessageCommentSchema,
} from "../db/zod/types.zod.mjs";
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

    const parsedBody = createMessageThreadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Invalid request body. 24",
        errors: parsedBody.error.issues,
      });
    }

    const {
      receiverUserIdFk,
      phoneIdFk,
      productIdFk,
      title,
      message,
      disputeIdFk,
    } = parsedBody.data;
    if (!receiverUserIdFk) {
      return res.status(400).json({ message: "Receiver user ID is required." });
    }

    const _title = sanitizeString(title);
    const _message = sanitizeString(message);

    if (typeof _title !== "string" || _title.length > 5) {
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
        authorUserIdFk: authorUserIdFk,
        receiverUserIdFk: receiverUserIdFk,
        phoneIdFk: phoneIdFk,
        productIdFk: productIdFk,
        disputeIdFk: disputeIdFk,
        title: _title,
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
          message: _message,
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
export const createMessageCommentController = async (
  req: Request,
  res: Response
) => {
  try {
    const files = req.payload;
    let photoUrl;
    if (
      Array.isArray(files) &&
      files.length > 0 &&
      typeof files[0] === "string"
    ) {
      photoUrl = files[0];
    }

    const commenterUserIdFk = req.user?.id;
    if (!commenterUserIdFk || typeof commenterUserIdFk !== "number") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const postId = parseInt(req.params.postId, 10);

    const parsedBody = createMessageCommentSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        message: "Invalid request body.",
        errors: parsedBody.error.issues,
      });
    }

    const { message } = parsedBody.data;
    const sanitizedMessage = sanitizeString(message);

    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    // Fetch the post to check authorization
    const post = await db
      .selectFrom("og.posts")
      .select(["authorUserIdFk", "receiverUserIdFk"])
      .where("id", "=", postId)
      .executeTakeFirst();

    if (!post) {
      return res.status(404).json({ message: "Message thread not found." });
    }

    // Check if the commenter is authorized to post in this thread
    if (
      commenterUserIdFk !== post.authorUserIdFk &&
      commenterUserIdFk !== post.receiverUserIdFk
    ) {
      return res.status(403).json({
        message:
          "Forbidden - You are not authorized to comment on this thread.",
      });
    }

    // Proceed with inserting the comment if authorized
    await db
      .insertInto("og.comments")
      .values({
        postIdFk: postId,
        commenterIdFk: commenterUserIdFk,
        message: sanitizedMessage || null,
        photoUrl: photoUrl,
        createdBy: new Date(),
      })
      .execute();

    return res.status(201).json({ message: "Comment added successfully." });
  } catch (error: any) {
    console.error("Error adding comment:", error);
    return res
      .status(500)
      .json({ message: "Failed to add comment.", error: error.message });
  }
};

export const getMessageCommentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userInfo = extractUserInfo(req);
    // const userRoles = userInfo && userInfo.userRoles? userInfo.userRoles : null;

    //console.log("req.params:", req.params);
    const userId = userInfo.userId;
    const userRoles = userInfo.userRoles;

    const postId = parseInt(req.params.postId, 10);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    // Fetch the post to check authorization
    const post = await db
      .selectFrom("og.posts")
      .select(["authorUserIdFk", "receiverUserIdFk"])
      .where("id", "=", postId)
      .executeTakeFirst();

    if (!post) {
      return res.status(404).json({ message: "Message thread not found." });
    }

    // Authorization check
    const isAuthorized =
      userId === post.authorUserIdFk ||
      userId === post.receiverUserIdFk ||
      userRoles.includes(UserRolesEnum.Admin) ||
      userRoles.includes(UserRolesEnum.Staff);

    if (!isAuthorized) {
      return res.status(403).json({
        message:
          "Forbidden - You are not authorized to view comments for this thread.",
      });
    }

    const comments = await db
      .selectFrom("og.comments")
      .select([
        "id",
        "postIdFk",
        "commenterIdFk",
        "message",
        "photoUrl",
        "createdBy",
      ])
      .where("postIdFk", "=", postId)
      .orderBy("createdBy", "desc")
      .execute();

    return res.status(200).json(comments);
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch comments.", error: error.message });
  }
};
export const getUserMessageThreadsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "10", 50);
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return res
        .status(400)
        .json({ message: "Invalid pagination parameters." });
    }

    const threads = await db
      .selectFrom("og.posts")
      .leftJoin("og.users as author", "og.posts.authorUserIdFk", "author.id")
      .leftJoin(
        "og.users as receiver",
        "og.posts.receiverUserIdFk",
        "receiver.id"
      )
      .select([
        "og.posts.id",
        "og.posts.title",
        "og.posts.authorUserIdFk",
        "author.uName as authorUName",
        "og.posts.receiverUserIdFk",
        "receiver.uName as receiverUName",
        "og.posts.phoneIdFk",
        "og.posts.productIdFk",
        "og.posts.createdBy",
      ])
      .where((eb) =>
        eb("og.posts.authorUserIdFk", "=", parseInt(userId, 10)).or(
          eb("og.posts.receiverUserIdFk", "=", parseInt(userId, 10))
        )
      )
      .orderBy("og.posts.createdBy", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    const totalCountResult = await db
      .selectFrom("og.posts")
      .select(({ fn }) => fn.countAll().as("total"))
      .where((eb) =>
        eb("authorUserIdFk", "=", parseInt(userId, 10)).or(
          eb("receiverUserIdFk", "=", parseInt(userId, 10))
        )
      )
      .executeTakeFirst();

    const totalCount = totalCountResult?.total || 0;

    return res.status(200).json({
      threads,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error: any) {
    console.error("Error fetching user message threads:", error);
    return res
      .status(500)
      .json({
        message: "Failed to fetch message threads.",
        error: error.message,
      });
  }
};
