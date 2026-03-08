import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient } from "@tanstack/react-query";
import { STORAGE_KEYS } from "@/shared/lib/constants";
import type { Database } from "../../../supabase/types";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

/* ==========================================================================
   SUPABASE CLIENT CONFIGURATION
   ========================================================================== */

declare global {
	interface Window {
		__supabaseClient?: SupabaseClient<Database>;
	}
}

// Get Supabase credentials from environment variables (publishable/anon keys are safe to embed)
const getSupabaseCredentials = (): { url: string; key: string } => {
	const url = import.meta.env.VITE_SUPABASE_URL;
	const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

	if (!url || !key) {
		throw new Error(
			"Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.",
		);
	}

	return { url, key };
};

let supabaseInstance: SupabaseClient<Database> | null =
	typeof window !== "undefined" ? (window.__supabaseClient ?? null) : null;
let initializationPromise: Promise<SupabaseClient<Database> | null> | null = null;

const createSupabaseClient = async (): Promise<SupabaseClient<Database> | null> => {
	// Validate and get credentials (throws if missing)
	const { url: SupabaseUrl, key: SupabaseAnonKey } = getSupabaseCredentials();

	try {
		const { createClient } = await import("@supabase/supabase-js");
		const authOptions = {
			persistSession: true,
			autoRefreshToken: true,
			storage: (() => {
				try {
					return typeof window !== "undefined" ? window.localStorage : undefined;
				} catch {
					return undefined;
				}
			})(),
		} as const;

		let currentUserName: string | null = null;
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				currentUserName = window.localStorage.getItem(STORAGE_KEYS.USER);
			}
		} catch {
			/* ignore */
		}

		/* ----------------------------------------------------------------------
		   MIGRATION UPDATE: Using x-user-id for future RLS policies
		   ---------------------------------------------------------------------- */
		let currentUserId: string | null = null;
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				currentUserId = window.localStorage.getItem(STORAGE_KEYS.USER_ID);
			}
		} catch {
			/* ignore */
		}

		const client = createClient<Database>(SupabaseUrl, SupabaseAnonKey, {
			auth: authOptions,
			global: {
				headers: {
					"X-Client-Info": "cat-name-tournament",
					...(currentUserName ? { "x-user-name": currentUserName } : {}),
					...(currentUserId ? { "x-user-id": currentUserId } : {}),
				},
			},
			db: { schema: "public" },
		});

		if (typeof window !== "undefined") {
			window.__supabaseClient = client;
		}
		return client;
	} catch (error) {
		console.error("❌ Failed to create Supabase client:", error);
		return null;
	}
};

const getSupabaseClient = async (retryCount = 0): Promise<SupabaseClient<Database> | null> => {
	if (supabaseInstance) {
		return supabaseInstance;
	}
	if (!initializationPromise) {
		initializationPromise = createSupabaseClient()
			.then((client) => {
				supabaseInstance = client;
				return client;
			})
			.catch(async (_error) => {
				initializationPromise = null;
				if (retryCount < 3) {
					await new Promise((r) => setTimeout(r, 1000 * 2 ** retryCount));
					return getSupabaseClient(retryCount + 1);
				}
				return null;
			});
	}
	return initializationPromise;
};

export const resolveSupabaseClient = async () => supabaseInstance ?? (await getSupabaseClient());

export const updateSupabaseUserContext = (
	userName: string | null,
	userId: string | null = null,
): void => {
	if (!supabaseInstance) {
		return;
	}
	// @ts-expect-error - accessing internal property
	if (supabaseInstance.rest?.headers) {
		if (userName) {
			// @ts-expect-error - Accessing internal Supabase client headers
			supabaseInstance.rest.headers["x-user-name"] = userName;
		} else {
			// @ts-expect-error - Accessing internal Supabase client headers
			supabaseInstance.rest.headers["x-user-name"] = undefined;
		}

		if (userId) {
			// @ts-expect-error - Accessing internal Supabase client headers
			supabaseInstance.rest.headers["x-user-id"] = userId;
		} else {
			// @ts-expect-error - Accessing internal Supabase client headers
			supabaseInstance.rest.headers["x-user-id"] = undefined;
		}
	}
};

const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";

export const isSupabaseAvailable = async () => {
	const client = await resolveSupabaseClient();
	if (!client) {
		if (isDev) {
			console.warn("Supabase not configured. Some features may not work.");
		}
		return false;
	}
	return true;
};

/**
 * Helper to execute Supabase operations with standardized availability checks and error handling.
 */
export async function withSupabase<T>(
	operation: (client: SupabaseClient<Database>) => Promise<T>,
	fallback: T,
): Promise<T> {
	try {
		if (!(await isSupabaseAvailable())) {
			return fallback;
		}
		const client = await resolveSupabaseClient();
		if (!client) {
			return fallback;
		}
		return await operation(client);
	} catch (error) {
		if (isDev) {
			console.error("Supabase operation failed:", error);
		}
		return fallback;
	}
}

// Re-export client for modern usage
export { resolveSupabaseClient as supabase };
