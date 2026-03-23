import fs from 'fs';

const navFile = 'src/shared/components/layout/FloatingNavbar.tsx';
let navContent = fs.readFileSync(navFile, 'utf8');
navContent = navContent.replace('const isMobile = useIsMobile();', 'const _isMobile = useIsMobile();');
navContent = navContent.replace('const isComplete = tournament.isComplete;', 'const _isComplete = tournament.isComplete;');
fs.writeFileSync(navFile, navContent);
