import fs from 'fs';

const navFile = 'src/shared/components/layout/FloatingNavbar.tsx';
let navContent = fs.readFileSync(navFile, 'utf8');
navContent = navContent.replace('const isMobile = useIsMobile();', 'const _isMobile = useIsMobile();');
navContent = navContent.replace('const isComplete = tournament.isComplete;', 'const _isComplete = tournament.isComplete;');
fs.writeFileSync(navFile, navContent);

const apiFile = 'src/shared/services/supabase/api.ts';
let apiContent = fs.readFileSync(apiFile, 'utf8');
apiContent = apiContent.replace('const safeLocalStorageSet =', 'const _safeLocalStorageSet =');
apiContent = apiContent.replace('const validateRatingsData =', 'const _validateRatingsData =');
fs.writeFileSync(apiFile, apiContent);

const authFile = 'src/services/supabaseAuthAdapter.ts';
let authContent = fs.readFileSync(authFile, 'utf8');
authContent = authContent.replace('removeStorageItem,', '');
fs.writeFileSync(authFile, authContent);
