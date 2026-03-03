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
    // Memoized version simulating React.useMemo
    const highPriorityTags = ["worst_rated", "never_selected", "inactive", "poor_performer"];
    const priority: Record<string, number> = {
      inactive: 0,
      never_selected: 1,
      worst_rated: 2,
      poor_performer: 3,
    };

    // Simulating useMemo caching the sorted array
    const sortedLowPerformers = (() => {
      const lowPerformers = [];
      for (let i = 0; i < namesWithInsights.length; i++) {
          const n = namesWithInsights[i];
          let minPriority = 99;
          let hasHighPriorityTag = false;

          for (let j = 0; j < n.insights.length; j++) {
              const insight = n.insights[j];
              // Avoid .includes on an array of length 4, just checking strings
              if (insight === "inactive" || insight === "never_selected" || insight === "worst_rated" || insight === "poor_performer") {
                  hasHighPriorityTag = true;
                  const p = priority[insight] ?? 99;
                  if (p < minPriority) {
                      minPriority = p;
                  }
              }
          }

          if (hasHighPriorityTag) {
              lowPerformers.push({ item: n, minPriority });
          }
      }

      return lowPerformers
        .sort((a, b) => {
          if (a.minPriority !== b.minPriority) {
            return a.minPriority - b.minPriority;
          }
          return a.item.rating - b.item.rating;
        })
        .slice(0, 12)
        .map(wrapper => wrapper.item);
    })();
  }

  const end = performance.now();
  console.log(`Optimized loop time with optimized priority checks (100 iterations, 50,000 items): ${(end - start).toFixed(2)}ms`);
}

simulateRender();
