import fs from 'fs';

const navFile = 'src/shared/components/layout/FloatingNavbar.tsx';
let navContent = fs.readFileSync(navFile, 'utf8');
navContent = navContent.replace('if (isTournamentRoute) {\n\t\treturn null;\n\t}', '');
navContent = navContent.replace('return (\n\t\t<AnimatePresence>', 'if (isTournamentRoute) return null;\n\n\treturn (\n\t\t<AnimatePresence>');
fs.writeFileSync(navFile, navContent);

const apiFile = 'src/shared/services/supabase/api.ts';
let apiContent = fs.readFileSync(apiFile, 'utf8');
apiContent = apiContent.replace(/<T extends Record<string, any>>/g, '<T extends Record<string, unknown>>');
apiContent = apiContent.replace(/Record<string, any>/g, 'Record<string, unknown>');
apiContent = apiContent.replace(/let query: any = /g, 'let query = ');
apiContent = apiContent.replace(/client \= \(await resolveSupabaseClient\(\)\) as any/g, 'client = (await resolveSupabaseClient()) as any');
fs.writeFileSync(apiFile, apiContent);

const adminFile = 'src/features/admin/AdminDashboard.tsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');
adminContent = adminContent.replace(/type="button"\n\t\t\t\t\t\t\tonClick=\{\(\) \=\> handleTabChange\(tab.id\)\}\n\t\t\t\t\t\t\ttype="button"/g, 'type="button"\n\t\t\t\t\t\t\tonClick={() => handleTabChange(tab.id)}');
fs.writeFileSync(adminFile, adminContent);
