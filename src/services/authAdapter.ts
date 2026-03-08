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

		const userName = localStorage.getItem("userName");
		const userId = localStorage.getItem("userId");

		if (!userName) {
			return null;
		}

		const supabaseIsAdmin = await getSupabaseAdminStatus(userName);
		const isAdmin = supabaseIsAdmin ?? isKnownAdminUser(userName);
		console.log(`[AuthAdapter] User: ${userName}, IsAdmin: ${isAdmin}`);

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
				localStorage.setItem("userId", response.data.userId);
			}
		} catch (e) {
			console.error("Failed to register user", e);
		}

		// Store username in localStorage
		localStorage.setItem("userName", userName);
		return true;
	},

	/**
	 * Logout - clear stored user data
	 */
	async logout(): Promise<void> {
		if (typeof window !== "undefined") {
			localStorage.removeItem("userName");
			localStorage.removeItem("userId");
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
		return supabaseIsAdmin ?? isKnownAdminUser(normalized);
	},
};
