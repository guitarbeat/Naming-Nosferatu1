import fs from 'fs';

const file = 'src/shared/services/errorManager.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(/export class ErrorManager \{/g, 'export const ErrorManager = {');
content = content.replace(/static handleError\(/g, 'handleError: function(');
content = content.replace(/static logDiagnostic\(/g, 'logDiagnostic: function(');
content = content.replace(/static captureException\(/g, 'captureException: function(');
content = content.replace(/static async dumpDiagnostics\(/g, 'dumpDiagnostics: async function(');

// Remove the static properties at the end.
content = content.replace(/static parseError = parseError;\n\tstatic withRetry = withRetry;\n\tstatic CircuitBreaker = CircuitBreaker;\n\tstatic createResilientFunction = createResilientFunction;\n/g, '');

content = content.replace(/static setupGlobalErrorHandling\(\): \(\) => void \{/g, 'setupGlobalErrorHandling: function(): () => void {');
content = content.replace(/\} \/\/ end ErrorManager/g, '};');

content = content.replace(/let lastErr;/g, 'let lastErr: unknown;');

fs.writeFileSync(file, content);
