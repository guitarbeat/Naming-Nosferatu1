/**
 * @module ErrorBoundary
 * @description Error boundary and error display components with detailed error information
 */

import React, { Component, type ReactNode, useState } from "react";
import { cn } from "@/shared/lib/basic";
import { Copy } from "@/shared/lib/icons";
import { ErrorManager } from "@/shared/services/errorManager";
import Button from "../Button";

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: React.ComponentType<ErrorFallbackProps>;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
	context?: string;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorId: string | null;
}

interface ErrorFallbackProps {
	error: Error | null;
	errorId: string | null;
	resetError: () => void;
	context: string;
}

interface DiagnosticItem {
	label: string;
	value: string;
	status: "ok" | "warning" | "error";
}

function collectDiagnostics(error: Error | null): DiagnosticItem[] {
	const diagnostics: DiagnosticItem[] = [];

	// Browser info
	diagnostics.push({
		label: "Browser",
		value: navigator.userAgent.split(" ").slice(-2).join(" "),
		status: "ok",
	});

	// Network status
	diagnostics.push({
		label: "Network",
		value: navigator.onLine ? "Online" : "Offline",
		status: navigator.onLine ? "ok" : "error",
	});

	// Memory (if available)
	const perf = performance as Performance & {
		memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
	};
	if (perf.memory) {
		const usedMB = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
		const limitMB = Math.round(perf.memory.jsHeapSizeLimit / 1024 / 1024);
		const pct = Math.round((usedMB / limitMB) * 100);
		diagnostics.push({
			label: "Memory",
			value: `${usedMB}MB / ${limitMB}MB (${pct}%)`,
			status: pct > 90 ? "error" : pct > 70 ? "warning" : "ok",
		});
	}

	// Error type classification
	if (error) {
		let errorType = "Unknown";
		if (error.name === "TypeError") {
			errorType = "Type Error";
		} else if (error.name === "ReferenceError") {
			errorType = "Reference Error";
		} else if (error.name === "SyntaxError") {
			errorType = "Syntax Error";
		} else if (
			error.message?.includes("fetch") ||
			error.message?.includes("network")
		) {
			errorType = "Network Error";
		} else if (
			error.message?.includes("supabase") ||
			error.message?.includes("database")
		) {
			errorType = "Database Error";
		} else {
			errorType = error.name || "Runtime Error";
		}

		diagnostics.push({
			label: "Error Type",
			value: errorType,
			status: "error",
		});
	}

	// Current route
	diagnostics.push({
		label: "Route",
		value: window.location.pathname,
		status: "ok",
	});

	return diagnostics;
}

