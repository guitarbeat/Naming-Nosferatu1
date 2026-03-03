const fs = require('fs');

const path = 'src/features/analytics/AnalysisComponents.tsx';
let content = fs.readFileSync(path, 'utf8');

// Actionable
const actionableRegex = /const renderActionableInsights = \(\) => {\n\s+const highPriorityTags = \["worst_rated", "never_selected", "inactive", "poor_performer"\];\n\s+const lowPerformers = namesWithInsights\.filter\(\(n\) =>\n\s+n\.insights\.some\(\(i: string\) => highPriorityTags\.includes\(i\)\),\n\s+\);\n\n\s+if \(lowPerformers\.length === 0\) {\n\s+return null;\n\s+}\n\n\s+return \(\n\s+<div className="mb-6">\n\s+<h3 className="text-lg font-bold text-white mb-3">⚠️ Names to Consider Hiding<\/h3>\n\s+<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">\n\s+{lowPerformers\n\s+\.sort\(\(a, b\) => {\n\s+const priority: Record<string, number> = {\n\s+inactive: 0,\n\s+never_selected: 1,\n\s+worst_rated: 2,\n\s+poor_performer: 3,\n\s+};\n\s+const getP = \(item: NameWithInsight\) =>\n\s+Math\.min\(\n\s+\.\.\.item\.insights\n\s+\.filter\(\(i: string\) => highPriorityTags\.includes\(i\)\)\n\s+\.map\(\(i: string\) => priority\[i\] \?\? 99\),\n\s+\);\n\s+const pA = getP\(a\);\n\s+const pB = getP\(b\);\n\s+if \(pA !== pB\) {\n\s+return pA - pB;\n\s+}\n\s+return a\.rating - b\.rating;\n\s+}\)\n\s+\.slice\(0, 12\)\n\s+\.map\(\(n\) => \(/m;

const actionableReplacement = `const lowPerformers = useMemo(() => {
                const highPriorityTags = ["worst_rated", "never_selected", "inactive", "poor_performer"];
                const priority: Record<string, number> = {
                        inactive: 0,
                        never_selected: 1,
                        worst_rated: 2,
                        poor_performer: 3,
                };

                const filteredAndMapped = [];
                for (let i = 0; i < namesWithInsights.length; i++) {
                        const n = namesWithInsights[i];
                        let minPriority = 99;
                        let hasHighPriorityTag = false;

                        if (n.insights) {
                                for (let j = 0; j < n.insights.length; j++) {
                                        const insight = n.insights[j];
                                        if (highPriorityTags.includes(insight as string)) {
                                                hasHighPriorityTag = true;
                                                const p = priority[insight as string] ?? 99;
                                                if (p < minPriority) {
                                                        minPriority = p;
                                                }
                                        }
                                }
                        }

                        if (hasHighPriorityTag) {
                                filteredAndMapped.push({ item: n, minPriority });
                        }
                }

                return filteredAndMapped
                        .sort((a, b) => {
                                if (a.minPriority !== b.minPriority) {
                                        return a.minPriority - b.minPriority;
                                }
                                return a.item.rating - b.item.rating;
                        })
                        .slice(0, 12)
                        .map(wrapper => wrapper.item);
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
                                        {lowPerformers.map((n) => (`

if (content.match(actionableRegex)) {
    content = content.replace(actionableRegex, actionableReplacement);
    console.log("Replaced Actionable");
} else {
    console.log("Could not find actionable regex match.");
}


// Positive
const positiveRegex = /const renderPositiveInsights = \(\) => {\n\s+const positiveTags = \["top_rated", "most_selected", "underrated", "undefeated"\];\n\s+const topPerformers = namesWithInsights\.filter\(\(n\) =>\n\s+n\.insights\.some\(\(i: string\) => positiveTags\.includes\(i\)\),\n\s+\);\n\n\s+if \(topPerformers\.length === 0\) {\n\s+return null;\n\s+}\n\n\s+return \(\n\s+<div className="mb-6">\n\s+<h3 className="text-lg font-bold text-white mb-3">✨ Top Performers \(Keep\)<\/h3>\n\s+<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">\n\s+{topPerformers\.slice\(0, 6\)\.map\(\(n\) => \(/m;

const positiveReplacement = `const topPerformers = useMemo(() => {
                const positiveTags = ["top_rated", "most_selected", "underrated", "undefeated"];
                return namesWithInsights
                        .filter((n) => n.insights && n.insights.some((i: string) => positiveTags.includes(i)))
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
                                        {topPerformers.map((n) => (`

if (content.match(positiveRegex)) {
    content = content.replace(positiveRegex, positiveReplacement);
    console.log("Replaced Positive");
} else {
    console.log("Could not find positive regex match.");
}

fs.writeFileSync(path, content, 'utf8');
