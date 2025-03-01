// backend/src/test/phones.test.ts
import request from "supertest";
import { app } from "../server.mjs";
import { db } from "../db/database.mjs";
import { Phone } from "../db/zod/phones.zod.mjs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Phones API Endpoints", () => {
  let createdPhoneId: number;

  beforeAll(async () => {
    await db.deleteFrom("og.phones").execute();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe("GET /api/phones", () => {
    it("should return an empty array when no phones exist", async () => {
      const response = await request(app).get("/api/phones");
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return an array of phones when phones exist", async () => {
      const seedPhone: Phone = {
        userIdFk: 1,
        model: 12,
        createdDate: new Date("2024-03-15T10:00:00Z"),
        price: 500,
        status: 1,
        coverPhotoUrl: "https://example.com/phone.jpg",
        currency: "USD",
      } as Phone;

      await db.insertInto("og.phones").values(seedPhone).execute();
      const response = await request(app).get("/api/phones");
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/phones", () => {
    it("should create a new phone", async () => {
      const newPhone: Phone = {
        userIdFk: 1,
        model: 12,
        createdDate: new Date("2024-03-15T10:00:00Z"),
        price: 500,
        status: 1,
        coverPhotoUrl: "https://example.com/phone.jpg",
        currency: "USD",
      } as Phone;

      const response = await request(app).post("/api/phones").send(newPhone);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      createdPhoneId = response.body.id;
    });

    it("should return 400 for invalid phone data", async () => {
      const invalidPhone = {
        userIdFk: "invalid",
        model: 12,
        createdDate: "2024-03-15T10:00:00Z",
        price: 500,
        status: 1,
        coverPhotoUrl: "https://example.com/phone.jpg",
        currency: "USD",
      };

      const response = await request(app)
        .post("/api/phones")
        .send(invalidPhone);

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/phones/:id", () => {
    it("should return a phone by ID", async () => {
      const response = await request(app).get(`/api/phones/${createdPhoneId}`);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdPhoneId);
    });

    it("should return 404 for non-existent phone ID", async () => {
      const response = await request(app).get("/api/phones/9999");
      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/phones/:id", () => {
    it("should update a phone", async () => {
      const updatedPhone = {
        price: 600,
      };

      const response = await request(app)
        .put(`/api/phones/${createdPhoneId}`)
        .send(updatedPhone);

      expect(response.status).toBe(200);
      expect(response.body.price).toBe(600);
    });
  });

  describe("DELETE /api/phones/:id", () => {
    it("should delete a phone", async () => {
      const response = await request(app).delete(
        `/api/phones/${createdPhoneId}`
      );
      expect(response.status).toBe(200);
    });

    it("should return 404 for deleting a non-existent phone", async () => {
      const response = await request(app).delete(
        `/api/phones/${createdPhoneId}`
      );
      expect(response.status).toBe(404);
    });
  });
});
