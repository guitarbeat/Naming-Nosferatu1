/**
 * @module AppLayout
 * @description Main application layout component with floating primary nav
 */

import { useAuth } from "@/app/providers/Providers";
import { ScrollToTopButton } from "@/shared/components/layout/Button";
import {
	ErrorBoundary,
	ErrorComponent,
	Loading,
	OfflineIndicator,
} from "@/shared/components/layout/Feedback";
import { FloatingNavbar } from "@/shared/components/layout/FloatingNavbar";
import { ProfileInner } from "@/shared/components/profile/ProfileInner";
import { X } from "@/shared/lib/icons";
import useAppStore from "@/store/appStore";

interface AppLayoutProps {
	children: React.ReactNode;
}

function ProfileOverlay({ onClose }: { onClose: () => void }) {
	const { login } = useAuth();

	return (
		<div className="fixed inset-0 z-40 flex items-center justify-center px-4 pb-24 sm:pb-4 motion-safe:animate-[fadeIn_180ms_ease-out]">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

			{/* Panel */}
			<div className="glass-surface relative z-50 w-full max-w-md overflow-hidden rounded-[calc(var(--glass-radius,1.5rem)+0.25rem)] border border-border/50 bg-card/80 p-6 shadow-2xl motion-safe:animate-[surface-enter_220ms_var(--ease-out-expo)]">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-foreground">Your Profile</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
						aria-label="Close profile"
					>
						<X className="size-5" />
					</button>
				</div>
				<ProfileInner onLogin={(name) => login({ name })} />
			</div>
		</div>
	);
}

export function AppLayout({ children }: AppLayoutProps) {
	const { user, tournament, errors, errorActions, ui, uiActions } = useAppStore();
	const { isLoggedIn } = user;

	return (
		<ErrorBoundary context="Main Application Layout">
			<div className="app relative min-h-dvh w-full text-foreground">
				<OfflineIndicator />

				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-4 focus:left-4 focus:p-4 focus:bg-white focus:text-black focus:rounded-md focus:shadow-lg focus:font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
				>
					Skip to main content
				</a>

				{/* Background effects layer */}
				<div className="cat-background fixed inset-0 -z-10" aria-hidden="true">
					<div className="cat-background__gradient" />
					<div className="cat-background__moire" />
					<div className="cat-background__soft-blur" />
					<div className="cat-background__vignette" />
				</div>

				<FloatingNavbar />

				{/* Main content area with proper spacing */}
				<main
					id="main-content"
					className="relative flex min-h-dvh w-full flex-col px-3 pb-24 pt-4 sm:px-6 sm:pb-24 sm:pt-6 md:pt-10"
					tabIndex={-1}
				>
					{/* Error banner */}
					{Boolean(errors.current) && (
						<div className="mx-auto mb-4 w-full max-w-4xl">
							<ErrorComponent
								error={String(errors.current)}
								onRetry={() => errorActions.clearError()}
								onDismiss={() => errorActions.clearError()}
							/>
						</div>
					)}

					{/* Page content */}
					<div className="flex w-full flex-1 flex-col items-center gap-8 sm:gap-12">{children}</div>

					{/* Loading overlay */}
					{tournament.isLoading && (
						<div
							className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
							role="status"
							aria-live="polite"
							aria-busy="true"
						>
							<Loading variant="spinner" text="Initializing Tournament..." />
						</div>
					)}

					<ScrollToTopButton isLoggedIn={isLoggedIn} />
				</main>

				{ui.isProfileOpen && <ProfileOverlay onClose={() => uiActions.setProfileOpen(false)} />}
			</div>
		</ErrorBoundary>
	);
}
