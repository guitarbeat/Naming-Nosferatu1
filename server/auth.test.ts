import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin, requireUserAuth } from "./auth";

describe("requireAdmin middleware", () => {
	let req: any;
	let res: any;
	let next: any;
	const originalEnv = process.env;

	beforeEach(() => {
		req = { headers: {} };
		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
		next = vi.fn();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should return 500 if ADMIN_API_KEY is not set", () => {
		process.env.ADMIN_API_KEY = undefined;
		requireAdmin(req, res, next);
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.stringContaining("configuration error"),
			}),
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("should return 401 if x-admin-key header is missing", () => {
		process.env.ADMIN_API_KEY = "secret";
		requireAdmin(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ error: expect.stringContaining("Unauthorized") }),
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("should return 401 if x-admin-key header is not a string", () => {
		process.env.ADMIN_API_KEY = "secret";
		req.headers["x-admin-key"] = ["secret"]; // Array of strings
		requireAdmin(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ error: expect.stringContaining("Unauthorized") }),
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("should return 401 if x-admin-key header has different length", () => {
		process.env.ADMIN_API_KEY = "secret";
		req.headers["x-admin-key"] = "secret123";
		requireAdmin(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("should return 401 if x-admin-key header has same length but different content", () => {
		process.env.ADMIN_API_KEY = "secret";
		req.headers["x-admin-key"] = "secreX";
		requireAdmin(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("should call next() if x-admin-key header is correct", () => {
		process.env.ADMIN_API_KEY = "secret";
		req.headers["x-admin-key"] = "secret";
		requireAdmin(req, res, next);
		expect(res.status).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalled();
	});
});

describe("requireUserAuth middleware", () => {
	let req: any;
	let res: any;
	let next: any;

	beforeEach(() => {
		req = { headers: {}, body: {} };
		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
		next = vi.fn();
	});

	it("should return 401 if x-user-id header is missing", () => {
		req.body = { userId: "user-123" };
		requireUserAuth(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ error: expect.stringContaining("Unauthorized") }),
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("should return 403 if x-user-id header does not match body userId", () => {
		req.headers["x-user-id"] = "user-456";
		req.body = { userId: "user-123" };
		requireUserAuth(req, res, next);
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ error: expect.stringContaining("Forbidden") }),
		);
		expect(next).not.toHaveBeenCalled();
	});

	it("should call next() if x-user-id header matches body userId", () => {
		req.headers["x-user-id"] = "user-123";
		req.body = { userId: "user-123" };
		requireUserAuth(req, res, next);
		expect(res.status).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalled();
	});

	it("should call next() if x-user-id header is present and body has no userId", () => {
		req.headers["x-user-id"] = "user-123";
		req.body = {};
		requireUserAuth(req, res, next);
		expect(res.status).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalled();
	});
});
