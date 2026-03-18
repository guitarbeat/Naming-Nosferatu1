import type { NextFunction, Request, Response } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
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
					preferences: any | null;
					updated_at: string;
					user_id: string;
					user_name: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					is_deleted?: boolean;
					preferences?: any | null;
					updated_at?: string;
					user_id?: string;
					user_name?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					is_deleted?: boolean;
					preferences?: any | null;
					updated_at?: string;
					user_id?: string;
					user_name?: string;
				};
				Relationships: [];
			};
		};
	};
}

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
}

// Create Supabase client
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
	},
});

// Validation schemas
const authHeaderSchema = z.object({
	authorization: z.string().min(1, "Authorization header is required"),
});

export interface AuthenticatedRequest {
	user: {
		id: string;
		email?: string;
		user_name?: string;
	};
}

// Extend Express Request type to include user property
declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				email?: string;
				user_name?: string;
			};
		}
	}
}

/**
 * Middleware to verify Supabase JWT tokens and attach user to request
 */
export const requireSupabaseAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		// Get authorization header
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ error: "Missing authorization header" });
		}

		// Validate header format
		const { authorization } = authHeaderSchema.parse({ authorization: authHeader });

		// Extract token from Bearer format
		const token = authorization.replace(/^Bearer\s+/, "");
		if (!token) {
			return res.status(401).json({ error: "Invalid authorization header format" });
		}

		// Verify token with Supabase
		const { data: { user }, error } = await supabase.auth.getUser(token);

		if (error || !user) {
			return res.status(401).json({ 
				error: "Invalid or expired token",
				details: error?.message 
			});
		}

		// Attach user to request object
		req.user = {
			id: user.id,
			email: user.email,
			user_name: user.user_metadata?.user_name || user.email,
		};

		next();
	} catch (error) {
		console.error("Auth middleware error:", error);
		return res.status(500).json({ error: "Authentication error" });
	}
};

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
export const optionalSupabaseAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return next();
		}

		const { authorization } = authHeaderSchema.parse({ authorization: authHeader });
		const token = authorization.replace(/^Bearer\s+/, "");
		
		if (!token) {
			return next();
		}

		const { data: { user }, error } = await supabase.auth.getUser(token);

		if (error || !user) {
			return next();
		}

		req.user = {
			id: user.id,
			email: user.email,
			user_name: user.user_metadata?.user_name || user.email,
		};

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
		const { data: { user }, error } = await supabase.auth.getUser(token);
		
		if (error || !user) {
			return null;
		}

		return {
			id: user.id,
			email: user.email,
			user_name: user.user_metadata?.user_name || user.email,
		};
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
		const { data, error } = await supabase
			.from("user_roles")
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

export { supabase };
