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
import { NameSuggestionInner } from "@/features/tournament/components/NameSuggestion";
import { ProfileInner } from "@/features/tournament/components/ProfileSection";
import { useTournamentHandlers } from "@/features/tournament/hooks";
import Tournament from "@/features/tournament/Tournament";
import { AppLayout, Button, ErrorBoundary, Loading, Section } from "@/shared/components";
import { SectionHeading } from "@/shared/components/layout/SectionHeading";
import { Lightbulb, Trophy, User } from "@/shared/lib/icons";
import { useOfflineSync } from "@/shared/hooks";
import {
	cleanupPerformanceMonitoring,
	initializePerformanceMonitoring,
} from "@/shared/lib/performance";
import { ErrorManager } from "@/shared/services/errorManager";
import { updateSupabaseUserContext } from "@/shared/services/supabase/runtime";
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
			<Section id="pick" variant="minimal" padding="compact" maxWidth="full">
				<div className="mx-auto max-w-4xl">
					<SectionHeading
						icon={Trophy}
						title="Pick Names"
						subtitle="Select your favorite cat names to battle it out"
					/>
				</div>
				<Suspense fallback={<Loading variant="skeleton" height={400} />}>
					<TournamentFlow />
				</Suspense>
			</Section>

			<Section id="suggest" variant="minimal" padding="comfortable" maxWidth="lg" centered>
				<SectionHeading
					icon={Lightbulb}
					title="Suggest a Name"
					subtitle="Got a great cat name? Share it with the community"
				/>
				<NameSuggestionInner />
			</Section>

			<Section id="profile" variant="minimal" padding="comfortable" maxWidth="md" centered>
				<SectionHeading
					icon={User}
					title="Your Profile"
					subtitle="Track your rankings and tournament history"
				/>
				<ProfileInner onLogin={(name) => login({ name })} />
			</Section>
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
		<Section id="tournament" variant="minimal" padding="compact" maxWidth="full">
			<Suspense fallback={<Loading variant="skeleton" height={400} />}>
				{tournament.names && tournament.names.length > 0 ? (
					<Tournament
						names={tournament.names}
						existingRatings={tournament.ratings}
						onComplete={handleTournamentComplete}
					/>
				) : (
					<div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-10 text-center">
						<h2 className="text-2xl font-bold text-balance bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter sm:text-3xl">
							No contenders yet
						</h2>
						<p className="text-muted-foreground text-pretty">
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
		<Section id="analysis" variant="minimal" padding="comfortable" maxWidth="2xl" centered>
			<h2 className="mb-8 text-center text-3xl font-bold text-balance bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter sm:mb-12 md:text-5xl">
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

	if (!user.isAdmin) {
		return (
			<Section id="admin" variant="minimal" padding="comfortable" maxWidth="md" centered>
				<div className="flex flex-col items-center gap-4 py-10 text-center">
					<h2 className="text-3xl font-bold text-destructive">Access Denied</h2>
					<p className="text-muted-foreground">Admin access required to view this page.</p>
				</div>
			</Section>
		);
	}

	return (
		<Section id="admin" variant="minimal" padding="comfortable" maxWidth="2xl">
			<Suspense fallback={<Loading variant="skeleton" height={600} />}>
				<ErrorBoundary context={errorContexts.analysisDashboard}>
					<AdminDashboardLazy />
				</ErrorBoundary>
			</Suspense>
		</Section>
	);
}

export default App;
