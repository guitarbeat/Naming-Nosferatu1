import fs from 'fs';

const file = 'src/shared/services/errorManager.ts';
let content = fs.readFileSync(file, 'utf-8');

// I need to add a comma after the `dumpDiagnostics` block closing `}`
content = content.replace(/return formatted;\n\t\}/g, 'return formatted;\n\t},');

fs.writeFileSync(file, content);
