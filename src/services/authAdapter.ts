/**
 * @module authAdapter
 * @description Username-based authentication adapter backed by persisted user
 * records and role checks from Supabase/server data.
 *
 * Authentication is still lightweight, but admin detection is resolved from
 * the actual role sources instead of hard-coded heuristics.
 */

import type { AuthAdapter, AuthUser, LoginCredentials } from "@/app/providers/Providers";
import { api } from "@/services/apiClient";
import { resolveSupabaseClient } from "@/services/supabase/runtime";
import { STORAGE_KEYS } from "@/shared/lib/constants";

type RoleResponse = { role?: string | null };

function normalizeRole(value: unknown): AuthUser["role"] {
	return value === "admin" || value === "moderator" ? value : "user";
}

function looksLikeJwt(value: string): boolean {
	return value.split(".").length === 3;
}

async function getSupabaseAdminStatus(userName: string): Promise<boolean | null> {
	try {
		const client = await resolveSupabaseClient();
		if (!client) {
			return null;
		}

		const roleChecks = [
			{
				fn: "check_user_role_by_name",
				args: { user_name_param: userName, required_role: "admin" },
			},
			{
				fn: "has_role",
				args: { _user_name: userName, _role: "admin" },
			},
		] as const;

		for (const roleCheck of roleChecks) {
			const { data, error } = await (client as any).rpc(roleCheck.fn, roleCheck.args);
			if (!error && typeof data === "boolean") {
				return data;
			}
		}

		return null;
	} catch {
		return null;
	}
}

async function getServerAdminStatus(userIdToken: string): Promise<boolean | null> {
	try {
		const roles = await api.get<RoleResponse[]>(`/users/${encodeURIComponent(userIdToken)}/roles`);
		if (!Array.isArray(roles)) {
			return null;
		}

		return roles.some((role) => normalizeRole(role.role) === "admin");
	} catch {
		return null;
	}
}

async function resolveAdminStatus({
	userName,
	userIdToken,
}: {
	userName?: string | null;
	userIdToken?: string | null;
}): Promise<boolean> {
	if (userName) {
		const supabaseAdminStatus = await getSupabaseAdminStatus(userName);
		if (supabaseAdminStatus !== null) {
			return supabaseAdminStatus;
		}
	}

	if (userIdToken) {
		const serverAdminStatus = await getServerAdminStatus(userIdToken);
		if (serverAdminStatus !== null) {
			return serverAdminStatus;
		}
	}

	return false;
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

		const isAdmin = await resolveAdminStatus({
			userName,
			userIdToken: userId,
		});

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

		const storedUserId =
			typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.USER_ID) : null;

		if (looksLikeJwt(normalized)) {
			return resolveAdminStatus({ userIdToken: normalized });
		}

		return resolveAdminStatus({
			userName: normalized,
			userIdToken: storedUserId,
		});
	},
};
