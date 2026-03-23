import fs from 'fs';

const nsFile = 'src/features/tournament/components/NameSelector.tsx';
let nsContent = fs.readFileSync(nsFile, 'utf8');
nsContent = nsContent.replace('// biome-ignore lint/a11y/useSemanticElements: This is complex UI interaction\n', '');
nsContent = nsContent.replace('// biome-ignore lint/a11y/noStaticElementInteractions: Used as tooltip wrapper\n', '');
nsContent = nsContent.replace('// biome-ignore lint/correctness/useExhaustiveDependencies: Ignore\n', '');
fs.writeFileSync(nsFile, nsContent);

const errFile = 'src/shared/services/errorManager.ts';
let errContent = fs.readFileSync(errFile, 'utf8');
errContent = errContent.replace('// biome-ignore lint/complexity/noStaticOnlyClass: Used as namespace\n', '');
fs.writeFileSync(errFile, errContent);

const appFile = 'src/shared/components/layout/AppLayout.tsx';
let appContent = fs.readFileSync(appFile, 'utf8');
appContent = appContent.replace('!isImmersiveRoute ? "app-main-shell--nav-safe" : ""', 'isImmersiveRoute ? "" : "app-main-shell--nav-safe"');
fs.writeFileSync(appFile, appContent);

const heroFile = 'src/shared/components/layout/CatNameHero.tsx';
let heroContent = fs.readFileSync(heroFile, 'utf8');
heroContent = heroContent.replace('!isSet ? " cat-name-hero__part--placeholder" : ""', 'isSet ? "" : " cat-name-hero__part--placeholder"');
fs.writeFileSync(heroFile, heroContent);
