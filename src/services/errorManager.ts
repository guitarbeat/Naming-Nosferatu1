/**
 * @module ErrorManager
 * @description Comprehensive error handling service for the application.
 */

import {
	CircuitBreaker,
	createResilientFunction,
	getGlobalScope,
	handleManagedError,
	parseError,
	withRetry,
} from "@/services/errorManagerCore";

export { CircuitBreaker, createResilientFunction, parseError, withRetry };

export class ErrorManager {
	static handleError(
		error: unknown,
		context: string = "Unknown",
		metadata: Record<string, unknown> = {},
	) {
		return handleManagedError(error, context, metadata);
	}

	static parseError = parseError;
	static withRetry = withRetry;
	static CircuitBreaker = CircuitBreaker;
	static createResilientFunction = createResilientFunction;

	static setupGlobalErrorHandling(): () => void {
		const globalScope = getGlobalScope() as typeof globalThis;
		if (!globalScope.addEventListener) {
			return () => {
				// addEventListener is unavailable in this environment
			};
		}

		const handler = (event: ErrorEvent | PromiseRejectionEvent) => {
			const error = "reason" in event ? event.reason : event.error;
			ErrorManager.handleError(error, "Global", { isCritical: true });
		};

		globalScope.addEventListener("unhandledrejection", handler);
		globalScope.addEventListener("error", handler);

		return () => {
			globalScope.removeEventListener("unhandledrejection", handler);
			globalScope.removeEventListener("error", handler);
		};
	}
}
