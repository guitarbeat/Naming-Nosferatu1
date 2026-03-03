// Mock import.meta.env
global.import = { meta: { env: { VITE_API_BASE_URL: 'http://localhost:3000' } } };

import React, { useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalysisInsights } from './src/features/analytics/AnalysisComponents';

// Mock data generator
const generateNamesWithInsights = (count) => {
  const tags = ["worst_rated", "never_selected", "inactive", "poor_performer", "top_rated", "most_selected", "underrated", "undefeated", "average"];
  return Array.from({ length: count }, (_, i) => ({
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
};

const names = generateNamesWithInsights(5000); // Create a large dataset to make the performance issue noticeable

const mockProps = {
  namesWithInsights: names,
  summaryStats: null,
  generalInsights: [],
  isAdmin: false,
  canHideNames: false,
  onHideName: async () => {},
};

// Warmup
for (let i = 0; i < 10; i++) {
  renderToStaticMarkup(<AnalysisInsights {...mockProps} />);
}

const start = performance.now();
for (let i = 0; i < 100; i++) {
  renderToStaticMarkup(<AnalysisInsights {...mockProps} />);
}
const end = performance.now();

console.log(`Baseline render time (100 iterations, 5000 items): ${(end - start).toFixed(2)}ms`);
