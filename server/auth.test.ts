import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "./auth";

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
