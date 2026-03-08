/**
 * @module analyticsHooks
 * @description React hooks for analytics data fetching and display processing
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
        type AnalyticsDataItem,
        analyticsAPI,
        type ConsolidatedName,
        type HighlightItem,
        type LeaderboardItem,
        leaderboardAPI,
        type SelectionPopularityItem,
        statsAPI,
} from "@/services/analytics/analyticsService";
import { calculatePercentile } from "@/shared/lib/basic";

/* ==========================================================================
   DATA FETCHING HOOK
   ========================================================================== */

interface UseAnalysisDataProps {
        userName?: string | null;
        isAdmin?: boolean;
        userFilter?: string;
        dateFilter?: string;
        rankingPeriods?: number;
        enabled?: boolean;
}

export function useAnalysisData({
        userName,
        isAdmin,
        userFilter = "all",
        dateFilter = "all",
        rankingPeriods = 7,
        enabled = true,
}: UseAnalysisDataProps) {
        // 1. Leaderboard Data
        const leaderboardQuery = useQuery({
                queryKey: ["leaderboard"],
                queryFn: () => leaderboardAPI.getLeaderboard(null),
                enabled,
                staleTime: 1000 * 60 * 5, // 5 minutes
        });

        // 2. Selection Popularity
        const popularityQuery = useQuery({
                queryKey: ["selectionPopularity"],
                queryFn: () => analyticsAPI.getTopSelectedNames(null),
                enabled,
                staleTime: 1000 * 60 * 5,
        });

        // 3. Popularity Analytics (Admin only)
        const analyticsQuery = useQuery({
                queryKey: ["popularityAnalytics", userFilter, userName],
                queryFn: () => analyticsAPI.getPopularityScores(null, userFilter, userName),
                enabled: enabled && isAdmin,
                staleTime: 1000 * 60 * 5,
        });

        // 4. Ranking History
        const rankingHistoryQuery = useQuery({
                queryKey: ["rankingHistory", rankingPeriods, dateFilter],
                queryFn: () =>
                        analyticsAPI.getRankingHistory(10, rankingPeriods, {
                                dateFilter,
                        }),
                enabled,
                staleTime: 1000 * 60 * 15, // 15 minutes
        });

        // 5. Site Stats (Admin only)
        const siteStatsQuery = useQuery({
                queryKey: ["siteStats"],
                queryFn: () => statsAPI.getSiteStats(),
                enabled: enabled && isAdmin,
                staleTime: 1000 * 60 * 60, // 1 hour
        });

        return {
                leaderboardData: leaderboardQuery.data,
                selectionPopularity: popularityQuery.data,
                analyticsData: analyticsQuery.data,
                rankingHistory: rankingHistoryQuery.data,
                siteStats: siteStatsQuery.data,
                isLoading:
                        leaderboardQuery.isLoading ||
                        popularityQuery.isLoading ||
                        (isAdmin && analyticsQuery.isLoading) ||
                        rankingHistoryQuery.isLoading ||
                        (isAdmin && siteStatsQuery.isLoading),
                error:
                        leaderboardQuery.error ||
                        popularityQuery.error ||
                        analyticsQuery.error ||
                        rankingHistoryQuery.error ||
                        siteStatsQuery.error,
                refetch: () => {
                        leaderboardQuery.refetch();
                        popularityQuery.refetch();
                        if (isAdmin) {
                                analyticsQuery.refetch();
                                siteStatsQuery.refetch();
                        }
                        rankingHistoryQuery.refetch();
                },
        };
}

/* ==========================================================================
   DISPLAY DATA PROCESSING HOOK
   ========================================================================== */

export interface UseAnalysisDisplayDataProps {
        leaderboardData: LeaderboardItem[] | null;
        selectionPopularity: SelectionPopularityItem[] | null;
        analyticsData: AnalyticsDataItem[] | null;
        isAdmin: boolean;
        highlights?: { topRated?: HighlightItem[]; mostWins?: HighlightItem[] };
        filterConfig?: {
                selectionFilter?: string;
                dateFilter?: string;
                [key: string]: unknown;
        };
        sortField: string;
        sortDirection: string;
}

