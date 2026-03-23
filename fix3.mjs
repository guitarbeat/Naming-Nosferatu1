import fs from 'fs';

const nsFile = 'src/features/tournament/components/NameSelector.tsx';
let nsContent = fs.readFileSync(nsFile, 'utf8');
nsContent = nsContent.replace('[names, setLightboxIndex, setLightboxOpen]', '[names]');
nsContent = nsContent.replace('const isLocked = actionType === "toggle-locked";', 'const _isLocked = actionType === "toggle-locked";');
fs.writeFileSync(nsFile, nsContent);

const magicFile = 'src/shared/components/layout/MagicMoire.tsx';
let magicContent = fs.readFileSync(magicFile, 'utf8');
magicContent = magicContent.replace('}, [onError]);', '}, [onError, theme]);');
fs.writeFileSync(magicFile, magicContent);

const errFile = 'src/shared/services/errorManager.ts';
let errContent = fs.readFileSync(errFile, 'utf8');
errContent = errContent.replace('let lastErr;', 'let lastErr: unknown;');
fs.writeFileSync(errFile, errContent);
