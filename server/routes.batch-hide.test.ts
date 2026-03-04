// @vitest-environment node
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mock objects that are accessible inside vi.mock
const mocks = vi.hoisted(() => {
	return {
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue([{ id: 1 }]),
	};
});

vi.mock("./db", () => ({
	db: {
		update: mocks.update,
		set: mocks.set,
		where: mocks.where,
	},
}));

vi.mock("../shared/schema", () => ({
	catNameOptions: { id: "mock_id_column" },
	catAppUsers: {},
	catNameRatings: {},
	catTournamentSelections: {},
	userRoles: {},
}));

vi.mock("drizzle-orm", async () => {
	const actual = await vi.importActual("drizzle-orm");
	return {
		...actual,
		eq: vi.fn(),
		inArray: vi.fn(),
		and: vi.fn(),
		desc: vi.fn(),
		sql: vi.fn(),
	};
});

import { inArray } from "drizzle-orm";
// Import router AFTER mocking
import { router } from "./routes";

const app = express();
app.use(express.json());
// Mock requireAdmin middleware to pass through
vi.mock("./auth", () => ({
	requireAdmin: (_req: any, _res: any, next: any) => next(),
	requireUserAuth: (_req: any, _res: any, next: any) => next(),
}));
app.use(router);

describe("Batch Hide Endpoint", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset default mock implementations
		mocks.update.mockReturnThis();
		mocks.set.mockReturnThis();
		mocks.where.mockResolvedValue([{ id: 1 }]);
	});

	it("should perform batch update using inArray", async () => {
		const nameIds = [1, 2, 3];
		const isHidden = true;

		const res = await request(app).post("/api/names/batch-hide").send({ nameIds, isHidden });

		expect(res.status).toBe(200);
		expect(res.body.results).toHaveLength(3);
		expect(res.body.results[0].success).toBe(true);

		// Verify db calls
		expect(mocks.update).toHaveBeenCalledTimes(1);
		expect(mocks.set).toHaveBeenCalledWith({ isHidden });
		// Verify inArray was called
		expect(inArray).toHaveBeenCalledWith("mock_id_column", nameIds);
	});

	it("should handle empty nameIds array", async () => {
		const res = await request(app)
			.post("/api/names/batch-hide")
			.send({ nameIds: [], isHidden: true });

		expect(res.status).toBe(200);
		expect(res.body.results).toEqual([]);
		expect(mocks.update).not.toHaveBeenCalled();
	});

	it("should handle db errors", async () => {
		mocks.where.mockRejectedValueOnce(new Error("DB Error"));

		const nameIds = [1];
		const res = await request(app).post("/api/names/batch-hide").send({ nameIds, isHidden: true });

		expect(res.status).toBe(200);
		expect(res.body.results).toHaveLength(1);
		expect(res.body.results[0].success).toBe(false);
		expect(res.body.results[0].error).toContain("DB Error");
	});
});
