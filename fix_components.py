import re

with open('src/features/analytics/AnalysisComponents.tsx', 'r') as f:
    content = f.read()

# I accidentally duplicated the useMemo definitions. I need to remove the duplicates.

actionable_memo = """        const lowPerformers = useMemo(() => {
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
        }, [namesWithInsights]);"""

count = content.count(actionable_memo)
if count > 1:
    content = content.replace(actionable_memo, "", 1)
    print("Removed duplicate actionable useMemo")

positive_memo = """        const topPerformers = useMemo(() => {
                const positiveTags = ["top_rated", "most_selected", "underrated", "undefeated"];
                return namesWithInsights
                        .filter((n) => n.insights.some((i: string) => positiveTags.includes(i)))
                        .slice(0, 6);
        }, [namesWithInsights]);"""

count2 = content.count(positive_memo)
if count2 > 1:
    content = content.replace(positive_memo, "", 1)
    print("Removed duplicate positive useMemo")

with open('src/features/analytics/AnalysisComponents.tsx', 'w') as f:
    f.write(content)
