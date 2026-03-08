/**
 * @module App
 * @description Main application component with consolidated routing and layout.
 * Routes, auth, and layout are now coordinated here.
 *
 * @component
 * @returns {JSX.Element} The complete application UI
 */

import { Suspense, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { errorContexts, routeComponents } from "@/app/appConfig";
import { useAuth } from "@/app/providers/Providers";
import { useTournamentHandlers } from "@/features/tournament/hooks";
import Tournament from "@/features/tournament/Tournament";
import { ErrorManager } from "@/services/errorManager";
import { AppLayout, Button, ErrorBoundary, Loading, Section } from "@/shared/components";
import { useOfflineSync } from "@/shared/hooks";
import { cn } from "@/shared/lib/basic";
import {
	cleanupPerformanceMonitoring,
	initializePerformanceMonitoring,
} from "@/shared/lib/performance";
import useAppStore, { useAppStoreInitialization } from "@/store/appStore";

const TournamentFlow = routeComponents.TournamentFlow;
const DashboardLazy = routeComponents.DashboardLazy;
const AdminDashboardLazy = routeComponents.AdminDashboardLazy;

function App() {
	const { user: authUser, isLoading } = useAuth();
	const isInitialized = !isLoading;
	const { userActions } = useAppStore();

	// Sync auth user with store
	useEffect(() => {
		if (authUser) {
			userActions.setAdminStatus(Boolean(authUser.isAdmin));
		}
	}, [authUser, userActions]);

	useEffect(() => {
		initializePerformanceMonitoring();
		const cleanup = ErrorManager.setupGlobalErrorHandling();
		return () => {
			cleanupPerformanceMonitoring();
			cleanup();
		};
	}, []);

	useAppStoreInitialization();
	useOfflineSync();

	if (!isInitialized) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-black">
				<Loading variant="spinner" text="Preparing the tournament..." />
			</div>
		);
	}

	return (
		<div
			className={cn(
				"min-h-screen w-full bg-transparent text-white font-sans selection:bg-purple-500/30",
			)}
		>
			<AppLayout>
				<Routes>
					<Route
						path="/"
						element={
							<div className="flex flex-col gap-0">
								<ErrorBoundary context={errorContexts.tournamentFlow}>
									<HomeContent />
								</ErrorBoundary>
							</div>
						}
					/>
					<Route
						path="/tournament"
						element={
							<div className="flex flex-col gap-0">
								<ErrorBoundary context={errorContexts.tournamentFlow}>
									<TournamentContent />
								</ErrorBoundary>
							</div>
						}
					/>
					<Route path="/analysis" element={<AnalysisContent />} />
					<Route path="/admin" element={<AdminContent />} />
				</Routes>
			</AppLayout>
		</div>
	);
}

function HomeContent() {
	return (
		<Section id="pick" variant="minimal" padding="none" maxWidth="full">
			<Suspense fallback={<Loading variant="skeleton" height={400} />}>
				<TournamentFlow />
			</Suspense>
		</Section>
	);
}

function TournamentContent() {
	const { user, tournament, tournamentActions } = useAppStore();
	const { handleTournamentComplete } = useTournamentHandlers({
		userName: user.name,
		tournamentActions,
	});

	return (
		<Section id="tournament" variant="minimal" padding="none" maxWidth="full">
			<Suspense fallback={<Loading variant="skeleton" height={400} />}>
				{tournament.names && tournament.names.length > 0 ? (
					<Tournament
						names={tournament.names}
						existingRatings={tournament.ratings}
						onComplete={handleTournamentComplete as any}
					/>
				) : (
					<div className="text-center py-20">
						<p className="text-xl text-white/70 mb-4">No names selected for tournament</p>
						<Button variant="gradient" onClick={() => window.history.back()}>
							Go Back
						</Button>
					</div>
				)}
			</Suspense>
		</Section>
	);
}

function AnalysisContent() {
	const { user, tournament, tournamentActions } = useAppStore();
	const { handleStartNewTournament } = useTournamentHandlers({
		userName: user.name,
		tournamentActions,
	});

	return (
		<Section id="analysis" variant="minimal" padding="none" maxWidth="full">
			<h2 className="text-3xl md:text-5xl font-bold mb-12 text-center bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent uppercase tracking-tighter">
				The Victors Emerge
			</h2>
			<Suspense fallback={<Loading variant="skeleton" height={600} />}>
				<ErrorBoundary context={errorContexts.analysisDashboard}>
					<DashboardLazy
						personalRatings={tournament.ratings}
						currentTournamentNames={tournament.names ?? undefined}
						onStartNew={handleStartNewTournament}
						userName={user.name ?? ""}
						isAdmin={user.isAdmin}
					/>
				</ErrorBoundary>
			</Suspense>
		</Section>
	);
}

function AdminContent() {
	const { user } = useAppStore();

	// Only allow admin users
	if (!user.isAdmin) {
		return (
			<Section id="admin" variant="minimal" padding="none" maxWidth="full">
				<div className="text-center py-20">
					<h2 className="text-3xl font-bold mb-4 text-red-400">Access Denied</h2>
					<p className="text-white/60">Admin access required to view this page.</p>
				</div>
			</Section>
		);
	}

	return (
		<Suspense fallback={<Loading variant="skeleton" height={600} />}>
			<ErrorBoundary context={errorContexts.analysisDashboard}>
				<AdminDashboardLazy />
			</ErrorBoundary>
		</Suspense>
	);
}

export default App;
