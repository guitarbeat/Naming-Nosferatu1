import fs from 'fs';

const navFile = 'src/shared/components/layout/FloatingNavbar.tsx';
let content = fs.readFileSync(navFile, 'utf8');

// The error is: conditionally calling hooks.
// `isTournamentRoute` early return must happen *after* all hooks.
content = content.replace('if (isTournamentRoute) return null;\n\n\treturn (\n\t\t<AnimatePresence>', 'return (\n\t\t<AnimatePresence>');
// we need to wrap the return JSX with the condition instead of early returning.
content = content.replace('return (\n\t\t<AnimatePresence>', 'if (isTournamentRoute) return null;\n\n\treturn (\n\t\t<AnimatePresence>');

// Actually, wait, let's just make the return condition right at the end of the component
let newNavContent = fs.readFileSync(navFile, 'utf8');
newNavContent = newNavContent.replace('if (isTournamentRoute) return null;\n\n\treturn (\n\t\t<AnimatePresence>', 'return (\n\t\t<AnimatePresence>');
newNavContent = newNavContent.replace('return (\n\t\t<AnimatePresence>', 'if (isTournamentRoute) return null;\n\n\treturn (\n\t\t<AnimatePresence>');
fs.writeFileSync(navFile, newNavContent);
