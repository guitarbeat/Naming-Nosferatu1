import { z } from "zod";

const numericIdSchema = z.coerce.number().int().positive().max(1000000);

const ratingValueSchema = z.number().min(1000).max(3000);

const userIdSchema = z
	.string()
	.min(1)
	.max(100)
	.regex(/^[a-zA-Z0-9_-]+$/, {
		message: "User ID can only contain alphanumeric characters, underscores, and hyphens",
	});

export const createNameSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-zA-Z\s\-']+$/, {
			message: "Name can only contain letters, spaces, hyphens, and apostrophes",
		}),
	description: z.string().max(500).optional(),
});

export const createUserSchema = z.object({
	userName: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-zA-Z0-9_-]+$/, {
			message: "Username can only contain alphanumeric characters, underscores, and hyphens",
		}),
	preferences: z.record(z.string(), z.unknown()).optional(),
});

export const updateHideSchema = z.object({
	isHidden: z.boolean(),
});

export const updateLockSchema = z.object({
	lockedIn: z.boolean(),
});

export const batchHideSchema = z.object({
	nameIds: z.array(numericIdSchema).max(100),
	isHidden: z.boolean(),
});

export const saveRatingsSchema = z.object({
	userId: userIdSchema,
	ratings: z
		.array(
			z.object({
				nameId: numericIdSchema,
				rating: ratingValueSchema,
				wins: z.number().int().min(0).max(1000).optional(),
				losses: z.number().int().min(0).max(1000).optional(),
			}),
		)
		.min(1)
		.max(50), // Reduced from 100 to prevent DoS
});

export const imageUploadSchema = z.object({
	image: z.any().refine(
		(file) => {
			if (!(file instanceof File)) {
				return false;
			}
			const maxSize = 5 * 1024 * 1024; // 5MB
			const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
			return file.size <= maxSize && allowedTypes.includes(file.type);
		},
		{
			message: "Image must be a file under 5MB and be JPEG, PNG, GIF, or WebP format",
		},
	),
	userName: userIdSchema,
});

export type CreateNameInput = z.infer<typeof createNameSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateHideInput = z.infer<typeof updateHideSchema>;
export type UpdateLockInput = z.infer<typeof updateLockSchema>;
export type BatchHideInput = z.infer<typeof batchHideSchema>;
export type SaveRatingsInput = z.infer<typeof saveRatingsSchema>;
