/**
 * @module authAdapter
 * @description Simple authentication adapter for the naming tournament app.
 *
 * This is a basic auth implementation that recognizes "Aaron" as an admin
 * and treats any other username as a regular user. No real authentication
 * - just username-based role detection for demo purposes.
 */

import type { AuthAdapter, AuthUser, LoginCredentials } from "@/app/providers/Providers";
import { api } from "@/services/apiClient";
import { resolveSupabaseClient } from "@/services/supabase/runtime";
import { STORAGE_KEYS } from "@/shared/lib/constants";

// Simple admin usernames - can be expanded as needed
const ADMIN_USERNAMES = ["Aaron", "admin", "administrator"];

function isKnownAdminUser(userName: string): boolean {
	return ADMIN_USERNAMES.some((admin) => admin.toLowerCase() === userName.toLowerCase());
}

async function getSupabaseAdminStatus(userName: string): Promise<boolean | null> {
	try {
		const client = await resolveSupabaseClient();
		if (!client) {
			return null;
		}

		try {
			await client.rpc("set_user_context", { user_name_param: userName });
		} catch {
			/* ignore */
		}

		const { data, error } = await client.rpc("is_admin");
		if (error) {
			return null;
		}

		return Boolean(data);
	} catch {
		return null;
	}
}

export const authAdapter: AuthAdapter = {
	/**
	 * Get current user from localStorage or return null
	 */
	async getCurrentUser(): Promise<AuthUser | null> {
		if (typeof window === "undefined") {
			return null;
		}

		const userName = localStorage.getItem(STORAGE_KEYS.USER);
		const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);

		if (!userName) {
			return null;
		}

		const supabaseIsAdmin = await getSupabaseAdminStatus(userName);
		// Use OR logic: admin if Supabase says so OR if in the local admin list.
		// Previously used ?? which only fell through on null, meaning a Supabase
		// "false" (user_roles row missing) would override the local admin list.
		const isAdmin = supabaseIsAdmin === true || isKnownAdminUser(userName);
		console.log(`[AuthAdapter] User: ${userName}, SupabaseAdmin: ${supabaseIsAdmin}, LocalAdmin: ${isKnownAdminUser(userName)}, Final: ${isAdmin}`);

		return {
			id: userId || userName,
			name: userName,
			email: undefined,
			isAdmin: isAdmin,
			role: isAdmin ? "admin" : "user",
		};
	},

	/**
	 * Login with username (simple implementation)
	 */
	async login(credentials: LoginCredentials): Promise<boolean> {
		const userName = credentials.name?.trim();
		if (!userName) {
			return false;
		}

		try {
			// Upsert user and get ID
			const response = await api.post<{ success: boolean; data: any }>("/users", {
				userName,
			});
			if (response.success && response.data?.userId) {
				localStorage.setItem(STORAGE_KEYS.USER_ID, response.data.userId);
			}
		} catch (e) {
			console.error("Failed to register user", e);
		}

		// Store username in localStorage (must match STORAGE_KEYS.USER for consistency with appStore)
		localStorage.setItem(STORAGE_KEYS.USER, userName);
		return true;
	},

	/**
	 * Logout - clear stored user data
	 */
	async logout(): Promise<void> {
		if (typeof window !== "undefined") {
			localStorage.removeItem(STORAGE_KEYS.USER);
			localStorage.removeItem(STORAGE_KEYS.USER_ID);
		}
	},

	/**
	 * Register - not implemented in this simple auth system
	 */
	async register(): Promise<void> {
		// No-op for this simple implementation
		throw new Error("Registration not implemented in this demo auth system");
	},

	/**
	 * Check if a user is admin based on username
	 */
	async checkAdminStatus(userIdOrName: string): Promise<boolean> {
		const normalized = userIdOrName?.trim();
		if (!normalized) {
			return false;
		}

		const supabaseIsAdmin = await getSupabaseAdminStatus(normalized);
		return supabaseIsAdmin === true || isKnownAdminUser(normalized);
	},
};
