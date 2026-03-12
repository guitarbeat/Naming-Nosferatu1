// @vitest-environment node
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock requireAdmin to allow access
vi.mock("./auth", () => ({
	requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

// Hoist mock factory
const { dbMocks } = vi.hoisted(() => {
	const selectMock = vi.fn();
	return {
		dbMocks: {
			select: selectMock,
		},
	};
});

vi.mock("./db", () => ({
	db: {
		select: dbMocks.select,
	},
}));

import { router } from "./routes";

const app = express();
app.use(express.json());
app.use(router);

function buildRecentDateKeys(days: number): string[] {
	const endDate = new Date();
	endDate.setUTCHours(0, 0, 0, 0);

	return Array.from({ length: days }, (_, index) => {
		const date = new Date(endDate);
		date.setUTCDate(endDate.getUTCDate() - (days - 1 - index));
		return date.toISOString().slice(0, 10);
	});
}

function createMockQuery(result: any[]) {
	const promise = Promise.resolve(result);
	const mock: any = promise;

	mock.from = vi.fn().mockReturnThis();
	mock.where = vi.fn().mockReturnThis();
	mock.groupBy = vi.fn().mockReturnThis();
	mock.orderBy = vi.fn().mockReturnThis();

	return mock;
}

describe("Analytics Routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /api/analytics/site-stats", () => {
		it("should return correct site stats", async () => {
			// Query 1: Total Names
			const query1 = createMockQuery([{ count: 10 }]);
			// Query 2: Total Ratings
			const query2 = createMockQuery([{ count: 20 }]);
			// Query 3: Total Users
			const query3 = createMockQuery([{ count: 5 }]);

			dbMocks.select
				.mockReturnValueOnce(query1)
				.mockReturnValueOnce(query2)
				.mockReturnValueOnce(query3);

			const res = await request(app).get("/api/analytics/site-stats");

			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				totalNames: 10,
				totalRatings: 20,
				totalUsers: 5,
			});

			expect(dbMocks.select).toHaveBeenCalledTimes(3);
		});

		it("should handle database errors gracefully", async () => {
			const createErrorQuery = () => {
				// Create a "thenable" object instead of a real Promise to avoid
				// "Unhandled Rejection" warnings during test setup.
				// This object behaves like a rejected promise when awaited.
				const mock: any = {
					// biome-ignore lint/suspicious/noThenProperty: mocking thenable behavior
					then: (_resolve: any, reject: any) => reject(new Error("DB Error")),
					catch: (reject: any) => reject(new Error("DB Error")),
				};

				mock.from = vi.fn().mockReturnThis();
				mock.where = vi.fn().mockReturnThis();
				return mock;
			};

			dbMocks.select.mockReturnValue(createErrorQuery());

			const res = await request(app).get("/api/analytics/site-stats");
			expect(res.status).toBe(500);
			expect(res.body).toHaveProperty("error");
		});
	});

	describe("GET /api/analytics/activity-trend", () => {
		it("should return a filled daily activity trend", async () => {
			const dates = buildRecentDateKeys(3);

			dbMocks.select
				.mockReturnValueOnce(
					createMockQuery([
						{ date: dates[0], selectionCount: 4 },
						{ date: dates[2], selectionCount: 9 },
					]),
				)
				.mockReturnValueOnce(createMockQuery([{ date: dates[2], activeUsers: 3 }]))
				.mockReturnValueOnce(
					createMockQuery([
						{ date: dates[1], uniqueNames: 2 },
						{ date: dates[2], uniqueNames: 5 },
					]),
				);

			const res = await request(app).get("/api/analytics/activity-trend?days=3");

			expect(res.status).toBe(200);
			expect(res.body).toEqual([
				{ date: dates[0], selectionCount: 4, activeUsers: 0, uniqueNames: 0 },
				{ date: dates[1], selectionCount: 0, activeUsers: 0, uniqueNames: 2 },
				{ date: dates[2], selectionCount: 9, activeUsers: 3, uniqueNames: 5 },
			]);
			expect(dbMocks.select).toHaveBeenCalledTimes(3);
		});

		it("should handle activity trend database errors gracefully", async () => {
			const createErrorQuery = () => {
				const mock: any = {
					// biome-ignore lint/suspicious/noThenProperty: mocking thenable behavior
					then: (_resolve: any, reject: any) => reject(new Error("DB Error")),
					catch: (reject: any) => reject(new Error("DB Error")),
				};

				mock.from = vi.fn().mockReturnThis();
				mock.where = vi.fn().mockReturnThis();
				mock.groupBy = vi.fn().mockReturnThis();
				mock.orderBy = vi.fn().mockReturnThis();
				return mock;
			};

			dbMocks.select.mockReturnValue(createErrorQuery());

			const res = await request(app).get("/api/analytics/activity-trend");

			expect(res.status).toBe(500);
			expect(res.body).toHaveProperty("error");
		});
	});
});
