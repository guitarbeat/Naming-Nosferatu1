import re

with open('src/features/analytics/AnalysisComponents.tsx', 'r') as f:
    content = f.read()

# Make sure we import useMemo at the top. It might already be there, let's check
if 'useMemo' not in content:
    content = content.replace("import { useCallback } from \"react\";", "import { useCallback, useMemo } from \"react\";")

# Wait, useMemo is already imported in `import { useCallback, useMemo } from "react";`

# We need to replace the functions *inside* AnalysisInsights
# AnalysisInsights starts at:
# export const AnalysisInsights: React.FC<AnalysisInsightsProps> = ({ ... }) => {

old_code = """        const renderActionableInsights = () => {
                const highPriorityTags = ["worst_rated", "never_selected", "inactive", "poor_performer"];
                const lowPerformers = namesWithInsights.filter((n) =>
                        n.insights.some((i: string) => highPriorityTags.includes(i)),
                );

                if (lowPerformers.length === 0) {
                        return null;
                }

                return (
                        <div className="mb-6">
                                <h3 className="text-lg font-bold text-white mb-3">⚠️ Names to Consider Hiding</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {lowPerformers
                                                .sort((a, b) => {
                                                        const priority: Record<string, number> = {
                                                                inactive: 0,
                                                                never_selected: 1,
                                                                worst_rated: 2,
                                                                poor_performer: 3,
                                                        };
                                                        const getP = (item: NameWithInsight) =>
                                                                Math.min(
                                                                        ...item.insights
                                                                                .filter((i: string) => highPriorityTags.includes(i))
                                                                                .map((i: string) => priority[i] ?? 99),
                                                                );
                                                        const pA = getP(a);
                                                        const pB = getP(b);
                                                        if (pA !== pB) {
                                                                return pA - pB;
                                                        }
                                                        return a.rating - b.rating;
                                                })
                                                .slice(0, 12)
                                                .map((n) => ("""

new_code = """        const lowPerformers = useMemo(() => {
                const highPriorityTags = ["worst_rated", "never_selected", "inactive", "poor_performer"];
                const filtered = namesWithInsights.filter((n) =>
                        n.insights.some((i: string) => highPriorityTags.includes(i)),
                );

                return filtered
                        .sort((a, b) => {
                                const priority: Record<string, number> = {
                                        inactive: 0,
                                        never_selected: 1,
                                        worst_rated: 2,
                                        poor_performer: 3,
                                };
                                const getP = (item: NameWithInsight) =>
                                        Math.min(
                                                ...item.insights
                                                        .filter((i: string) => highPriorityTags.includes(i))
                                                        .map((i: string) => priority[i] ?? 99),
                                        );
                                const pA = getP(a);
                                const pB = getP(b);
                                if (pA !== pB) {
                                        return pA - pB;
                                }
                                return a.rating - b.rating;
                        })
                        .slice(0, 12);
        }, [namesWithInsights]);

        const renderActionableInsights = () => {
                const highPriorityTags = ["worst_rated", "never_selected", "inactive", "poor_performer"];

                if (lowPerformers.length === 0) {
                        return null;
                }

                return (
                        <div className="mb-6">
                                <h3 className="text-lg font-bold text-white mb-3">⚠️ Names to Consider Hiding</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {lowPerformers.map((n) => ("""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Actionable insights replaced correctly")
else:
    print("Could not find exact old code for actionable")

old_code_pos = """        const renderPositiveInsights = () => {
                const positiveTags = ["top_rated", "most_selected", "underrated", "undefeated"];
                const topPerformers = namesWithInsights.filter((n) =>
                        n.insights.some((i: string) => positiveTags.includes(i)),
                );

                if (topPerformers.length === 0) {
                        return null;
                }

                return (
                        <div className="mb-6">
                                <h3 className="text-lg font-bold text-white mb-3">✨ Top Performers (Keep)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {topPerformers.slice(0, 6).map((n) => ("""

new_code_pos = """        const topPerformers = useMemo(() => {
                const positiveTags = ["top_rated", "most_selected", "underrated", "undefeated"];
                return namesWithInsights
                        .filter((n) => n.insights.some((i: string) => positiveTags.includes(i)))
                        .slice(0, 6);
        }, [namesWithInsights]);

        const renderPositiveInsights = () => {
                const positiveTags = ["top_rated", "most_selected", "underrated", "undefeated"];

                if (topPerformers.length === 0) {
                        return null;
                }

                return (
                        <div className="mb-6">
                                <h3 className="text-lg font-bold text-white mb-3">✨ Top Performers (Keep)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {topPerformers.map((n) => ("""

if old_code_pos in content:
    content = content.replace(old_code_pos, new_code_pos)
    print("Positive insights replaced correctly")
else:
    print("Could not find exact old code for positive")

with open('src/features/analytics/AnalysisComponents.tsx', 'w') as f:
    f.write(content)
