/**
 * @module Providers
 * @description Application-level React context providers for authentication and
 * toast notifications.
 *
 * ## Design
 *
 * - **Zero external service imports.** Supabase, TanStack Query, etc. are
 *   injected via the `authAdapter` prop so the provider is testable and
 *   framework-agnostic.
 * - **Self-contained toast system.** Includes rendering, auto-dismiss timers,
 *   stacking, and animations — no external toast library needed.
 * - **Single `<Providers>` wrapper.** Composes auth + toast contexts so the
 *   consumer's tree stays clean.
 *
 * @example
 * // main.tsx
 * import { Providers } from "@/app/providers/Providers";
 * import { authAdapter } from "@/services/authAdapter";
 *
 * <Providers auth={{ adapter: authAdapter }}>
 *   <App />
 * </Providers>
 */

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import Button from "@/shared/components/layout/Button";

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TOAST_DURATION_MS = 5000;
const DEFAULT_MAX_TOASTS = 5;

const ROLE_HIERARCHY = { user: 0, moderator: 1, admin: 2 } as const;
type UserRole = keyof typeof ROLE_HIERARCHY;

// ═══════════════════════════════════════════════════════════════════════════════
// Auth Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuthUser {
	id: string;
	name: string;
	email?: string;
	isAdmin: boolean;
	role?: UserRole;
}

export interface LoginCredentials {
	/** Email + password login */
	email?: string;
	password?: string;
	/** Simple name-based login (no password) */
	name?: string;
}

export interface RegisterData {
	email: string;
	password: string;
	name: string;
}

/**
 * Adapter interface for authentication backends.
 *
 * Implement this to connect any auth provider (Supabase, Firebase, etc.)
 * without changing the Providers component.
 */
export interface AuthAdapter {
	/** Fetch the currently authenticated user (or null). */
	getCurrentUser: () => Promise<AuthUser | null>;
	/** Log in with credentials. Returns `true` on success. */
	login: (credentials: LoginCredentials) => Promise<boolean>;
	/** Log out the current user. */
	logout: () => Promise<void>;
	/** Register a new account. */
	register: (data: RegisterData) => Promise<void>;
	/** Check if a given user name/ID has admin privileges. */
	checkAdminStatus: (userIdOrName: string) => Promise<boolean>;
}

interface AuthContextValue {
	user: AuthUser | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (credentials: LoginCredentials) => Promise<boolean>;
	logout: () => Promise<void>;
	register: (data: RegisterData) => Promise<void>;
	checkAdminStatus: (userIdOrName: string) => Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Toast Types
// ═══════════════════════════════════════════════════════════════════════════════

type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
	/** How long the toast is visible in ms (default: 5 000). */
	duration?: number;
	/** Set `false` to keep the toast until manually dismissed. */
	autoDismiss?: boolean;
}

interface ToastItem {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
	autoDismiss: boolean;
	/** Epoch ms when this toast was created. Used for ordering. */
	createdAt: number;
}

interface ToastContextValue {
	toasts: ToastItem[];
	showToast: (message: string, type?: ToastType, options?: ToastOptions) => string;
	hideToast: (id: string) => void;
	clearToasts: () => void;
	showSuccess: (message: string, options?: ToastOptions) => string;
	showError: (message: string, options?: ToastOptions) => string;
	showInfo: (message: string, options?: ToastOptions) => string;
	showWarning: (message: string, options?: ToastOptions) => string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Role Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if `currentRole` meets or exceeds `requiredRole` in the role hierarchy.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Fallback Auth Adapter (no-op)
// ═══════════════════════════════════════════════════════════════════════════════

const noopAdapter: AuthAdapter = {
	getCurrentUser: async () => null,
	login: async () => false,
	logout: async () => {
		/* No-op: Auth not implemented */
	},
	register: async () => {
		/* No-op: Auth not implemented */
	},
	checkAdminStatus: async () => false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Auth Context
// ═══════════════════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Access the auth context. Must be used inside `<Providers>`.
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error(
			"useAuth must be used within <Providers>. " +
				"Wrap your component tree with <Providers> in main.tsx.",
		);
	}
	return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Toast Context
// ═══════════════════════════════════════════════════════════════════════════════

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Access the toast context. Must be used inside `<Providers>`.
 *
 * @example
 * const { showSuccess, showError } = useToast();
 * showSuccess("Saved!");
 */
export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error(
			"useToast must be used within <Providers>. " +
				"Wrap your component tree with <Providers> in main.tsx.",
		);
	}
	return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Toast Container (self-contained UI)
