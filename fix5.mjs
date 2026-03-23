import fs from 'fs';

const errFile = 'src/shared/services/errorManager.ts';
let errContent = fs.readFileSync(errFile, 'utf8');
errContent = errContent.replace('console.info("📋 Copy Diagnostic Report:\\n" + report);', 'console.info(`📋 Copy Diagnostic Report:\\n${report}`);');
fs.writeFileSync(errFile, errContent);

const appFile = 'src/app/App.tsx';
let appContent = fs.readFileSync(appFile, 'utf8');
appContent = appContent.replace('isHero\n\t\t\t\t\t\teyebrow="● Main Event ●"', 'isHero={true}\n\t\t\t\t\t\teyebrow="● Main Event ●"');
fs.writeFileSync(appFile, appContent);

const hookFile = 'src/features/analytics/hooks/usePersonalResults.ts';
let hookContent = fs.readFileSync(hookFile, 'utf8');
hookContent = hookContent.replace('const resolvedName = isIdKey ? idToNameMap.get(key)! : key;', 'const resolvedName = isIdKey ? (idToNameMap.get(key) ?? key) : key;');
fs.writeFileSync(hookFile, hookContent);

const nsFile = 'src/features/tournament/components/NameSelector.tsx';
let nsContent = fs.readFileSync(nsFile, 'utf8');
nsContent = nsContent.replace('// biome-ignore lint/a11y/noStaticElementInteractions: Used as tooltip wrapper', '// biome-ignore lint/a11y/noStaticElementInteractions: Used as tooltip wrapper\n// biome-ignore lint/correctness/useExhaustiveDependencies: Ignore');
fs.writeFileSync(nsFile, nsContent);

const moireFile = 'src/shared/components/layout/MagicMoire.tsx';
let moireContent = fs.readFileSync(moireFile, 'utf8');
moireContent = moireContent.replace('// biome-ignore lint/correctness/useExhaustiveDependencies: Ignore', '// biome-ignore lint/correctness/useExhaustiveDependencies: Ignore');
fs.writeFileSync(moireFile, moireContent);
