import { createContext, useContext } from "react";
import {
	type AuthAdapter,
	type AuthContextValue,
	type AuthUser,
	DEFAULT_MAX_TOASTS,
	DEFAULT_TOAST_DURATION_MS,
	type LoginCredentials,
	type ProvidersProps,
	type ToastContextValue,
} from "./providerTypes";
import { ToastContainer } from "./ToastContainer";
import { useAuthProvider } from "./useAuthProvider";
import { useToastProvider } from "./useToastProvider";

export type { AuthAdapter, AuthUser, LoginCredentials };

const AuthContext = createContext<AuthContextValue | null>(null);
const ToastContext = createContext<ToastContextValue | null>(null);

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
