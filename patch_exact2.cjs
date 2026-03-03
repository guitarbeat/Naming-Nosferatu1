const fs = require('fs');
let content = fs.readFileSync('src/features/analytics/AnalysisComponents.tsx', 'utf8');

// Use regex to remove duplicate useMemo definitions I added earlier by mistake
const regex1 = /^\s*const lowPerformers = useMemo\(\(\) => \{[\s\S]*?\}\, \[namesWithInsights\]\);\n/m;
content = content.replace(regex1, '');

const regex2 = /^\s*const topPerformers = useMemo\(\(\) => \{[\s\S]*?\}\, \[namesWithInsights\]\);\n/m;
content = content.replace(regex2, '');

fs.writeFileSync('src/features/analytics/AnalysisComponents.tsx', content);
