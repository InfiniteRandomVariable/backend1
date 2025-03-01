// backend/src/api/phones.mts
import { Router } from "express";
import z from "zod";
import { db } from "../db/database.mjs";
import { type OgPhones } from "../db/kysely-types.d";
import { Phone, phoneSchema } from "../db/zod/phones.zod.mjs";
const router = Router();

// GET /api/phones - Get all phones
router.get("/", async (req, res) => {
  try {
    const phones = await db.selectFrom("og.phones").selectAll().execute();
    res.json(phones);
  } catch (error) {
    console.error("Error fetching phones:", error);
    res.status(500).json({ message: "Error fetching phones" });
  }
});

// GET /api/phones/:id - Get phone by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid phone ID" });
    }

    const phone = await db
      .selectFrom("og.phones")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!phone) {
      return res.status(404).json({ message: "Phone not found" });
    }

    // Validate the phone data against the Zod schema
    const validatedPhone = phoneSchema.parse(phone);

    res.json(validatedPhone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid phone data", errors: error.errors });
    }
    console.error("Error fetching phone by ID:", error);
    res.status(500).json({ message: "Error fetching phone" });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("creating phone1 ");

    const insertedPhone = await db
      .insertInto("og.phones")
      .values(req.body)
      .returningAll()
      .executeTakeFirst();

    console.log("creating phone3 ");
    if (!insertedPhone) {
      return res.status(500).json({ message: "Failed to create phone" });
    }
    console.log("creating phone4 ");
    res.status(201).json(insertedPhone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid phone data", errors: error.errors });
    }
    console.error("Error creating phone:", error);
    res.status(500).json({ message: "Error creating phone" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid phone ID" });
    }

    const updatedPhone: Phone = phoneSchema.partial().parse(req.body); // Use partial schema for updates

    const result = await db
      .updateTable("og.phones")
      .set(updatedPhone)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      return res.status(404).json({ message: "Phone not found" });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid phone data", errors: error.errors });
    }
    console.error("Error updating phone:", error);
    res.status(500).json({ message: "Error updating phone" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid phone ID" });
    }

    const result = await db
      .deleteFrom("og.phones")
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      return res.status(404).json({ message: "Phone not found" });
    }

    res.json({ message: "Phone deleted successfully", deletedPhone: result });
  } catch (error) {
    console.error("Error deleting phone:", error);
    res.status(500).json({ message: "Error deleting phone" });
  }
});
export default router;
