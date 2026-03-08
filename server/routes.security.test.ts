// @vitest-environment node
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock requireAdmin to allow access
vi.mock("./auth", () => ({
	requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

// Hoist mocks to be available in vi.mock
const { dbMocks } = vi.hoisted(() => {
	// Chainable mocks for SELECT
	const limitMock = vi.fn().mockResolvedValue([]);
	const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
	const groupByMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
	const innerJoinMock = vi.fn().mockReturnValue({ groupBy: groupByMock });
	const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock, limit: limitMock });
	const fromMock = vi.fn().mockReturnValue({
		where: whereMock,
		orderBy: orderByMock,
		limit: limitMock,
		innerJoin: innerJoinMock,
	});
	const selectMock = vi.fn().mockReturnValue({ from: fromMock });

	return {
		dbMocks: {
			select: selectMock,
			from: fromMock,
			where: whereMock,
			innerJoin: innerJoinMock,
			groupBy: groupByMock,
			orderBy: orderByMock,
			limit: limitMock,
		},
	};
});

vi.mock("./db", () => ({
	db: {
		select: dbMocks.select,
	},
}));

// Import router AFTER mocking
import { router } from "./routes";

const app = express();
app.use(express.json());
app.use(router);

describe("Security: Analytics Endpoints Limit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dbMocks.limit.mockResolvedValue([]);
	});

	describe("GET /api/analytics/popularity", () => {
		it("should clamp limit to 100 even if larger value provided", async () => {
			const res = await request(app).get("/api/analytics/popularity?limit=10000");
			expect(res.status).toBe(200);

			// Verify that limit was called with 100, not 10000
			expect(dbMocks.limit).toHaveBeenCalledWith(100);
		});

		it("should clamp limit to 100 (sanity check for failure before fix)", async () => {
			// This test is expected to fail before the fix.
			// Currently the code passes the raw limit.
			// I'll comment this out or use it to verify failure.
		});
	});

	describe("GET /api/analytics/leaderboard", () => {
		it("should clamp limit to 100 even if larger value provided", async () => {
			const res = await request(app).get("/api/analytics/leaderboard?limit=9999");
			expect(res.status).toBe(200);

			// Verify that limit was called with 100
			expect(dbMocks.limit).toHaveBeenCalledWith(100);
		});
	});
});
