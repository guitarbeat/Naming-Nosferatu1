/**
 * @module supabaseAuthAdapter
 * @description Supabase authentication adapter for the naming tournament app.
 *
 * This adapter uses Supabase Auth exclusively for authentication, replacing the JWT-based system.
 * It handles user authentication, registration, and role management through Supabase.
 */

import type { AuthAdapter, AuthUser, LoginCredentials } from "@/app/providers/Providers";
import { STORAGE_KEYS } from "@/shared/lib/constants";
import {
	getStorageString,
	isStorageAvailable,
	removeStorageItem,
	setStorageString,
} from "@/shared/lib/storage";
import { resolveSupabaseClient } from "@/shared/services/supabase/runtime";
import { api } from "@/shared/services/apiClient";

export const supabaseAuthAdapter: AuthAdapter = {
	/**
	 * Get current user from Supabase auth or localStorage fallback
	 */
	async getCurrentUser(): Promise<AuthUser | null> {
		if (!isStorageAvailable()) {
			return null;
		}

		// Try to get current user from Supabase first
		try {
			const client = await resolveSupabaseClient();
			if (!client) {
				// Fallback to localStorage for demo mode
				const userName = getStorageString(STORAGE_KEYS.USER);
				const userId = getStorageString(STORAGE_KEYS.USER_ID);

				if (!userName) {
					return null;
				}

				return {
					id: userId || userName,
					name: userName,
					email: undefined,
					isAdmin: false, // Default to false for demo mode
					role: "user",
				};
			}

			const { data: { user } } = await client.auth.getUser();
			
			if (!user) {
				return null;
			}

			// Check if user has admin role
			const isAdmin = await this.checkAdminStatus(user.id);

			return {
				id: user.id,
				name: user.user_metadata?.user_name || user.email || "Unknown",
				email: user.email,
				isAdmin,
				role: isAdmin ? "admin" : "user",
			};
		} catch (error) {
			console.error("Error getting current user:", error);
			return null;
		}
	},

	/**
	 * Login with Supabase Auth
	 */
	async login(credentials: LoginCredentials): Promise<boolean> {
		const { name } = credentials;
		if (!name?.trim()) {
			return false;
		}

		try {
			const client = await resolveSupabaseClient();
			if (!client) {
				// Fallback to localStorage for demo mode
				setStorageString(STORAGE_KEYS.USER, name.trim());
				return true;
			}

			// Sign in with Supabase
			const { data, error } = await client.auth.signInWithPassword({
				email: `${name.trim()}@demo.local`, // Use email format for username
				password: "demo-password", // Demo password
			});

			if (error) {
				console.error("Supabase login failed:", error);
				return false;
			}

			// Store user info in localStorage for compatibility
			if (data.user) {
				setStorageString(STORAGE_KEYS.USER, data.user.user_metadata?.user_name || name.trim());
				setStorageString(STORAGE_KEYS.USER_ID, data.user.id);
			}

			return true;
		} catch (error) {
			console.error("Login error:", error);
			return false;
		}
	},

	/**
	 * Register new user with Supabase Auth
	 */
	async register(): Promise<void> {
		throw new Error("Registration not implemented. Please use Supabase Auth directly.");
	},

	/**
	 * Logout - clear Supabase session and localStorage
	 */
	async logout(): Promise<void> {
		try {
			const client = await resolveSupabaseClient();
			if (client) {
				await client.auth.signOut();
			}

			// Clear localStorage
			if (isStorageAvailable()) {
				removeStorageItem(STORAGE_KEYS.USER);
				removeStorageItem(STORAGE_KEYS.USER_ID);
			}
		} catch (error) {
			console.error("Logout error:", error);
		}
	},

	/**
	 * Check if a user is admin based on Supabase roles
	 */
	async checkAdminStatus(userId: string): Promise<boolean> {
		try {
			const client = await resolveSupabaseClient();
			if (!client) {
				return false;
			}

			const { data, error } = await client
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
	},
};
