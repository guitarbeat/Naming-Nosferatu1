// @vitest-environment node
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { router } from "./routes";

// Mock the database module
vi.mock("./db", () => ({
	db: null, // Start with no DB to test fallback/mock mode
}));

const app = express();
app.use(express.json());
app.use(router);

describe("Server Routes", () => {
	describe("GET /api/names", () => {
		it("should return mock names when db is unavailable", async () => {
			const res = await request(app).get("/api/names");
			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
			expect(res.body.length).toBeGreaterThan(0);
			expect(res.body[0]).toHaveProperty("name");
		});
	});

	describe("POST /api/names", () => {
		it("should create a name (mock) when db is unavailable", async () => {
			const newName = {
				name: "Test Cat",
				description: "A test cat",
				status: "candidate",
			};

			const res = await request(app).post("/api/names").send(newName);
			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data.name).toBe(newName.name);
		});

		it("should validate input", async () => {
			const invalidName = {
				description: "Missing name",
			};

			const res = await request(app).post("/api/names").send(invalidName);
			expect(res.status).toBe(400);
			expect(res.body.success).toBe(false);
		});
	});

	describe("Analytics Endpoints", () => {
		it("should return popularity data (mock)", async () => {
			const res = await request(app).get("/api/analytics/popularity");
			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
		});

		it("should return ranking history (mock)", async () => {
			const res = await request(app).get("/api/analytics/ranking-history");
			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
		});

		it("should return leaderboard (mock) with correct structure", async () => {
			const res = await request(app).get("/api/analytics/leaderboard");
			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
			expect(res.body.length).toBeGreaterThan(0);
			// Mock data uses camelCase, real DB uses snake_case.
			// In mock mode, we expect what the mock returns.
			expect(res.body[0]).toHaveProperty("nameId");
			expect(res.body[0]).toHaveProperty("avgRating");
		});

		it("should return site stats (mock)", async () => {
			const res = await request(app).get("/api/analytics/site-stats");
			expect(res.status).toBe(200);
			expect(res.body).toHaveProperty("totalNames");
		});
	});
});