// ═══════════════════════════════════════════════════════════════════════════════

type ToastPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

const POSITION_CLASSES: Record<ToastPosition, string> = {
	"top-left": "top-4 left-4 items-start",
	"top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
	"top-right": "top-4 right-4 items-end",
	"bottom-left": "bottom-4 left-4 items-start",
	"bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
	"bottom-right": "bottom-4 right-4 items-end",
};

const TYPE_STYLES: Record<ToastType, { bg: string; icon: string }> = {
	success: { bg: "bg-chart-2", icon: "✓" },
	error: { bg: "bg-destructive", icon: "✕" },
	warning: { bg: "bg-chart-4 text-foreground", icon: "⚠" },
	info: { bg: "bg-primary", icon: "ℹ" },
};

function ToastContainer({
	toasts,
	onDismiss,
	position,
}: {
	toasts: ToastItem[];
	onDismiss: (id: string) => void;
	position: ToastPosition;
}) {
	if (toasts.length === 0) {
		return null;
	}

	return (
		<div
			className={`fixed z-[9999] flex flex-col gap-2 ${POSITION_CLASSES[position]}`}
			aria-live="polite"
			aria-label="Notifications"
		>
			{toasts.map((toast) => {
				const style = TYPE_STYLES[toast.type];
				return (
					<div
						key={toast.id}
						className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${style.bg}`}
						role="alert"
					>
						<span className="text-base leading-none" aria-hidden={true}>
							{style.icon}
						</span>
						<span className="flex-1">{toast.message}</span>
						<Button
							onClick={() => onDismiss(toast.id)}
							variant="ghost"
							size="icon"
							iconOnly={true}
							shape="pill"
							className="ml-2 size-7 bg-white/8 text-primary-foreground/80 hover:bg-white/14 hover:text-primary-foreground"
							aria-label="Dismiss"
							type="button"
						>
							✕
						</Button>
					</div>
				);
			})}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════════
// useAuthProvider (internal)
// ═══════════════════════════════════════════════════════════════════════════════

function useAuthProvider(adapter: AuthAdapter): AuthContextValue {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const adapterRef = useRef(adapter);
	adapterRef.current = adapter;

	// Fetch current user on mount
	useEffect(() => {
		let cancelled = false;

		adapterRef.current
			.getCurrentUser()
			.then((u) => {
				if (!cancelled) {
					setUser(u);
				}
			})
			.catch((err) => {
				console.error("[Providers] Failed to fetch current user:", err);
			})
			.finally(() => {
				if (!cancelled) {
					setIsLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
		try {
			const success = await adapterRef.current.login(credentials);
			if (success) {
				const updated = await adapterRef.current.getCurrentUser();
				setUser(updated);
			}
			return success;
		} catch (err) {
			console.error("[Providers] Login failed:", err);
			throw err;
		}
	}, []);

	const logout = useCallback(async () => {
		try {
			await adapterRef.current.logout();
			setUser(null);
		} catch (err) {
			console.error("[Providers] Logout failed:", err);
			throw err;
		}
	}, []);

	const register = useCallback(async (data: RegisterData) => {
		await adapterRef.current.register(data);
	}, []);

	const checkAdminStatus = useCallback(async (userIdOrName: string) => {
		return adapterRef.current.checkAdminStatus(userIdOrName);
	}, []);

	return useMemo(
		() => ({
			user,
			isLoading,
			isAuthenticated: user !== null,
			login,
			logout,
			register,
			checkAdminStatus,
		}),
		[user, isLoading, login, logout, register, checkAdminStatus],
	);
}

// ═══════════════════════════════════════════════════════════════════════════════
// useToastProvider (internal)
// ═══════════════════════════════════════════════════════════════════════════════

let toastCounter = 0;

function useToastProvider(
	maxToasts: number,
	defaultDuration: number,
): ToastContextValue & {
	toastList: ToastItem[];
	dismiss: (id: string) => void;
} {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	// Schedule auto-dismiss for a toast
	const scheduleAutoDismiss = useCallback((id: string, duration: number) => {
		const timer = setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
			timers.current.delete(id);
		}, duration);
		timers.current.set(id, timer);
	}, []);

	// Clean up all timers on unmount
	useEffect(() => {
		return () => {
			for (const timer of timers.current.values()) {
				clearTimeout(timer);
			}
			timers.current.clear();
		};
	}, []);

	const showToast = useCallback(
		(message: string, type: ToastType = "info", options: ToastOptions = {}): string => {
			const id = `toast-${++toastCounter}`;
			const duration = options.duration ?? defaultDuration;
			const autoDismiss = options.autoDismiss ?? true;

			const item: ToastItem = {
				id,
				message,
				type,
				duration,
				autoDismiss,
				createdAt: Date.now(),
			};

			setToasts((prev) => [item, ...prev].slice(0, maxToasts));

			if (autoDismiss) {
				scheduleAutoDismiss(id, duration);
			}

			return id;
		},
		[defaultDuration, maxToasts, scheduleAutoDismiss],
	);

	const hideToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
		const timer = timers.current.get(id);
		if (timer) {
			clearTimeout(timer);
			timers.current.delete(id);
		}
	}, []);

	const clearToasts = useCallback(() => {
		setToasts([]);
		for (const timer of timers.current.values()) {
			clearTimeout(timer);
		}
		timers.current.clear();
	}, []);

	const showSuccess = useCallback(
		(msg: string, opts?: ToastOptions) => showToast(msg, "success", opts),
		[showToast],
	);
	const showError = useCallback(
		(msg: string, opts?: ToastOptions) => showToast(msg, "error", opts),
		[showToast],
	);
	const showInfo = useCallback(
		(msg: string, opts?: ToastOptions) => showToast(msg, "info", opts),
		[showToast],
	);
	const showWarning = useCallback(
		(msg: string, opts?: ToastOptions) => showToast(msg, "warning", opts),
		[showToast],
	);

	const contextValue = useMemo(
		() => ({
			toasts,
			showToast,
			hideToast,
			clearToasts,
			showSuccess,
			showError,
			showInfo,
			showWarning,
			toastList: toasts,
			dismiss: hideToast,
		}),
		[toasts, showToast, hideToast, clearToasts, showSuccess, showError, showInfo, showWarning],
	);

	return contextValue;
}

// ═══════════════════════════════════════════════════════════════════════════════
// <Providers> Component
// ═══════════════════════════════════════════════════════════════════════════════

interface ProvidersProps {
	children: ReactNode;

	/** Auth configuration. Omit to use a no-op adapter (no auth). */
	auth?: {
		adapter: AuthAdapter;
	};

	/** Maximum visible toasts at once (default: 5). */
	toastMaxToasts?: number;
	/** Default auto-dismiss duration in ms (default: 5 000). */
	toastDefaultDuration?: number;
	/** Screen position for the toast stack. */
	toastPosition?: ToastPosition;
}

/**
 * Root provider that composes Auth and Toast contexts.
 *
 * @example
 * // Minimal (toasts only, no auth):
 * <Providers>
 *   <App />
 * </Providers>
 *
 * // With auth adapter:
 * <Providers auth={{ adapter: mySupabaseAdapter }}>
 *   <App />
 * </Providers>
 *
 * // With custom toast settings:
 * <Providers
 *   toastPosition="bottom-center"
 *   toastMaxToasts={3}
 *   toastDefaultDuration={3000}
 * >
 *   <App />
 * </Providers>
 */
export function Providers({
	children,
	auth,
	toastMaxToasts = DEFAULT_MAX_TOASTS,
	toastDefaultDuration = DEFAULT_TOAST_DURATION_MS,
	toastPosition = "top-right",
}: ProvidersProps) {
	const adapter = auth?.adapter ?? noopAdapter;

	const authValue = useAuthProvider(adapter);
	const { toastList, dismiss, ...toastValue } = useToastProvider(
		toastMaxToasts,
		toastDefaultDuration,
	);

	return (
		<AuthContext.Provider value={authValue}>
			<ToastContext.Provider value={toastValue}>
				{children}
				<ToastContainer toasts={toastList} onDismiss={dismiss} position={toastPosition} />
			</ToastContext.Provider>
		</AuthContext.Provider>
	);
}
