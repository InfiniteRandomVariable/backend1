// backend/src/controllers/admin.controller.mjs
import { Request, Response } from "express";
import z from "zod";
import { isDevEnviroment } from "../utils/commonUtil.mts";
import { db } from "../db/database.mts";
import { updateAuthStatusSchema } from "../db/zod/types.zod.mjs"; // Assuming you put schema in validation.mjs
import { AuthStatusPayload } from "../db/types.mts";
import { updateUserAuthStatusInDatabase } from "../db/queries/authStatus.queries.mjs"; // Import the new function

export const updateUserAuthStatusByAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId) || !isDevEnviroment()) {
      return res.status(400).json({ message: "Invalid userId provided." });
    }

    const authStatusData: AuthStatusPayload = updateAuthStatusSchema.parse(
      req.body
    );

    const updatePayload: AuthStatusPayload = {};

    if (authStatusData.isSeller !== undefined) {
      updatePayload.isSeller = authStatusData.isSeller;
    }
    if (authStatusData.isArbiter !== undefined) {
      updatePayload.isArbiter = authStatusData.isArbiter;
    }
    if (authStatusData.isStaffAdmin !== undefined) {
      // {{ edit_2 }}
      updatePayload.isStaffAdmin = authStatusData.isStaffAdmin; // {{ edit_2 }}
    }

    if (authStatusData.userStatus !== undefined) {
      // {{ edit_2 }}
      updatePayload.userStatus = authStatusData.userStatus; // {{ edit_2 }}
    }
    if (authStatusData.verifiedEmail !== undefined) {
      // {{ edit_2 }}
      updatePayload.verifiedEmail = authStatusData.verifiedEmail; // {{ edit_2 }}
    }
    if (authStatusData.verifiedPhone !== undefined) {
      // {{ edit_2 }}
      updatePayload.verifiedPhone = authStatusData.verifiedPhone; // {{ edit_2 }}
    }
    if (authStatusData.verifiedUserId !== undefined) {
      // {{ edit_2 }}
      updatePayload.verifiedUserId = authStatusData.verifiedUserId; // {{ edit_2 }}
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: "No status updates provided." });
    }

    const updatedAuthStatus = await updateUserAuthStatusInDatabase(
      userId,
      authStatusData
    ); // Call the reusable function

    if (!updatedAuthStatus) {
      return res
        .status(404)
        .json({ message: `Auth Status not found for userId: ${userId}` });
    }

    res.status(200).json(updatedAuthStatus);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid auth status data", errors: error.errors });
    }
    console.error("Error in updateUserAuthStatusByAdmin controller:", error); // Keep controller-specific error logging
    res.status(500).json({ message: "Error updating auth status" });
  }
};
