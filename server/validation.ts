import { z } from "zod";

export const createNameSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
});

export const createUserSchema = z.object({
	userName: z.string().min(1).max(100),
	preferences: z.record(z.string(), z.any()).optional(),
});

export const updateHideSchema = z.object({
	isHidden: z.boolean(),
});

export const updateLockSchema = z.object({
	lockedIn: z.boolean(),
});

export const batchHideSchema = z.object({
	nameIds: z.array(z.union([z.string(), z.number()])).max(100),
	isHidden: z.boolean(),
});

export const saveRatingsSchema = z.object({
	userId: z.string().uuid(),
	ratings: z
		.array(
			z.object({
				nameId: z.union([z.string(), z.number()]),
				rating: z.number(),
				wins: z.number().optional(),
				losses: z.number().optional(),
			}),
		)
		.min(1)
		.max(100),
});
