import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

// Local Database interface for Supabase auth
interface Database {
	public: {
		Tables: {
			cat_app_users: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					is_deleted: boolean;
					preferences: unknown | null;
					updated_at: string;
					user_id: string;
					user_name: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					is_deleted?: boolean;
					preferences?: unknown | null;
					updated_at?: string;
					user_id?: string;
					user_name?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					is_deleted?: boolean;
					preferences?: unknown | null;
					updated_at?: string;
					user_id?: string;
					user_name?: string;
				};
				Relationships: [];
			};
			cat_user_roles: {
				Row: {
					role: string;
					user_id: string | null;
				};
				Insert: {
					role: string;
					user_id?: string | null;
				};
				Update: {
					role?: string;
					user_id?: string | null;
				};
				Relationships: [];
			};
		};
	};
}

const SUPABASE_CONFIG_ERROR =
	"SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required";

type ServerSupabaseClient = SupabaseClient<Database>;

interface AuthenticatedUser {
	id: string;
	email?: string;
	user_name?: string;
}

let supabaseClient: ServerSupabaseClient | null | undefined;

function resolveServerSupabaseClient(): ServerSupabaseClient | null {
	if (supabaseClient !== undefined) {
		return supabaseClient;
	}

	const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseServiceKey) {
		supabaseClient = null;
		return null;
	}

	supabaseClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});

	return supabaseClient;
}

function mapAuthenticatedUser(user: {
	id: string;
	email?: string | null;
	user_metadata?: { user_name?: string | null } | null;
}): AuthenticatedUser {
	return {
		id: user.id,
		email: user.email ?? undefined,
		user_name: user.user_metadata?.user_name ?? user.email ?? undefined,
	};
}

// Validation schemas
const authHeaderSchema = z.object({
	authorization: z.string().min(1, "Authorization header is required"),
});

declare module "express-serve-static-core" {
	interface Request {
		user?: AuthenticatedUser;
	}
}

/**
 * Middleware to verify Supabase JWT tokens and attach user to request
 */
export const requireSupabaseAuth = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Get authorization header
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ error: "Missing authorization header" });
		}

		// Validate header format
		const { authorization } = authHeaderSchema.parse({ authorization: authHeader });

		// Extract token from Bearer format
		const token = authorization.replace(/^Bearer\s+/, "").trim();
		if (!token) {
			return res.status(401).json({ error: "Invalid authorization header format" });
		}

		const supabase = resolveServerSupabaseClient();
		if (!supabase) {
			return res.status(503).json({
				error: "Authentication service unavailable",
				details: SUPABASE_CONFIG_ERROR,
			});
		}

		// Verify token with Supabase
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);

		if (error || !user) {
			return res.status(401).json({
				error: "Invalid or expired token",
				details: error?.message,
			});
		}

		// Attach user to request object
		req.user = mapAuthenticatedUser(user);

		next();
	} catch (error) {
		console.error("Auth middleware error:", error);
		return res.status(500).json({ error: "Authentication error" });
	}
};

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
export const optionalSupabaseAuth = async (req: Request, _res: Response, next: NextFunction) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return next();
		}

		const { authorization } = authHeaderSchema.parse({ authorization: authHeader });
		const token = authorization.replace(/^Bearer\s+/, "").trim();

		if (!token) {
			return next();
		}

		const supabase = resolveServerSupabaseClient();
		if (!supabase) {
			return next();
		}

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);

		if (error || !user) {
			return next();
		}

		req.user = mapAuthenticatedUser(user);

		next();
	} catch (error) {
		console.error("Optional auth middleware error:", error);
		next();
	}
};

/**
 * Get current user from Supabase session
 */
export const getCurrentSupabaseUser = async (token: string) => {
	try {
		const supabase = resolveServerSupabaseClient();
		if (!supabase) {
			return null;
		}

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);

		if (error || !user) {
			return null;
		}

		return mapAuthenticatedUser(user);
	} catch (error) {
		console.error("Error getting current user:", error);
		return null;
	}
};

/**
 * Check if user has admin role in Supabase
 */
export const isSupabaseAdmin = async (userId: string): Promise<boolean> => {
	try {
		const supabase = resolveServerSupabaseClient();
		if (!supabase) {
			return false;
		}

		const { data, error } = await supabase
			.from("cat_user_roles")
			.select("role")
			.eq("user_id", userId)
			.eq("role", "admin")
			.single();

		if (error || !data) {
			return false;
		}

		return true;
	} catch (error) {
		console.error("Error checking admin status:", error);
		return false;
	}
};
