/**
 * @module routes
 * @description Route-based code splitting. Lazy route components load on navigation.
 */

import { lazy, Suspense } from "react";
import { ProfileSection } from "@/features/tournament/components/ProfileSection";
import { useTournamentHandlers } from "@/features/tournament/hooks";
import { Loading, Section } from "@/shared/components/layout";
import useAppStore from "@/store/appStore";

/* Lazy route chunks – loaded when user navigates to the route */
const TournamentFlow = lazy(() => import("@/features/tournament/modes/TournamentFlow"));
const DashboardLazy = lazy(() =>
        import("@/features/analytics/Dashboard").then((m) => ({
                default: m.Dashboard,
        })),
);

/** Wrapper that reads store and handlers and renders Dashboard (for /analysis route). */
function AnalysisPage() {
        const { user, tournament, tournamentActions } = useAppStore();
        const { handleStartNewTournament, handleUpdateRatings } = useTournamentHandlers({
                userName: user.name,
                tournamentActions,
        });
        return (
                <DashboardLazy
                        personalRatings={tournament.ratings}
                        currentTournamentNames={tournament.names ?? undefined}
                        onStartNew={handleStartNewTournament}
                        onUpdateRatings={handleUpdateRatings}
                        userName={user.name ?? ""}
                />
        );
}

const routeFallback = <Loading variant="skeleton" height={400} />;

interface HomeRouteProps {
        onLogin: (name: string) => Promise<boolean | undefined>;
}

export function HomeRoute({ onLogin }: HomeRouteProps) {
        return (
                <>
                        <div id="pick" className="absolute -top-20" />
                        <Section id="play" variant="minimal" padding="comfortable" maxWidth="full">
                                <Suspense fallback={routeFallback}>
                                        <TournamentFlow />
                                </Suspense>
                        </Section>
                        <ProfileSection onLogin={onLogin} />
                </>
        );
}

export function AnalysisRoute() {
        return (
                <Section id="analysis" variant="minimal" padding="comfortable" maxWidth="full">
                        <h2 className="text-3xl md:text-5xl font-bold mb-12 text-center bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent uppercase tracking-tighter">
                                The Victors Emerge
                        </h2>
                        <Suspense fallback={<Loading variant="skeleton" height={600} />}>
                                <AnalysisPage />
                        </Suspense>
                </Section>
        );
}
