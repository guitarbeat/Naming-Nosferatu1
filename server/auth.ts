import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
	const apiKey = req.headers["x-admin-key"];

	if (!process.env.ADMIN_API_KEY) {
		console.error("ADMIN_API_KEY is not set in environment variables");
		return res.status(500).json({ error: "Server configuration error" });
	}

	if (typeof apiKey !== "string") {
		return res.status(401).json({ error: "Unauthorized: Invalid or missing admin key" });
	}

	const expectedKey = process.env.ADMIN_API_KEY;
	const providedKeyBuffer = Buffer.from(apiKey);
	const expectedKeyBuffer = Buffer.from(expectedKey);

	if (providedKeyBuffer.length !== expectedKeyBuffer.length) {
		return res.status(401).json({ error: "Unauthorized: Invalid or missing admin key" });
	}

	if (!crypto.timingSafeEqual(providedKeyBuffer, expectedKeyBuffer)) {
		return res.status(401).json({ error: "Unauthorized: Invalid or missing admin key" });
	}

	next();
};
