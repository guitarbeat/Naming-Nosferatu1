import fs from 'fs';

const file = 'src/shared/services/errorManager.ts';
let content = fs.readFileSync(file, 'utf-8');

// I will just checkout the file and do it right since the previous patch messed up the syntax.
