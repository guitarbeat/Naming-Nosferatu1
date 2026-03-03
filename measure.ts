import { performance } from 'perf_hooks';

// Simulate the logic in renderActionableInsights
const simulateRender = () => {
  // Generate names
  const count = 50000;
  const tags = ["worst_rated", "never_selected", "inactive", "poor_performer", "top_rated", "most_selected", "underrated", "undefeated", "average"];
  const namesWithInsights = Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Name ${i}`,
    rating: Math.random() * 2000,
    selected: Math.floor(Math.random() * 100),
    wins: Math.floor(Math.random() * 50),
    insights: [
      tags[Math.floor(Math.random() * tags.length)],
      tags[Math.floor(Math.random() * tags.length)]
    ]
  }));

  const start = performance.now();

  for (let iter = 0; iter < 100; iter++) {
    // Current unoptimized code
    const highPriorityTags = ["worst_rated", "never_selected", "inactive", "poor_performer"];
    const lowPerformers = namesWithInsights.filter((n) =>
      n.insights.some((i: string) => highPriorityTags.includes(i)),
    );

    if (lowPerformers.length === 0) {
      continue;
    }

    lowPerformers
      .sort((a, b) => {
        const priority: Record<string, number> = {
          inactive: 0,
          never_selected: 1,
          worst_rated: 2,
          poor_performer: 3,
        };
        const getP = (item: any) =>
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
  }

  const end = performance.now();
  console.log(`Baseline loop time (100 iterations, 50,000 items): ${(end - start).toFixed(2)}ms`);
}

simulateRender();
