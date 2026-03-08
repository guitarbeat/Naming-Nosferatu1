/**
 * @module AppLayout
 * @description Main application layout component with FluidNav
 */

import { useMemo } from "react";
import { ScrollToTopButton } from "@/shared/components/layout/Button";
import {
	ErrorBoundary,
	ErrorComponent,
	Loading,
	OfflineIndicator,
} from "@/shared/components/layout/Feedback";
import { FloatingNavbar } from "@/shared/components/layout/FloatingNavbar";
import useAppStore from "@/store/appStore";

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	const { user, tournament, errors, errorActions } = useAppStore();
	const { isLoggedIn } = user;

	const appClassName = useMemo(() => (isLoggedIn ? "app" : "app app--login"), [isLoggedIn]);

	const mainWrapperClassName = useMemo(
		() =>
			["app-main-wrapper", isLoggedIn ? "" : "app-main-wrapper--login"].filter(Boolean).join(" "),
		[isLoggedIn],
	);

	return (
		<ErrorBoundary context="Main Application Layout">
			<div className={appClassName}>
				<OfflineIndicator />

				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-4 focus:left-4 focus:p-4 focus:bg-white focus:text-black focus:rounded-md focus:shadow-lg focus:font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
				>
					Skip to main content
				</a>

				<FloatingNavbar />

				<main id="main-content" className={mainWrapperClassName} tabIndex={-1}>
					{Boolean(errors.current) && (
						<div className="p-4">
							<ErrorComponent
								error={String(errors.current)}
								onRetry={() => errorActions.clearError()}
								onDismiss={() => errorActions.clearError()}
							/>
						</div>
					)}
					{children}

					{tournament.isLoading && (
						<div
							className="global-loading-overlay"
							role="status"
							aria-live="polite"
							aria-busy="true"
						>
							<Loading variant="spinner" text="Initializing Tournament..." />
						</div>
					)}

					<ScrollToTopButton isLoggedIn={isLoggedIn} />
				</main>
			</div>
		</ErrorBoundary>
	);
}
