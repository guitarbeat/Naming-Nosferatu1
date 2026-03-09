/**
 * @module App
 * @description Main application component with consolidated routing and layout.
 * Routes, auth, and layout are now coordinated here.
 *
 * @component
 * @returns {JSX.Element} The complete application UI
 */

import { Suspense, useCallback, useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { errorContexts, routeComponents } from "@/app/appConfig";
import { useAuth } from "@/app/providers/Providers";
import { NameSuggestion } from "@/features/tournament/components/NameSuggestion";
import { ProfileSection } from "@/features/tournament/components/ProfileSection";
import { useTournamentHandlers } from "@/features/tournament/hooks/useTournamentHandlers";
import Tournament from "@/features/tournament/Tournament";
import { ErrorManager } from "@/services/errorManager";
import { updateSupabaseUserContext } from "@/services/supabase/runtime";
import { AppLayout, Button, Section } from "@/shared/components/layout";
import { ErrorBoundary } from "@/shared/components/layout/Feedback/ErrorBoundary";
import { Loading } from "@/shared/components/layout/Feedback/Loading";
import { useOfflineSync } from "@/shared/hooks";

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
		updateSupabaseUserContext(authUser?.name ?? null, authUser?.id ?? null);
	}, [authUser, userActions]);

	useEffect(() => {
		initializePerformanceMonitoring();
		const cleanup = ErrorManager.setupGlobalErrorHandling();
		return () => {
			cleanupPerformanceMonitoring();
			cleanup();
		};
	}, []);

	const handleUserContext = useCallback((name: string) => {
		updateSupabaseUserContext(name, null);
	}, []);
	useAppStoreInitialization(handleUserContext);
	useOfflineSync();

	if (!isInitialized) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-background">
				<Loading variant="spinner" text="Preparing the tournament..." />
			</div>
		);
	}

	return (
		<AppLayout>
			<Routes>
				<Route
					path="/"
					element={
						<ErrorBoundary context={errorContexts.tournamentFlow}>
							<HomeContent />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/tournament"
					element={
						<ErrorBoundary context={errorContexts.tournamentFlow}>
							<TournamentContent />
						</ErrorBoundary>
					}
				/>
				<Route path="/analysis" element={<AnalysisContent />} />
				<Route path="/admin" element={<AdminContent />} />
			</Routes>
		</AppLayout>
	);
}

function HomeContent() {
	const { login } = useAuth();

	return (
		<>
			<Section id="pick" variant="minimal" padding="none" maxWidth="full">
				<Suspense fallback={<Loading variant="skeleton" height={400} />}>
					<TournamentFlow />
				</Suspense>
			</Section>

			<Section id="suggest" variant="minimal" padding="comfortable" maxWidth="2xl" separator={true}>
				<NameSuggestion variant="inline" />
			</Section>

			<ProfileSection onLogin={(name) => login({ name })} />
		</>
	);
}

function TournamentContent() {
	const { user, tournament, tournamentActions } = useAppStore();
	const navigate = useNavigate();
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
					<div className="mx-auto max-w-xl rounded-2xl border border-border/10 bg-background/30 px-6 py-10 text-center">
						<h2 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter">
							No contenders yet
						</h2>
						<p className="text-muted-foreground mb-6">
							Choose at least two names in the picker to start your tournament bracket.
						</p>
						<div className="flex flex-wrap items-center justify-center gap-3">
							<Button variant="glass" onClick={() => navigate("/")}>
								Go to Name Picker
							</Button>
							<Button variant="glass" onClick={() => navigate("/analysis")}>
								View Analysis
							</Button>
						</div>
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
			<h2 className="text-3xl md:text-5xl font-bold mb-12 text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter">
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
					<h2 className="text-3xl font-bold mb-4 text-destructive">Access Denied</h2>
					<p className="text-muted-foreground">Admin access required to view this page.</p>
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
