/**
 * @module ErrorManager
 * @description Comprehensive error handling service for the application.
 * Consolidates error handling, logging, retry logic, and circuit breaker patterns.
 */

// ============================================================================
// Internal Helpers & Scope
// ============================================================================

type GlobalScope = typeof globalThis | typeof window | Record<string, unknown>;

const GLOBAL_SCOPE: GlobalScope =
	typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};

/**
 * * Get the global scope object
 */
function getGlobalScope(): GlobalScope {
	return GLOBAL_SCOPE;
}

/**
 * * Deep freeze an object to prevent mutations
 */
function deepFreeze<T>(object: T): Readonly<T> {
	if (object && typeof object === "object" && !Object.isFrozen(object)) {
		Object.values(object as Record<string, unknown>).forEach((value) => {
			if (typeof value === "object" && value !== null) {
				deepFreeze(value);
			}
		});
		Object.freeze(object);
	}
	return object as Readonly<T>;
}

/**
 * * Create a hash from a value
 */
function createHash(value: unknown): string {
	const stringValue = typeof value === "string" ? value : JSON.stringify(value);
	let hash = 0;
	if (!stringValue) {
		return "hash_0";
	}
	for (let index = 0; index < stringValue.length; index += 1) {
		hash = (hash << 5) - hash + stringValue.charCodeAt(index);
		hash |= 0;
	}
	return `hash_${Math.abs(hash)}`;
}

// ============================================================================
// Constants
// ============================================================================

// Constants use UPPER_CASE keys (intentional for error type constants)
const ERROR_TYPES = {
	NETWORK: "network",
	VALIDATION: "validation",
	AUTH: "auth",
	DATABASE: "database",
	RUNTIME: "runtime",
	UNKNOWN: "unknown",
};

// Constants use UPPER_CASE keys (intentional for severity constants)
const ERROR_SEVERITY = {
	LOW: "low",
	MEDIUM: "medium",
	HIGH: "high",
	CRITICAL: "critical",
};

const USER_FRIENDLY_MESSAGES = {
	[ERROR_TYPES.NETWORK]: {
		[ERROR_SEVERITY.LOW]: "Connection is slow. Please try again.",
		[ERROR_SEVERITY.MEDIUM]: "Having trouble connecting. Check your internet and try again.",
		[ERROR_SEVERITY.HIGH]: "Can't connect right now. Please try again in a moment.",
		[ERROR_SEVERITY.CRITICAL]: "Service is temporarily unavailable. Please try again later.",
	},
	[ERROR_TYPES.AUTH]: {
		[ERROR_SEVERITY.LOW]: "Please log in again to continue.",
		[ERROR_SEVERITY.MEDIUM]: "Your session expired. Please log in again.",
		[ERROR_SEVERITY.HIGH]: "Sign-in failed. Please check your credentials and try again.",
		[ERROR_SEVERITY.CRITICAL]:
			"Unable to access your account. Please contact support if this continues.",
	},
	[ERROR_TYPES.DATABASE]: {
		[ERROR_SEVERITY.LOW]: "Data is loading slowly. Please wait a moment.",
		[ERROR_SEVERITY.MEDIUM]: "Having trouble loading data. Please refresh the page.",
		[ERROR_SEVERITY.HIGH]: "Unable to load data right now. Please try again later.",
		[ERROR_SEVERITY.CRITICAL]: "Data service is temporarily unavailable. Please try again later.",
	},
	[ERROR_TYPES.VALIDATION]: {
		[ERROR_SEVERITY.LOW]: "Please check your input and try again.",
		[ERROR_SEVERITY.MEDIUM]: "There's an issue with your input. Please review and try again.",
		[ERROR_SEVERITY.HIGH]: "Invalid information entered. Please check your data and try again.",
		[ERROR_SEVERITY.CRITICAL]:
			"Unable to process your request. Please contact support if this continues.",
	},
	[ERROR_TYPES.RUNTIME]: {
		[ERROR_SEVERITY.LOW]: "Something went wrong. Please try again.",
		[ERROR_SEVERITY.MEDIUM]: "An error occurred. Please refresh the page and try again.",
		[ERROR_SEVERITY.HIGH]: "Something went wrong. Please try again in a moment.",
		[ERROR_SEVERITY.CRITICAL]:
			"We're experiencing technical difficulties. Please try again later or contact support.",
	},
	[ERROR_TYPES.UNKNOWN]: {
		[ERROR_SEVERITY.LOW]: "Something unexpected happened. Please try again.",
		[ERROR_SEVERITY.MEDIUM]: "An unexpected error occurred. Please try again.",
		[ERROR_SEVERITY.HIGH]: "Something went wrong. Please try again later.",
		[ERROR_SEVERITY.CRITICAL]:
			"We encountered an unexpected issue. Please try again later or contact support.",
	},
};

