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
	const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock, limit: limitMock });
	const fromMock = vi
		.fn()
		.mockReturnValue({ where: whereMock, orderBy: orderByMock, limit: limitMock });
	const selectMock = vi.fn().mockReturnValue({ from: fromMock });

	// Chainable mocks for INSERT
	const returningMock = vi.fn().mockResolvedValue([{ id: "123", name: "Test Cat" }]);
	// onConflictDoUpdate needs to be chainable to returning, or just awaitable
	// To make it awaitable (Promise-like) AND chainable, we can return the promise which has .returning attached?
	// Or just verify the chain structure. Drizzle usually returns a query builder.
	const onConflictDoUpdateMock = vi.fn().mockReturnValue({ returning: returningMock });
	// valuesMock returns object with both returning and onConflictDoUpdate
	const valuesMock = vi.fn().mockReturnValue({
		returning: returningMock,
		onConflictDoUpdate: onConflictDoUpdateMock,
	});
	const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

	// Chainable mocks for DELETE
	const deleteWhereMock = vi.fn().mockResolvedValue([]);
	const deleteMock = vi.fn().mockReturnValue({ where: deleteWhereMock });

	// Chainable mocks for UPDATE
	const updateWhereMock = vi.fn().mockResolvedValue([]);
	const updateSetMock = vi.fn().mockReturnValue({ where: updateWhereMock });
	const updateMock = vi.fn().mockReturnValue({ set: updateSetMock });

	return {
		dbMocks: {
			select: selectMock,
			from: fromMock,
			where: whereMock,
			orderBy: orderByMock,
			limit: limitMock,
			insert: insertMock,
			values: valuesMock,
			returning: returningMock,
			delete: deleteMock,
			deleteWhere: deleteWhereMock,
			update: updateMock,
			updateSet: updateSetMock,
			updateWhere: updateWhereMock,
		},
	};
});

vi.mock("./db", () => ({
	db: {
		select: dbMocks.select,
		insert: dbMocks.insert,
		delete: dbMocks.delete,
		update: dbMocks.update,
	},
}));

// Import router AFTER mocking
import { router } from "./routes";

const app = express();
app.use(express.json());
app.use(router);

describe("Server Routes (DB Mode)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dbMocks.limit.mockResolvedValue([]);
		dbMocks.returning.mockResolvedValue([]);
		dbMocks.deleteWhere.mockResolvedValue([]);
		dbMocks.updateWhere.mockResolvedValue([]);
	});

	describe("GET /api/names", () => {
		it("should fetch names from DB with correct chaining", async () => {
			const mockNames = [
				{ id: "1", name: "Cat 1", isActive: true, avgRating: 1600 },
				{ id: "2", name: "Cat 2", isActive: true, avgRating: 1500 },
			];
			dbMocks.limit.mockResolvedValue(mockNames);

			const res = await request(app).get("/api/names");

			expect(res.status).toBe(200);
			expect(res.body).toEqual(mockNames);
			expect(dbMocks.select).toHaveBeenCalled();
			expect(dbMocks.from).toHaveBeenCalled();
			expect(dbMocks.where).toHaveBeenCalled();
			expect(dbMocks.orderBy).toHaveBeenCalled();
			expect(dbMocks.limit).toHaveBeenCalledWith(1000);
		});
	});

	describe("POST /api/names", () => {
		it("should insert a new name into DB", async () => {
			const newName = { name: "New Cat", description: "Desc" };
			const insertedCat = { ...newName, id: "123", status: "candidate" };
			dbMocks.returning.mockResolvedValue([insertedCat]);

			const res = await request(app).post("/api/names").send(newName);

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.data).toEqual(insertedCat);
			expect(dbMocks.insert).toHaveBeenCalled();
			expect(dbMocks.values).toHaveBeenCalledWith(
				expect.objectContaining({ name: "New Cat", description: "Desc" }),
			);
			expect(dbMocks.returning).toHaveBeenCalled();
		});

		it("should handle validation errors", async () => {
			const res = await request(app).post("/api/names").send({});
			expect(res.status).toBe(400);
			expect(dbMocks.insert).not.toHaveBeenCalled();
		});
	});

	describe("DELETE /api/names/:id", () => {
		it("should delete name from DB (soft delete)", async () => {
			const res = await request(app).delete("/api/names/123");
			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			// Soft delete uses update, not delete
			expect(dbMocks.update).toHaveBeenCalled();
			expect(dbMocks.updateSet).toHaveBeenCalled();
			expect(dbMocks.updateWhere).toHaveBeenCalled();
		});
	});

	describe("POST /api/ratings", () => {
		it("should insert ratings in a single batch", async () => {
			// Schema expects 'nameId', not 'name' in ratings array
			const ratings = [
				{ nameId: "id1", rating: 1500, wins: 1 },
				{ nameId: "id2", rating: 1600, wins: 0 },
			];

			const mockQuery = Promise.resolve([]) as any;
			mockQuery.returning = dbMocks.returning;
			// Mock onConflictDoUpdate to return a thenable
			mockQuery.onConflictDoUpdate = vi.fn().mockResolvedValue([]);
			dbMocks.values.mockReturnValue(mockQuery);

			// Note: validation schema requires userId to be a valid UUID
			const res = await request(app).post("/api/ratings").send({
				userId: "00000000-0000-0000-0000-000000000000",
				ratings,
			});

			expect(res.status).toBe(200);
			expect(dbMocks.insert).toHaveBeenCalledTimes(1);
			const firstCallArg = dbMocks.values.mock.calls[0][0];
			expect(Array.isArray(firstCallArg)).toBe(true);
			expect(firstCallArg.length).toBe(ratings.length);
		});
	});
});
