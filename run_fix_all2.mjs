import fs from 'fs';

// 4. FloatingNavbar.tsx
const navFile = 'src/shared/components/layout/FloatingNavbar.tsx';
let navContent = fs.readFileSync(navFile, 'utf8');

if (!navContent.includes('if (isTournamentRoute) return null;')) {
  navContent = navContent.replace('return (\n\t\t<motion.div', 'if (isTournamentRoute) return null;\n\n\treturn (\n\t\t<motion.div');
}
fs.writeFileSync(navFile, navContent);