const RETRY_CONFIG = {
	maxAttempts: 3,
	baseDelay: 1000,
	maxDelay: 10000,
	backoffMultiplier: 2,
	jitter: 0.1,
};

deepFreeze(ERROR_TYPES);
deepFreeze(ERROR_SEVERITY);
deepFreeze(USER_FRIENDLY_MESSAGES);
deepFreeze(RETRY_CONFIG);

// ============================================================================
// Core Utility Logic (Internal)
// ============================================================================

interface ParsedError {
	message: string;
	name: string;
	stack: string | null;
	type: string;
	cause?: unknown;
	code?: string | null;
	status?: number | null;
}

interface FormattedError {
	id: string;
	message: string;
	userMessage: string;
	context: string;
	type: string;
	severity: string;
	isRetryable: boolean;
	timestamp: string;
	metadata: Record<string, unknown>;
	diagnostics: Record<string, unknown>;
	aiContext: string;
	stack?: string | null;
}

function generateErrorId() {
	const scope = GLOBAL_SCOPE as typeof globalThis;
	if (scope.crypto?.randomUUID) {
		return `error_${scope.crypto.randomUUID()}`;
	}
	return `error_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function determineErrorType(error: unknown): string {
	const err = error as Record<string, unknown>;
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		return ERROR_TYPES.NETWORK;
	}
	if (err.code === "PGRST301" || err.code === "PGRST302") {
		return ERROR_TYPES.AUTH;
	}
	if (err.code === "PGRST116" || err.code === "PGRST117") {
		return ERROR_TYPES.VALIDATION;
	}
	if (
		err.code === "NETWORK_ERROR" ||
		err.name === "NetworkError" ||
		(err.name === "TypeError" && (err.message as string)?.includes("fetch"))
	) {
		return ERROR_TYPES.NETWORK;
	}
	if (
		err.name === "TimeoutError" ||
		(err.name === "AbortError" && (err.message as string)?.includes("timeout"))
	) {
		return ERROR_TYPES.NETWORK;
	}
	if (err.status === 0 || err.status === 500) {
		return ERROR_TYPES.NETWORK;
	}
	if (
		(err.message as string)?.includes("database") ||
		(err.message as string)?.includes("supabase")
	) {
		return ERROR_TYPES.DATABASE;
	}
	if (err.name === "TypeError" || err.name === "ReferenceError") {
		return ERROR_TYPES.RUNTIME;
	}
	if (err.code === "VALIDATION_ERROR" || (err.message as string)?.includes("validation")) {
		return ERROR_TYPES.VALIDATION;
	}
	return ERROR_TYPES.UNKNOWN;
}

function parseError(error: unknown): ParsedError {
	if (error instanceof Error) {
		return {
			message: error.message || "An error occurred",
			name: error.name,
			stack: error.stack || null,
			type: determineErrorType(error),
			cause: (error as unknown as { cause: unknown }).cause || null,
		};
	}
	if (typeof error === "string") {
		return {
			message: error || "An error occurred",
			name: "StringError",
			stack: null,
			type: ERROR_TYPES.UNKNOWN,
		};
	}
	if (error && typeof error === "object") {
		const o = error as Record<string, unknown>;
		const message =
			(o.message as string) ||
			(o.error as string) ||
			(o.detail as string) ||
			(o.error_description as string) ||
			(o.hint as string) ||
			"An unexpected error occurred";
		return {
			message,
			name: (o.name as string) || "ObjectError",
			stack: (o.stack as string) || null,
			type: determineErrorType(error),
			code: (o.code as string) || null,
			status: (o.status as number) || null,
			cause: o.cause || null,
		};
	}
	// Handle null, undefined, and other non-object types
	return {
		message: "An unexpected error occurred. Please try again.",
		name: "UnknownError",
		stack: null,
		type: ERROR_TYPES.UNKNOWN,
	};
}

function determineSeverity(errorInfo: ParsedError, metadata: Record<string, unknown>): string {
	if (metadata.isCritical) {
		return ERROR_SEVERITY.CRITICAL;
	}
	if (metadata.affectsUserData) {
		return ERROR_SEVERITY.HIGH;
	}
	switch (errorInfo.type) {
		case ERROR_TYPES.AUTH:
			return ERROR_SEVERITY.HIGH;
		case ERROR_TYPES.DATABASE:
		case ERROR_TYPES.NETWORK:
		case ERROR_TYPES.RUNTIME:
			return ERROR_SEVERITY.MEDIUM;
		case ERROR_TYPES.VALIDATION:
			return ERROR_SEVERITY.LOW;
		default:
			return ERROR_SEVERITY.MEDIUM;
	}
}

/**
 * * Get the CSS class for a given error severity
 */

function getUserFriendlyMessage(errorInfo: ParsedError, context: string): string {
	const contextMap: Record<string, string> = {
		"Tournament Completion": "Unable to complete tournament",
		"Tournament Setup": "Unable to set up tournament",
		"Rating Update": "Unable to update ratings",
		Login: "Unable to log in",
		"Profile Load": "Unable to load profile",
		"Save Rankings": "Unable to save rankings",
		vote: "Unable to submit vote",
	};
	const contextMessage = contextMap[context] || "An error occurred";
	const severity = determineSeverity(errorInfo, {});
	const messages = USER_FRIENDLY_MESSAGES as Record<string, Record<string, string>>;
	if (
		errorInfo.type === ERROR_TYPES.NETWORK &&
		typeof navigator !== "undefined" &&
		!navigator.onLine
	) {
		return "You're currently offline. Please check your internet connection and try again.";
	}
	return messages[errorInfo.type]?.[severity] || `${contextMessage}. Please try again.`;
}

function isRetryable(errorInfo: ParsedError, metadata: Record<string, unknown>): boolean {
	if (metadata.isRetryable === false) {
		return false;
	}
	if (metadata.isRetryable === true) {
		return true;
	}
	if (errorInfo.type === ERROR_TYPES.NETWORK || errorInfo.type === ERROR_TYPES.DATABASE) {
		return true;
	}
	return false;
}

// ============================================================================
// Tracking & Diagnostics (Internal)
// ============================================================================

function collectEnvironmentSnapshot() {
	const g = getGlobalScope();
	try {
		const { navigator = {}, location = {} } = g as typeof globalThis;
		return {
			userAgent: (navigator as Navigator).userAgent,
			language: (navigator as Navigator).language,
			online: (navigator as Navigator).onLine,
			platform: (navigator as Navigator).platform,
			location: (location as Location).href,
		};
	} catch {
		return {};
	}
}

interface DebugHint {
	title: string;
	detail: string;
}

function deriveDebugHints(
	errorInfo: ParsedError,
	_context: string,
	_metadata: Record<string, unknown>,
	environment: Record<string, unknown>,
): DebugHint[] {
	const hints: DebugHint[] = [];
	if (errorInfo.cause) {
		hints.push({
			title: "Root cause provided",
			detail: String(errorInfo.cause),
		});
	}
	if (errorInfo.type === ERROR_TYPES.NETWORK) {
		hints.push({
			title: "Connectivity check",
			detail: environment.online === false ? "Offline" : "Check server",
		});
	}
	return hints;
}

function buildDiagnostics(
	errorInfo: ParsedError,
	context: string,
	metadata: Record<string, unknown>,
): Record<string, unknown> {
	const environment = collectEnvironmentSnapshot();
	const debugHints = deriveDebugHints(errorInfo, context, metadata, environment);
	return {
		fingerprint: createHash({
			type: errorInfo.type,
			message: errorInfo.message,
			context,
		}),
		environment,
		debugHints,
	};
}

function buildAIContext(f: FormattedError, d: { fingerprint: string }): string {
	return `ID: ${f.id}\nType: ${f.type}\nSeverity: ${f.severity}\nContext: ${f.context}\nMessage: ${f.message}\nFingerprint: ${d.fingerprint}`;
}

interface ErrorServiceLogData {
	error: FormattedError;
	context: string;
	metadata: Record<string, unknown>;
}

function sendToErrorService(logData: ErrorServiceLogData): void {
	const g = getGlobalScope() as typeof globalThis & {
		Sentry?: { captureException?: (error: Error, options?: unknown) => void };
	};
	const sentry = g.Sentry;
	if (sentry?.captureException) {
		const e = new Error(logData.error.message);
		e.name = logData.context;
		sentry.captureException(e, {
			tags: { context: logData.context },
			extra: logData.metadata,
		});
	}
}

function logError(
	formattedError: FormattedError,
	context: string,
	metadata: Record<string, unknown>,
) {
	if (process.env.NODE_ENV === "development") {
		console.group(`🔴 Error [${formattedError.type}]`);
		console.error("Context:", context, "Message:", formattedError.userMessage);
		console.groupEnd();
	} else {
		sendToErrorService({ error: formattedError, context, metadata });
	}
}

function formatError(
	errorInfo: ParsedError,
	context: string,
	metadata: Record<string, unknown>,
): FormattedError {
	const severity = determineSeverity(errorInfo, metadata);
	const userMessage = getUserFriendlyMessage(errorInfo, context);
	const diagnostics = buildDiagnostics(errorInfo, context, metadata);
	const formatted: FormattedError = {
		id: generateErrorId(),
		message: errorInfo.message,
		userMessage,
		context,
		type: errorInfo.type,
		severity,
		isRetryable: isRetryable(errorInfo, metadata),
		timestamp: new Date().toISOString(),
		metadata: { ...metadata, stack: errorInfo.stack },
		diagnostics,
		aiContext: "",
		stack: errorInfo.stack,
	};
	formatted.aiContext = buildAIContext(formatted, diagnostics as { fingerprint: string });
	return formatted;
}

// ============================================================================
// Retry & Circuit Breaker
// ============================================================================

class CircuitBreaker {
	failureThreshold: number;
	resetTimeout: number;
	failureCount: number = 0;
	lastFailureTime: number | null = null;
	state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
	constructor(threshold = 5, timeout = 60000) {
		this.failureThreshold = threshold;
		this.resetTimeout = timeout;
	}
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (this.state === "OPEN" && Date.now() - (this.lastFailureTime || 0) >= this.resetTimeout) {
			this.state = "HALF_OPEN";
		}
		if (this.state === "OPEN") {
			throw new Error("Circuit breaker is OPEN");
		}
		try {
			const r = await fn();
			this.failureCount = 0;
			this.state = "CLOSED";
			return r;
		} catch (e) {
			this.failureCount++;
			this.lastFailureTime = Date.now();
			if (this.failureCount >= this.failureThreshold) {
				this.state = "OPEN";
			}
			throw e;
		}
	}
}

function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
	operation: T,
	options: Record<string, unknown> = {},
): T {
	const { maxAttempts = 3, baseDelay = 1000 } = options as {
		maxAttempts?: number;
		baseDelay?: number;
	};
	return (async (...args: unknown[]) => {
		let lastErr;
		for (let a = 1; a <= maxAttempts; a++) {
			try {
				return await operation(...args);
			} catch (e) {
				lastErr = e;
				if (a === maxAttempts || !isRetryable(parseError(e), {})) {
					throw e;
				}
				await new Promise((r) => setTimeout(r, baseDelay * 2 ** (a - 1)));
			}
		}
		throw lastErr;
	}) as T;
}

function createResilientFunction<T extends (...args: unknown[]) => Promise<unknown>>(
	fn: T,
	options: {
		threshold?: number;
		timeout?: number;
		maxAttempts?: number;
		baseDelay?: number;
	} = {},
): T {
	const cb = new CircuitBreaker(options.threshold, options.timeout);
	const retried = withRetry(fn, options);
	return (async (...args: unknown[]) => cb.execute(() => retried(...args))) as T;
}

// ============================================================================
// ErrorManager Class
// ============================================================================

export class ErrorManager {
	static handleError(
		error: unknown,
		context: string = "Unknown",
		metadata: Record<string, unknown> = {},
	): FormattedError {
		const info = parseError(error);
		const formatted = formatError(info, context, metadata);
		logError(formatted, context, metadata);
		return formatted;
	}
	static parseError = parseError;
	static withRetry = withRetry;
	static CircuitBreaker = CircuitBreaker;
	static createResilientFunction = createResilientFunction;

	static setupGlobalErrorHandling(): () => void {
		const g = getGlobalScope() as typeof globalThis;
		if (!g.addEventListener) {
			return () => {
				// Intentional no-op: addEventListener not available
			};
		}
		const h = (e: ErrorEvent | PromiseRejectionEvent) => {
			const error = "reason" in e ? e.reason : e.error;
			ErrorManager.handleError(error, "Global", {
				isCritical: true,
			});
		};
		g.addEventListener("unhandledrejection", h);
		g.addEventListener("error", h);
		return () => {
			g.removeEventListener("unhandledrejection", h);
			g.removeEventListener("error", h);
		};
	}
}