export function useAnalysisDisplayData({
        leaderboardData,
        selectionPopularity,
        analyticsData,
        isAdmin,
        highlights,
        filterConfig,
        sortField,
        sortDirection,
}: UseAnalysisDisplayDataProps) {
        // 1. Consolidate raw data from multiple sources
        const consolidatedNames = useMemo(() => {
                if (isAdmin && analyticsData?.length) {
                        return analyticsData.map((item) => ({
                                id: item.name_id,
                                name: item.name,
                                rating: item.avg_rating || 1500,
                                wins: item.total_wins || 0,
                                selected: item.times_selected || 0,
                                dateSubmitted: item.created_at || item.date_submitted || null,
                        }));
                }

                const nameMap = new Map<string, ConsolidatedName>();

                if (leaderboardData?.length) {
                        leaderboardData.forEach((item) => {
                                if ((item.avg_rating || 0) > 1500 || (item.wins ?? 0) > 0) {
                                        nameMap.set(String(item.name_id), {
                                                id: item.name_id,
                                                name: item.name,
                                                rating: item.avg_rating || 1500,
                                                wins: item.wins ?? 0,
                                                selected: 0,
                                                dateSubmitted: item.created_at || item.date_submitted || null,
                                        });
                                }
                        });
                }

                if (selectionPopularity?.length) {
                        selectionPopularity.forEach((item) => {
                                const existing = nameMap.get(String(item.name_id));
                                if (existing) {
                                        existing.selected = item.times_selected || 0;
                                } else {
                                        nameMap.set(String(item.name_id), {
                                                id: String(item.name_id),
                                                name: item.name,
                                                rating: 1500,
                                                wins: 0,
                                                selected: item.times_selected || 0,
                                                dateSubmitted: item.created_at || item.date_submitted || null,
                                        });
                                }
                        });
                }

                return Array.from(nameMap.values()).sort((a, b) => {
                        if (b.rating !== a.rating) {
                                return b.rating - a.rating;
                        }
                        return b.wins - a.wins;
                });
        }, [leaderboardData, selectionPopularity, analyticsData, isAdmin]);

        // 2. Filter and Sort
        const displayNames = useMemo((): ConsolidatedName[] => {
                let names: ConsolidatedName[] = [];

                if (isAdmin && consolidatedNames.length > 0) {
                        names = [...consolidatedNames];
                } else if (highlights?.topRated?.length) {
                        const highlightMap = new Map<string, ConsolidatedName>();
                        highlights.topRated.forEach((item) => {
                                highlightMap.set(item.id, {
                                        id: item.id,
                                        name: item.name,
                                        rating: item.avg_rating || item.value || 1500,
                                        wins: 0,
                                        selected: 0,
                                        dateSubmitted: null,
                                });
                        });
                        if (highlights.mostWins?.length) {
                                highlights.mostWins.forEach((item) => {
                                        const existing = highlightMap.get(item.id);
                                        if (existing) {
                                                existing.wins = item.value || 0;
                                        }
                                });
                        }
                        names = Array.from(highlightMap.values());
                } else {
                        names = consolidatedNames;
                }

                // Apply filters
                if (filterConfig) {
                        if (filterConfig.selectionFilter && filterConfig.selectionFilter !== "all") {
                                if (filterConfig.selectionFilter === "selected") {
                                        names = names.filter((n) => n.selected > 0);
                                } else if (filterConfig.selectionFilter === "never_selected") {
                                        names = names.filter((n) => n.selected === 0);
                                }
                        }

                        if (filterConfig.dateFilter && filterConfig.dateFilter !== "all") {
                                const now = new Date();
                                let filterDate = new Date(0);

                                switch (filterConfig.dateFilter) {
                                        case "today":
                                                filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                                break;
                                        case "week":
                                                filterDate = new Date(now);
                                                filterDate.setDate(now.getDate() - 7);
                                                break;
                                        case "month":
                                                filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
                                                break;
                                        case "year":
                                                filterDate = new Date(now.getFullYear(), 0, 1);
                                                break;
                                }

                                names = names.filter((n) => {
                                        if (!n.dateSubmitted) {
                                                return false;
                                        }
                                        const submittedDate = new Date(n.dateSubmitted as string);
                                        return submittedDate >= filterDate;
                                });
                        }
                }

                // Apply sorting
                if (sortField) {
                        names.sort((a, b) => {
                                let aVal = a[sortField as keyof ConsolidatedName] as string | number | null | undefined;
                                let bVal = b[sortField as keyof ConsolidatedName] as string | number | null | undefined;

                                if (sortField === "dateSubmitted") {
                                        aVal = aVal ? new Date(aVal as string).getTime() : 0;
                                        bVal = bVal ? new Date(bVal as string).getTime() : 0;
                                }

                                if (typeof aVal === "string" && typeof bVal === "string") {
                                        return sortDirection === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
                                }

                                const aNum = Number(aVal) || 0;
                                const bNum = Number(bVal) || 0;
                                return sortDirection === "desc" ? bNum - aNum : aNum - bNum;
                        });
                }

                return names;
        }, [highlights, consolidatedNames, isAdmin, sortField, sortDirection, filterConfig]);

        // 3. Summary Stats
        const summaryStats = useMemo(() => {
                if (displayNames.length === 0) {
                        return null;
                }

                const maxRating = Math.max(...displayNames.map((n) => n.rating));
                const maxWins = Math.max(...displayNames.map((n) => n.wins));
                const maxSelected = Math.max(...displayNames.map((n) => n.selected));
                const avgRating = displayNames.reduce((sum, n) => sum + n.rating, 0) / displayNames.length;
                const avgWins = displayNames.reduce((sum, n) => sum + n.wins, 0) / displayNames.length;
                const totalSelected = displayNames.reduce((sum, n) => sum + n.selected, 0);

                return {
                        maxRating,
                        maxWins,
                        maxSelected,
                        avgRating: Math.round(avgRating),
                        avgWins: Math.round(avgWins * 10) / 10,
                        totalSelected,
                        topName: displayNames[0],
                };
        }, [displayNames]);

        // 4. Insights & Percentiles
        const namesWithInsights = useMemo(() => {
                if (displayNames.length === 0) {
                        return [];
                }

                const ratings = displayNames.map((n) => n.rating);
                const selectedCounts = displayNames.map((n) => n.selected);

                return displayNames.map((item) => {
                        const ratingPercentile = calculatePercentile(item.rating, ratings, true);
                        const selectedPercentile = calculatePercentile(item.selected, selectedCounts, true);

                        const insights: string[] = [];
                        if (ratingPercentile <= 10) {
                                insights.push("worst_rated");
                        }
                        if (selectedPercentile <= 10 && item.selected === 0) {
                                insights.push("never_selected");
                        }
                        if (item.selected === 0 && item.wins === 0 && item.rating <= 1500) {
                                insights.push("inactive");
                        }
                        if (ratingPercentile <= 20 && selectedPercentile <= 20) {
                                insights.push("poor_performer");
                        }
                        if (ratingPercentile >= 90) {
                                insights.push("top_rated");
                        }
                        if (selectedPercentile >= 90) {
                                insights.push("most_selected");
                        }
                        if (item.wins > 5 && item.wins / (item.wins + (item as any).losses || 1) > 0.8) {
                                insights.push("high_win_rate");
                        }
                        if (ratingPercentile >= 70 && selectedPercentile < 30) {
                                insights.push("underrated");
                        }
                        if (item.wins > 0 && !displayNames.find((n) => n.id !== item.id && n.wins > 0)) {
                                insights.push("undefeated");
                        }

                        return {
                                ...item,
                                ratingPercentile,
                                selectedPercentile,
                                insights,
                        };
                });
        }, [displayNames]);

        const generalInsights = useMemo(() => {
                if (!summaryStats || displayNames.length === 0) {
                        return [];
                }

                const result: Array<{ type: string; message: string; icon: string }> = [];

                const [worstRated] = [...displayNames].sort((a, b) => a.rating - b.rating);
                if (worstRated && worstRated.rating < 1500) {
                        result.push({
                                type: "warning",
                                message: `${worstRated.name} has the lowest rating(${worstRated.rating}) - consider hiding`,
                                icon: "⚠️",
                        });
                }

                const neverSelectedCount = displayNames.filter((n) => n.selected === 0).length;
                if (neverSelectedCount > 0) {
                        result.push({
                                type: "warning",
                                message: `${neverSelectedCount} names never selected - consider hiding inactive ones`,
                                icon: "🗑️",
                        });
                }

                if (summaryStats.topName) {
                        result.push({
                                type: "info",
                                message: `${summaryStats.topName.name} leads with a rating of ${summaryStats.topName.rating} `,
                                icon: "🏆",
                        });
                }

                return result;
        }, [summaryStats, displayNames]);

        return {
                displayNames,
                summaryStats,
                namesWithInsights,
                generalInsights,
        };
}
