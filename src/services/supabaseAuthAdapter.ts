/**
 * @module supabaseAuthAdapter
 * @description Supabase authentication adapter for the naming tournament app.
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

function getStoredDisplayName(): string | null {
	if (!isStorageAvailable()) {
		return null;
	}

	return getStorageString(STORAGE_KEYS.USER)?.trim() || null;
}

function getStoredUserId(): string | null {
	if (!isStorageAvailable()) {
		return null;
	}

	return getStorageString(STORAGE_KEYS.USER_ID)?.trim() || null;
}

function storeProfile(user: { id?: string | null; userName?: string | null }): void {
	if (!isStorageAvailable()) {
		return;
	}

	if (user.userName) {
		setStorageString(STORAGE_KEYS.USER, user.userName);
	}

	if (user.id) {
		setStorageString(STORAGE_KEYS.USER_ID, user.id);
	}
}

function clearStoredProfile(): void {
	if (!isStorageAvailable()) {
		return;
	}

	removeStorageItem(STORAGE_KEYS.USER);
	removeStorageItem(STORAGE_KEYS.USER_ID);
}

async function buildSessionUser(): Promise<AuthUser | null> {
	const client = await resolveSupabaseClient();
	if (!client) {
		return null;
	}

	const {
		data: { user },
		error,
	} = await client.auth.getUser();

	if (error || !user) {
		return null;
	}

	const storedDisplayName = getStoredDisplayName();
	const displayName = storedDisplayName || user.user_metadata?.user_name || user.email || "Unknown";

	const { data: roleRows } = await client
		.from("cat_user_roles")
		.select("role")
		.eq("user_id", user.id)
		.eq("role", "admin")
		.limit(1);

	const isAdmin = (roleRows ?? []).length > 0;
	storeProfile({ id: user.id, userName: displayName });

	return {
		id: user.id,
		name: displayName,
		userName: displayName,
		email: user.email,
		isAdmin,
		role: isAdmin ? "admin" : "user",
	};
}

export const supabaseAuthAdapter: AuthAdapter = {
	async getCurrentUser(): Promise<AuthUser | null> {
		try {
			const sessionUser = await buildSessionUser();
			if (sessionUser) {
				return sessionUser;
			}

			const userName = getStoredDisplayName();
			if (!userName) {
				return null;
			}

			return {
				id: getStoredUserId() || `local:${userName}`,
				name: userName,
				userName,
				email: undefined,
				isAdmin: false,
				role: "user",
			};
		} catch (error) {
			console.error("Error getting current user:", error);
			return null;
		}
	},

	async login(credentials: LoginCredentials): Promise<boolean> {
		const trimmedName = credentials.name?.trim();

		try {
			const client = await resolveSupabaseClient();

			if (credentials.email && credentials.password && client) {
				const { data, error } = await client.auth.signInWithPassword({
					email: credentials.email,
					password: credentials.password,
				});

				if (error || !data.user) {
					console.error("Supabase login failed:", error);
					return false;
				}

				storeProfile({
					id: data.user.id,
					userName: trimmedName || data.user.user_metadata?.user_name || data.user.email,
				});

				return true;
			}

			if (trimmedName) {
				storeProfile({
					id: getStoredUserId(),
					userName: trimmedName,
				});
				return true;
			}

			return false;
		} catch (error) {
			console.error("Login error:", error);
			return false;
		}
	},

	async register(): Promise<void> {
		throw new Error("Registration is not implemented in this client.");
	},

	async logout(): Promise<void> {
		try {
			const client = await resolveSupabaseClient();
			if (client) {
				await client.auth.signOut();
			}

			clearStoredProfile();
		} catch (error) {
			console.error("Logout error:", error);
		}
	},

	async checkAdminStatus(userId: string): Promise<boolean> {
		try {
			const client = await resolveSupabaseClient();
			if (!client) {
				return false;
			}

			const { data, error } = await client
				.from("cat_user_roles")
				.select("role")
				.eq("user_id", userId)
				.eq("role", "admin")
				.limit(1);

			if (error) {
				return false;
			}

			return (data ?? []).length > 0;
		} catch (error) {
			console.error("Error checking admin status:", error);
			return false;
		}
	},
};
