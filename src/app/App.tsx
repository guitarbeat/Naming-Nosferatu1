/**
 * @module App
 * @description Main application component with consolidated routing and layout.
 * Routes, auth, and layout are now coordinated here.
 *
 * @component
 * @returns {JSX.Element} The complete application UI
 */

import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useCallback, useEffect, useLayoutEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { errorContexts, routeComponents } from "@/app/appConfig";
import { useAuth } from "@/app/providers/Providers";
import { NameSuggestionInner } from "@/features/tournament/components/NameSuggestion";
import { ProfileInner } from "@/features/tournament/components/ProfileSection";
import { useTournamentHandlers } from "@/features/tournament/hooks";
import Tournament from "@/features/tournament/Tournament";
import { AppLayout, Button, ErrorBoundary, Loading, Section } from "@/shared/components";
import { SectionHeading } from "@/shared/components/layout/SectionHeading";
import { useOfflineSync } from "@/shared/hooks";
import { Lightbulb, Trophy, X } from "@/shared/lib/icons";
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

function ProfileOverlay({ onClose }: { onClose: () => void }) {
	const { login } = useAuth();

	return (
		<motion.div
			className="fixed inset-0 z-40 flex items-center justify-center px-4 pb-24 sm:pb-4"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			<div
				className="absolute inset-0 bg-background/60 backdrop-blur-sm"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						onClose();
					}
				}}
				role="button"
				tabIndex={0}
				aria-label="Close profile"
			/>

			<motion.div
				className="relative z-50 w-full max-w-md overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-2xl"
				initial={{ y: 40, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: 40, opacity: 0 }}
				transition={{ type: "spring", damping: 28, stiffness: 300 }}
			>
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
			</motion.div>
		</motion.div>
	);
}

function App() {
	const { user: authUser, isLoading } = useAuth();
	const isInitialized = !isLoading;
	const ui = useAppStore((s) => s.ui);
	const uiActions = useAppStore((s) => s.uiActions);
	const userActions = useAppStore((s) => s.userActions);
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
		<AppLayout
			profileOverlay={
				<AnimatePresence>
					{ui.isProfileOpen && <ProfileOverlay onClose={() => uiActions.setProfileOpen(false)} />}
				</AnimatePresence>
			}
		>
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
	return (
		<>
			<Section id="pick" variant="minimal" padding="compact" maxWidth="xl" centered={true}>
				<SectionHeading icon={Trophy} title="Pick Names" />
				<Suspense fallback={<Loading variant="skeleton" height={400} />}>
					<TournamentFlow />
				</Suspense>
			</Section>

			<Section id="suggest" variant="minimal" padding="comfortable" maxWidth="lg" centered={true}>
				<SectionHeading
					icon={Lightbulb}
					title="Suggest a Name"
					subtitle="Got a great cat name? Share it with the community"
				/>
				<NameSuggestionInner />
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
		<Section id="analysis" variant="minimal" padding="comfortable" maxWidth="2xl" centered={true}>
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
			<Section id="admin" variant="minimal" padding="comfortable" maxWidth="md" centered={true}>
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
