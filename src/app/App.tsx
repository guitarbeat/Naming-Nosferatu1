/**
 * @module App
 * @description Main application component with consolidated routing and layout.
 * Routes, auth, and layout are now coordinated here.
 *
 * @component
 * @returns {JSX.Element} The complete application UI
 */

import {
	type ReactNode,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useState,
} from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { errorContexts, routeComponents } from "@/app/appConfig";
import { useAuth } from "@/app/providers/Providers";
import { NameSuggestionInner } from "@/features/tournament/components/NameSuggestion";
import { ProfileInner } from "@/features/tournament/components/ProfileSection";
import { useTournamentHandlers } from "@/features/tournament/hooks";
import Tournament from "@/features/tournament/Tournament";
import {
	AppLayout,
	Button,
	ErrorBoundary,
	Loading,
	Section,
} from "@/shared/components";
import { LoadingSequence } from "@/shared/components/layout/LoadingSequence";
import { TabNavigation } from "@/shared/components/layout/TabNavigation";
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

type HomeTab = "pick" | "suggest" | "profile";

function getHomeTabFromHash(hash: string): HomeTab {
	switch (hash) {
		case "#suggest":
			return "suggest";
		case "#profile":
			return "profile";
		default:
			return "pick";
	}
}

function HomeTabPanel({
	id,
	activeTab,
	children,
}: {
	id: HomeTab;
	activeTab: HomeTab;
	children: ReactNode;
}) {
	const isActive = activeTab === id;

	return (
		<div
			id={id}
			role="tabpanel"
			aria-hidden={!isActive}
			className={isActive ? "w-full" : "hidden w-full"}
		>
			{children}
		</div>
	);
}

function App() {
	const { user: authUser, isLoading } = useAuth();
	const isInitialized = !isLoading;
	const [hasCompletedBootSequence, setHasCompletedBootSequence] =
		useState(false);
	const { userActions } = useAppStore();
	const location = useLocation();
	const { pathname } = location;

	// Sync auth user with store
	useLayoutEffect(() => {
		if (pathname) {
			document.documentElement.scrollTop = 0;
			document.body.scrollTop = 0;
		}
	}, [pathname]);

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
	const handleBootSequenceComplete = useCallback(() => {
		setHasCompletedBootSequence(true);
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
			{!hasCompletedBootSequence && (
				<LoadingSequence
					title="Naming Nosferatu"
					subtitle="Preparing the tournament floor for the first matchup."
					onComplete={handleBootSequenceComplete}
				/>
			)}

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
	const location = useLocation();
	const navigate = useNavigate();
	const activeTab = getHomeTabFromHash(location.hash);

	const handleTabChange = useCallback(
		(tab: HomeTab) => {
			navigate(
				{
					pathname: "/",
					hash: tab === "pick" ? "" : tab,
				},
				{ replace: true },
			);
		},
		[navigate],
	);

	return (
		<Section
			id="home"
			variant="minimal"
			padding="comfortable"
			maxWidth="4xl"
			centered={true}
		>
			<div className="w-full space-y-10">
				{/* Tab Navigation */}
				<div className="w-full">
					<TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
				</div>

				{/* Tab Content */}
				<div className="min-h-[500px] w-full">
					<HomeTabPanel id="pick" activeTab={activeTab}>
						<Suspense fallback={<Loading variant="skeleton" height={400} />}>
							<TournamentFlow />
						</Suspense>
					</HomeTabPanel>

					<HomeTabPanel id="suggest" activeTab={activeTab}>
						<NameSuggestionInner />
					</HomeTabPanel>

					<HomeTabPanel id="profile" activeTab={activeTab}>
						<ProfileInner onLogin={(name) => login({ name })} />
					</HomeTabPanel>
				</div>
			</div>
		</Section>
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
		<Section
			id="tournament"
			variant="minimal"
			padding="compact"
			maxWidth="full"
		>
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
							Choose at least two names in the picker to start your tournament
							bracket.
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
		<Section
			id="analysis"
			variant="minimal"
			padding="comfortable"
			maxWidth="2xl"
			centered={true}
		>
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
			<Section
				id="admin"
				variant="minimal"
				padding="comfortable"
				maxWidth="md"
				centered={true}
			>
				<div className="flex flex-col items-center gap-4 py-10 text-center">
					<h2 className="text-3xl font-bold text-destructive">Access Denied</h2>
					<p className="text-muted-foreground">
						Admin access required to view this page.
					</p>
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
