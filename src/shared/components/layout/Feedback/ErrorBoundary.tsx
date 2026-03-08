/**
 * @module ErrorBoundary
 * @description Error boundary and error display components with detailed error information
 */

import React, { Component, type ReactNode, useState } from "react";
import { ErrorManager } from "@/services/errorManager";
import { cn } from "@/shared/lib/basic";
import { Copy } from "@/shared/lib/icons";

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

export interface ErrorFallbackProps {
	error: Error | null;
	errorId: string | null;
	resetError: () => void;
	context: string;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
	error,
	errorId,
	resetError,
	context,
}) => {
	const [copySuccess, setCopySuccess] = useState(false);

	const copyErrorToClipboard = async () => {
		const errorDetails = `
Error ID: ${errorId}
Context: ${context}
Message: ${error?.message || "Unknown error"}
Stack: ${error?.stack || "No stack trace available"}
Timestamp: ${new Date().toISOString()}
		`.trim();

		try {
			await navigator.clipboard.writeText(errorDetails);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (err) {
			console.error("Failed to copy error details:", err);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center p-8 bg-neutral-900/50 backdrop-blur-md rounded-2xl border border-white/10 text-center min-h-[50vh] w-full max-w-2xl mx-auto my-8 shadow-2xl">
			<div className="flex flex-col gap-6 w-full text-white items-center">
				<div className="space-y-2">
					<h2 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-pink-600 bg-clip-text text-transparent uppercase tracking-tighter">
						The names demand another comparison
					</h2>
					<p className="text-white/60">
						We encountered an unexpected error in{" "}
						<span className="font-mono text-white/80">{context}</span>.
					</p>
				</div>

				<details className="mt-2 text-left bg-black/40 p-4 rounded-xl text-xs font-mono w-full border border-white/5 overflow-hidden group">
					<summary className="cursor-pointer flex items-center justify-between text-yellow-500 font-bold p-2 hover:bg-white/5 rounded-lg transition-colors select-none">
						<span>Error Details</span>
						<button
							onClick={(e) => {
								e.stopPropagation();
								copyErrorToClipboard();
							}}
							className="flex items-center gap-1.5 text-white/40 hover:text-white px-2 py-1 rounded transition-colors group-open:text-white/60"
							aria-label="Copy error details"
							type="button"
						>
							<Copy size={14} />
							{copySuccess && (
								<span className="text-green-400 font-bold ml-1 animate-in fade-in zoom-in">
									Copied!
								</span>
							)}
						</button>
					</summary>
					<div className="mt-4 space-y-3 pt-2 border-t border-white/5">
						<p className="flex gap-2 text-white/70">
							<strong className="text-white/40 min-w-[60px]">ID:</strong>
							<span className="font-mono text-blue-300">{errorId}</span>
						</p>
						<p className="flex gap-2 text-white/70">
							<strong className="text-white/40 min-w-[60px]">Message:</strong>
							<span className="text-red-300">{error?.message}</span>
						</p>
						{error?.stack && (
							<div className="flex flex-col gap-1 text-white/70">
								<strong className="text-white/40">Stack Trace:</strong>
								<pre className="text-[10px] leading-relaxed text-white/50 overflow-x-auto p-2 bg-black/20 rounded border border-white/5 custom-scrollbar">
									{error.stack}
								</pre>
							</div>
						)}
					</div>
				</details>

				<button
					onClick={resetError}
					className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-purple-500/25 active:scale-95 transition-all duration-200"
				>
					Try Again
				</button>
			</div>
		</div>
	);
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

export interface AppError {
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

export interface ErrorProps {
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
				<button
					onClick={onClearAll}
					className="self-end text-xs font-medium text-red-300 hover:text-red-100 hover:scale-105 transition-all outline-none focus:ring-2 focus:ring-red-500/50 rounded px-1"
				>
					Clear All
				</button>
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
							<button
								onClick={() => onDismiss(i)}
								className="ml-3 p-1 text-red-400 hover:text-red-100 rounded-full hover:bg-red-500/20 transition-colors"
								aria-label="Dismiss error"
								type="button"
							>
								×
							</button>
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
	const msg = typeof error === "string" ? error : (error as AppError).message || "Error";
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
