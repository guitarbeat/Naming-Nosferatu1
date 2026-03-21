/**
 * @module AppLayout
 * @description Main application layout component with floating primary nav
 */

import { ScrollToTopButton } from "@/shared/components/layout/Button";
import {
	ErrorBoundary,
	ErrorComponent,
	Loading,
	OfflineIndicator,
} from "@/shared/components/layout/Feedback";
import { AppVisualEffects } from "@/shared/components/layout/AppVisualEffects";
import { FrameEffect } from "@/shared/components/layout/FrameEffect";
import { FloatingNavbar } from "@/shared/components/layout/FloatingNavbar";
import { cn } from "@/shared/lib/basic";
import useAppStore from "@/store/appStore";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	const { pathname } = useLocation();
	const { user, tournament, errors, errorActions, ui } = useAppStore();
	const { isLoggedIn } = user;
	const showsFloatingNav = pathname !== "/tournament" && pathname !== "/admin";

	return (
		<ErrorBoundary context="Main Application Layout">
			<div className="app relative isolate min-h-dvh w-full bg-background text-foreground">
				<AppVisualEffects theme={ui.theme} />

				<OfflineIndicator />

				<a
					href="#main-content"
					className="sr-only fixed left-4 top-4 z-[10001] focus:not-sr-only focus:p-4 focus:bg-white focus:text-black focus:rounded-md focus:shadow-lg focus:font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
				>
					Skip to main content
				</a>

				<FloatingNavbar />

				<FrameEffect>
					<main
						id="main-content"
						className={cn("app-main-shell", showsFloatingNav && "app-main-shell--nav-safe")}
						tabIndex={-1}
					>
						{/* Error banner */}
						{Boolean(errors.current) && (
							<div className="app-error-banner">
								<ErrorComponent
									error={String(errors.current)}
									onRetry={() => errorActions.clearError()}
									onDismiss={() => errorActions.clearError()}
								/>
							</div>
						)}

						{/* Page content */}
						<div className="app-page-stack">{children}</div>

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
				</FrameEffect>
			</div>
		</ErrorBoundary>
	);
}
