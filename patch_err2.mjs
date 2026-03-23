import fs from 'fs';

const file = 'src/shared/services/errorManager.ts';
let content = fs.readFileSync(file, 'utf-8');

// Fix 1: The implicit any in withRetry
content = content.replace(/let lastErr;/g, 'let lastErr: unknown;');

// Fix 2: Change static class to object
content = content.replace(/export class ErrorManager \{/g, 'export const ErrorManager = {');
content = content.replace(/static handleError\(/g, 'handleError(');
content = content.replace(/static logDiagnostic\(/g, 'logDiagnostic(');
content = content.replace(/static captureException\(/g, 'captureException(');
content = content.replace(/static async dumpDiagnostics\(/g, 'async dumpDiagnostics(');

// Now for the end of the file. It looks like:
/*
	static parseError = parseError;
	static withRetry = withRetry;
	static CircuitBreaker = CircuitBreaker;
	static createResilientFunction = createResilientFunction;

	static setupGlobalErrorHandling(): () => void {
        ...
	}
}
*/
content = content.replace(/static parseError = parseError;/g, 'parseError,');
content = content.replace(/static withRetry = withRetry;/g, 'withRetry,');
content = content.replace(/static CircuitBreaker = CircuitBreaker;/g, 'CircuitBreaker,');
content = content.replace(/static createResilientFunction = createResilientFunction;/g, 'createResilientFunction,');
content = content.replace(/static setupGlobalErrorHandling/g, 'setupGlobalErrorHandling');
content = content.replace(/\}\s*$/g, '};');


fs.writeFileSync(file, content);
