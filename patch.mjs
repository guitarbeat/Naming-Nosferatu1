import fs from 'fs';

function applyFixes(file, search, replace) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
}

// 1. errorManager.ts
applyFixes('src/shared/services/errorManager.ts', /export class ErrorManager \{/g, 'const ErrorManager = {\n');
applyFixes('src/shared/services/errorManager.ts', /static handleError\(/g, 'handleError: function(');
applyFixes('src/shared/services/errorManager.ts', /static logDiagnostic\(/g, 'logDiagnostic: function(');
applyFixes('src/shared/services/errorManager.ts', /static captureException\(/g, 'captureException: function(');
applyFixes('src/shared/services/errorManager.ts', /static async dumpDiagnostics\(/g, 'dumpDiagnostics: async function(');
applyFixes('src/shared/services/errorManager.ts', /\} \/\/ end ErrorManager/g, '};');

// This one might be a bit tricky with regex, we can just export const at the end.
applyFixes('src/shared/services/errorManager.ts', /let lastErr;/g, 'let lastErr: unknown;');

// 2. api.ts
applyFixes('src/shared/services/supabase/api.ts', /Record<string, any>/g, 'Record<string, unknown>');
applyFixes('src/shared/services/supabase/api.ts', /let query: any =/g, 'let query: unknown =');
applyFixes('src/shared/services/supabase/api.ts', /client = \(await resolveSupabaseClient\(\)\) as any/g, 'client = (await resolveSupabaseClient()) as unknown');
applyFixes('src/shared/services/supabase/api.ts', /\(item: any\) =>/g, '(item: unknown) =>');

// 3. AdminDashboard.tsx
applyFixes('src/features/admin/AdminDashboard.tsx', /type="button"\s+onClick=\{\(\) => handleTabChange\(tab\.id\)\}\s+type="button"/g, 'onClick={() => handleTabChange(tab.id)}\n\t\t\t\t\t\t\ttype="button"');