function parseStackTrace(
	stack: string,
): { file: string; line: string; func: string }[] {
	const lines = stack.split("\n").slice(1, 6); // Get first 5 stack frames
	return lines.map((line) => {
		const match =
			line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/) ||
			line.match(/at\s+(.+?):(\d+):\d+/) ||
			line.match(/(.+?)@(.+?):(\d+):\d+/);

		if (match) {
			return {
				func: match[1]?.trim() || "anonymous",
				file: match[2]?.split("/").pop() || "unknown",
				line: match[3] || "?",
			};
		}
		return { func: "unknown", file: "unknown", line: "?" };
	});
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
	error,
	errorId,
	resetError,
	context,
}) => {
	const [copySuccess, setCopySuccess] = useState(false);
	const [showFullStack, setShowFullStack] = useState(false);

	const diagnostics = collectDiagnostics(error);
	const parsedStack = error?.stack ? parseStackTrace(error.stack) : [];

	const copyErrorToClipboard = async () => {
		const diagText = diagnostics
			.map((d) => `${d.label}: ${d.value}`)
			.join("\n");
		const errorDetails = `
=== Error Report ===
Generated: ${new Date().toISOString()}
URL: ${window.location.href}

=== Error Info ===
Error ID: ${errorId}
Context: ${context}
Message: ${error?.message || "Unknown error"}

=== Diagnostics ===
${diagText}

=== Stack Trace ===
${error?.stack || "No stack trace available"}
		`.trim();

		try {
			await navigator.clipboard.writeText(errorDetails);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (err) {
			console.error("Failed to copy error details:", err);
		}
	};

	const statusColors = {
		ok: "text-green-400",
		warning: "text-yellow-400",
		error: "text-red-400",
	};

	const statusIcons = {
		ok: "checkmark",
		warning: "warning",
		error: "close",
	};

	return (
		<div className="flex flex-col items-center justify-center p-6 md:p-8 bg-muted/50 backdrop-blur-md rounded-2xl border border-border text-center min-h-[50vh] w-full max-w-3xl mx-auto my-8 shadow-2xl">
			<div className="flex flex-col gap-6 w-full text-foreground items-center">
				{/* Header */}
				<div className="space-y-2">
					<h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-destructive to-accent bg-clip-text text-transparent uppercase tracking-tighter">
						Something went wrong
					</h2>
					<p className="text-muted-foreground">
						Error in{" "}
						<code className="font-mono text-foreground/80 bg-black/20 px-2 py-0.5 rounded">
							{context}
						</code>
					</p>
				</div>

				{/* Error Message Card */}
				<div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-left">
					<div className="flex items-start gap-3">
						<span className="text-red-400 text-xl shrink-0">!</span>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-red-300 break-words">
								{error?.message || "An unexpected error occurred"}
							</p>
							{errorId && (
								<p className="text-xs text-muted-foreground mt-1 font-mono">
									ID: {errorId}
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Quick Diagnostics */}
				<div className="w-full bg-black/30 rounded-lg p-4 text-left">
					<h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
						Quick Diagnostics
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						{diagnostics.map((item) => (
							<div
								key={item.label}
								className="flex items-center gap-2 text-sm bg-black/20 rounded px-3 py-2"
							>
								<span className={`${statusColors[item.status]} text-xs`}>
									{statusIcons[item.status] === "checkmark" && "OK"}
									{statusIcons[item.status] === "warning" && "WARN"}
									{statusIcons[item.status] === "close" && "ERR"}
								</span>
								<span className="text-muted-foreground">{item.label}:</span>
								<span className="text-foreground/80 truncate font-mono text-xs">
									{item.value}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Parsed Stack Trace */}
				{parsedStack.length > 0 && (
					<details className="w-full text-left bg-black/40 rounded-xl border border-white/5 overflow-hidden group">
						<summary className="cursor-pointer flex items-center justify-between text-yellow-500 font-semibold p-4 hover:bg-white/5 transition-colors select-none">
							<span className="flex items-center gap-2">
								<span className="text-sm">Stack Trace</span>
								<span className="text-xs text-muted-foreground font-normal">
									({parsedStack.length} frames)
								</span>
							</span>
							<Button
								onClick={(e) => {
									e.stopPropagation();
									copyErrorToClipboard();
								}}
								variant="ghost"
								presentation="chip"
								shape="pill"
								className="bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
								aria-label="Copy error details"
								type="button"
							>
								<Copy size={12} />
								{copySuccess ? (
									<span className="text-green-400">Copied!</span>
								) : (
									<span>Copy Report</span>
								)}
							</Button>
						</summary>
						<div className="p-4 pt-0 space-y-2">
							{/* Simplified stack view */}
							<div className="space-y-1">
								{parsedStack.map((frame, i) => (
									<div
										key={i}
										className="flex items-center gap-2 text-xs font-mono p-2 bg-black/20 rounded"
									>
										<span className="text-muted-foreground w-4">{i + 1}.</span>
										<span className="text-blue-300 truncate flex-1">
											{frame.func}
										</span>
										<span className="text-muted-foreground">{frame.file}</span>
										<span className="text-yellow-400">:{frame.line}</span>
									</div>
								))}
							</div>

							{/* Toggle for full stack */}
							{error?.stack && (
								<>
									<Button
										onClick={() => setShowFullStack(!showFullStack)}
										variant="ghost"
										presentation="chip"
										className="bg-transparent px-0 text-muted-foreground underline hover:bg-transparent hover:text-foreground"
										type="button"
									>
										{showFullStack ? "Hide" : "Show"} full stack trace
									</Button>
									{showFullStack && (
										<pre className="text-[10px] leading-relaxed text-white/50 overflow-x-auto p-3 bg-black/30 rounded border border-white/5 custom-scrollbar max-h-48">
											{error.stack}
										</pre>
									)}
								</>
							)}
						</div>
					</details>
				)}

				{/* Action Buttons */}
				<div className="flex flex-wrap gap-3 justify-center">
					<Button
						onClick={resetError}
						type="button"
						variant="primary"
						shape="pill"
					>
						Try Again
					</Button>
					<Button
						onClick={() => window.location.reload()}
						type="button"
						variant="secondary"
						shape="pill"
						className="bg-white/10 text-foreground hover:bg-white/20"
					>
						Reload Page
					</Button>
					<Button
						onClick={copyErrorToClipboard}
						type="button"
						variant="ghost"
						shape="pill"
						className="bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
						startIcon={<Copy size={14} />}
					>
						{copySuccess ? "Copied!" : "Copy Report"}
					</Button>
				</div>

				{/* Help text */}
				<p className="text-xs text-muted-foreground">
					Press{" "}
					<kbd className="px-1.5 py-0.5 bg-black/30 rounded text-foreground/60">
						F12
					</kbd>{" "}
					to open DevTools for more details
				</p>
			</div>
		</div>
	);
};

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null, errorId: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error, errorId: null };
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		const { onError, context = "React Component" } = this.props;

		const formattedError = ErrorManager.handleError(error, context, {
			componentStack: errorInfo.componentStack,
			isCritical: true,
		});

		this.setState({ errorId: formattedError.id });
		onError?.(error, errorInfo);
	}

	resetError = () => {
		this.setState({ hasError: false, error: null, errorId: null });
	};

	override render() {
		if (this.state.hasError) {
			const FallbackComponent = this.props.fallback || DefaultErrorFallback;
			return (
				<FallbackComponent
					error={this.state.error}
					errorId={this.state.errorId}
					resetError={this.resetError}
					context={this.props.context || "Application"}
				/>
			);
		}

		return this.props.children;
	}
}

interface AppError {
	message?: string;
	severity?: string;
	isRetryable?: boolean;
	timestamp?: number | string;
	details?: string;
	suggestion?: string;
	errorType?: string;
	attempts?: number;
	originalError?: unknown;
	stack?: string;
	context?: string;
	[key: string]: unknown;
}

interface ErrorProps {
	variant?: "boundary" | "list" | "inline";
	error?: AppError | string | unknown;
	onRetry?: (...args: unknown[]) => void;
	onDismiss?: (...args: unknown[]) => void;
	onClearAll?: () => void;
	context?: string;
	position?: "above" | "below" | "inline";
	showDetails?: boolean;
	showRetry?: boolean;
	showDismiss?: boolean;
	size?: "small" | "medium" | "large";
	className?: string;
	children?: React.ReactNode;
}

interface ErrorListProps {
	errors?: (AppError | string | unknown)[];
	onRetry?: (error: unknown, index: number) => void;
	onDismiss?: (index: number) => void;
	onClearAll?: () => void;
	showDetails?: boolean;
	className?: string;
}

const ErrorList: React.FC<ErrorListProps> = ({
	errors = [],
	onRetry: _onRetry,
	onDismiss,
	onClearAll,
	showDetails: _showDetails,
	className,
}) => {
	if (!errors.length) {
		return null;
	}
	return (
		<div className={cn("flex flex-col gap-2 w-full", className)}>
			{onClearAll && (
				<Button
					onClick={onClearAll}
					type="button"
					variant="ghost"
					presentation="chip"
					shape="pill"
					className="self-end bg-transparent text-red-300 hover:bg-red-500/12 hover:text-red-100"
				>
					Clear All
				</Button>
			)}
			<div className="flex flex-col gap-2">
				{errors.map((err, i) => (
					<div
						key={i}
						className="relative flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm animate-in fade-in slide-in-from-top-1 shadow-sm backdrop-blur-sm"
					>
						<div className="flex-1 break-words font-medium">
							{err instanceof Error ? err.message : String(err)}
						</div>
						{onDismiss && (
							<Button
								onClick={() => onDismiss(i)}
								type="button"
								variant="ghost"
								size="icon"
								iconOnly={true}
								shape="pill"
								className="ml-3 size-7 bg-transparent text-red-400 hover:bg-red-500/20 hover:text-red-100"
								aria-label="Dismiss error"
							>
								×
							</Button>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

interface ErrorInlineProps {
	error: AppError | string | unknown;
	context?: string;
	className?: string;
}

const ErrorInline: React.FC<ErrorInlineProps> = ({
	error,
	context: _context = "general",
	className = "",
}) => {
	if (!error) {
		return null;
	}
	const msg =
		typeof error === "string" ? error : (error as AppError).message || "Error";
	return (
		<div
			className={cn(
				"flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-100 text-sm shadow-sm backdrop-blur-sm",
				className,
			)}
			role="alert"
		>
			<span className="text-lg leading-none select-none">⚠️</span>
			<span className="font-medium pt-0.5 leading-tight">{msg}</span>
		</div>
	);
};

export const ErrorComponent: React.FC<ErrorProps> = ({
	variant = "inline",
	error,
	onRetry,
	onDismiss,
	onClearAll,
	context,
	className = "",
	children,
}) => {
	if (variant === "boundary") {
		return (
			<ErrorBoundary
				context={context || "Component Boundary"}
				onError={(err) => {
					if (onRetry) {
						onRetry(err);
					}
				}}
			>
				{children}
			</ErrorBoundary>
		);
	}
	if (variant === "list") {
		const arr = Array.isArray(error) ? error : [error];
		return (
			<ErrorList
				errors={arr}
				onRetry={onRetry as (e: unknown, i: number) => void}
				onDismiss={onDismiss as (i: number) => void}
				onClearAll={onClearAll}
				className={className}
			/>
		);
	}
	return <ErrorInline error={error} context={context} className={className} />;
};

ErrorComponent.displayName = "ErrorComponent";
