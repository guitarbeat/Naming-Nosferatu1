import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/apiClient";
import { authAdapter } from "@/services/authAdapter";
import { resolveSupabaseClient } from "@/services/supabase/runtime";
import { STORAGE_KEYS } from "@/shared/lib/constants";

vi.mock("@/services/apiClient", () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
	},
}));

vi.mock("@/services/supabase/runtime", () => ({
	resolveSupabaseClient: vi.fn(),
}));

describe("authAdapter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("returns null when no stored user exists", async () => {
		const currentUser = await authAdapter.getCurrentUser();

		expect(currentUser).toBeNull();
	});

	it("resolves admin status through the Supabase role RPC", async () => {
		const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
		vi.mocked(resolveSupabaseClient).mockResolvedValue({ rpc } as never);

		localStorage.setItem(STORAGE_KEYS.USER, "AdminUser");
		localStorage.setItem(STORAGE_KEYS.USER_ID, "jwt-token");

		const currentUser = await authAdapter.getCurrentUser();

		expect(rpc).toHaveBeenCalledWith("check_user_role_by_name", {
			user_name_param: "AdminUser",
			required_role: "admin",
		});
		expect(currentUser).toEqual({
			id: "jwt-token",
			name: "AdminUser",
			email: undefined,
			isAdmin: true,
			role: "admin",
		});
	});

	it("falls back to the server roles endpoint when Supabase is unavailable", async () => {
		vi.mocked(resolveSupabaseClient).mockResolvedValue(null);
		vi.mocked(api.get).mockResolvedValue([{ role: "admin" }] as never);

		localStorage.setItem(STORAGE_KEYS.USER, "ServerAdmin");
		localStorage.setItem(STORAGE_KEYS.USER_ID, "header.payload.signature");

		const currentUser = await authAdapter.getCurrentUser();

		expect(api.get).toHaveBeenCalledWith("/users/header.payload.signature/roles");
		expect(currentUser?.isAdmin).toBe(true);
		expect(currentUser?.role).toBe("admin");
	});

	it("does not fall back when the Supabase RPC returns a real false result", async () => {
		const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
		vi.mocked(resolveSupabaseClient).mockResolvedValue({ rpc } as never);

		localStorage.setItem(STORAGE_KEYS.USER_ID, "header.payload.signature");

		const isAdmin = await authAdapter.checkAdminStatus("RegularUser");

		expect(isAdmin).toBe(false);
		expect(api.get).not.toHaveBeenCalled();
	});
});
