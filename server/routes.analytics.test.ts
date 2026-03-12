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

describe("Analytics Routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /api/analytics/site-stats", () => {
		it("should return correct site stats", async () => {
			// Create mock queries that are "thenable" (Promises) but also have the chainable methods
			// required by Drizzle (.from, .where, etc.)

			// Helper to create a chainable mock query
			const createMockQuery = (result: any[]) => {
				const promise = Promise.resolve(result);
				const mock: any = promise;

				mock.from = vi.fn().mockReturnThis();
				mock.where = vi.fn().mockReturnThis();

				return mock;
			};

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
});
