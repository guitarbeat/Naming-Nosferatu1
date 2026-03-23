import fs from 'fs';

const file = 'src/shared/services/errorManager.ts';
let content = fs.readFileSync(file, 'utf-8');

// I will make the variables explicit any first
content = content.replace(/let lastErr;/g, 'let lastErr: unknown;');

// Then the `ErrorManager` object
content = content.replace(/export class ErrorManager \{/g, 'export const ErrorManager = {');
content = content.replace(/static handleError\(/g, 'handleError(');
content = content.replace(/static logDiagnostic\(/g, 'logDiagnostic(');
content = content.replace(/static captureException\(/g, 'captureException(');
content = content.replace(/static async dumpDiagnostics\(/g, 'async dumpDiagnostics(');

// Add comma to dumpDiagnostics
content = content.replace(/return formatted;\n\t\}/g, 'return formatted;\n\t},');

// Find the block at the end
content = content.replace(/\tstatic parseError = parseError;\n/g, '\tparseError,\n');
content = content.replace(/\tstatic withRetry = withRetry;\n/g, '\twithRetry,\n');
content = content.replace(/\tstatic CircuitBreaker = CircuitBreaker;\n/g, '\tCircuitBreaker,\n');
content = content.replace(/\tstatic createResilientFunction = createResilientFunction;\n/g, '\tcreateResilientFunction,\n');

// fix setupGlobalErrorHandling
content = content.replace(/static setupGlobalErrorHandling/g, 'setupGlobalErrorHandling');
content = content.replace(/\}\s*\}\s*$/g, '}\n};\n');
content = content.replace(/\n\} \/\/ end ErrorManager/g, '\n};\n');

fs.writeFileSync(file, content);
