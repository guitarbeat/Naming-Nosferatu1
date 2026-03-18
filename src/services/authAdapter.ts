/**
 * @module authAdapter
 * @description Simple authentication adapter for the naming tournament app.
 *
 * This is a basic auth implementation that recognizes "Aaron" as an admin
 * and treats any other username as a regular user. No real authentication
 * - just username-based role detection for demo purposes.
 */

import type { AuthAdapter, AuthUser, LoginCredentials } from "@/app/providers/Providers";
import { STORAGE_KEYS } from "@/shared/lib/constants";
import {
	getStorageString,
	isStorageAvailable,
	removeStorageItem,
	setStorageString,
} from "@/shared/lib/storage";
import { api } from "@/shared/services/apiClient";
import { resolveSupabaseClient } from "@/shared/services/supabase/runtime";

async function getSupabaseAdminStatus(userName: string): Promise<boolean> {
	try {
		const client = await resolveSupabaseClient();
		if (!client) {
			return false;
		}

		const { data, error } = await client
			.from("cat_user_roles")
			.select("role")
			.ilike("user_name", userName)
			.eq("role", "admin")
			.limit(1);

		if (error) {
			return false;
		}

		return Array.isArray(data) && data.length > 0;
	} catch {
		return false;
	}
}

export const authAdapter: AuthAdapter = {
	/**
	 * Get current user from localStorage or return null
	 */
	async getCurrentUser(): Promise<AuthUser | null> {
		if (!isStorageAvailable()) {
			return null;
		}

		const userName = getStorageString(STORAGE_KEYS.USER);
		const userId = getStorageString(STORAGE_KEYS.USER_ID);

		if (!userName) {
			return null;
		}

		const isAdmin = await getSupabaseAdminStatus(userName);

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
				setStorageString(STORAGE_KEYS.USER_ID, response.data.userId);
			}
		} catch (e) {
			console.error("Failed to register user", e);
		}

		// Store username in localStorage (must match STORAGE_KEYS.USER for consistency with appStore)
		setStorageString(STORAGE_KEYS.USER, userName);
		return true;
	},

	/**
	 * Logout - clear stored user data
	 */
	async logout(): Promise<void> {
		if (isStorageAvailable()) {
			removeStorageItem(STORAGE_KEYS.USER);
			removeStorageItem(STORAGE_KEYS.USER_ID);
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

		return getSupabaseAdminStatus(normalized);
	},
};
