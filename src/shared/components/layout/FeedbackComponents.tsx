/**
 * @module FeedbackComponents
 * @description Consolidated feedback and status components: loading indicators, toast notifications, and error handling.
 * Combines: StatusIndicators, Toast, and Error modules.
 */

import { Skeleton, Spinner } from "@heroui/react";
import { cva } from "class-variance-authority";
import { motion } from "framer-motion";
import React, {
	Component,
	memo,
	type ReactNode,
	Suspense,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import { ErrorManager } from "@/services/errorManager";
import { useBrowserState } from "@/shared/hooks";
import { cn } from "@/shared/lib/basic";
import { Cat, Copy, Heart, PawPrint } from "@/shared/lib/icons";
import { GLASS_PRESETS } from "./GlassPresets";
import { BongoCat, LiquidGlass } from "./LayoutEffects";

/* ==========================================================================
   LOADING COMPONENTS
   ========================================================================== */

const LOADING_ASSETS = ["/assets/images/cat.gif"];

const getRandomLoadingAsset = () => {
	return LOADING_ASSETS[Math.floor(Math.random() * LOADING_ASSETS.length)];
};

type CatVariant = "paw" | "tail" | "bounce" | "spin" | "heartbeat" | "orbit";
type CatColor = "neon" | "pastel" | "warm";
type CardSkeletonVariant = "name-card" | "elevated-card" | "mosaic-card";

interface LoadingProps {
	// Consolidated interface (Requirements 3.1, 3.2, 3.4)
	variant?:
		| "inline"
		| "fullscreen"
		| "spinner"
		| "cat"
		| "bongo"
		| "suspense"
		| "skeleton"
		| "card-skeleton";
	size?: "sm" | "md" | "lg" | "small" | "medium" | "large"; // Support both naming conventions
	message?: string;

	// Legacy/extended props for backward compatibility
	catVariant?: CatVariant;
	catColor?: CatColor;
	showCatFace?: boolean;
	cardSkeletonVariant?: CardSkeletonVariant;
	text?: string; // Deprecated: use message instead
	overlay?: boolean; // Deprecated: use variant="fullscreen" instead
	className?: string;
	children?: React.ReactNode;
	width?: string | number;
	height?: string | number;
}

const CatSpinnerContent: React.FC<{
	catVariant: CatVariant;
	showFace: boolean;
	size?: "small" | "medium" | "large";
}> = memo(({ catVariant, showFace, size = "medium" }) => {
	const iconSize = size === "large" ? 48 : size === "medium" ? 32 : 24;

	switch (catVariant) {
		case "paw":
			return (
				<motion.div
					animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
					transition={{ duration: 1.5, repeat: Infinity }}
					className="text-pink-500"
				>
					<PawPrint size={iconSize} />
				</motion.div>
			);

		case "tail":
		case "bounce":
			return (
				<motion.div
					animate={{ y: [0, -10, 0] }}
					transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
					className="text-purple-500"
				>
					<Cat size={iconSize} />
				</motion.div>
			);

		case "spin":
			return (
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
					className="text-cyan-500"
				>
					<Cat size={iconSize} />
				</motion.div>
			);

		case "heartbeat":
			return (
				<div className="relative flex items-center justify-center">
					<motion.div
						animate={{ scale: [1, 1.3, 1] }}
						transition={{ duration: 0.8, repeat: Infinity }}
						className="text-red-500 absolute"
					>
						<Heart size={iconSize} fill="currentColor" />
					</motion.div>
					{showFace && (
						<Cat size={iconSize * 0.6} className="relative z-10 text-white drop-shadow-md" />
					)}
				</div>
			);

		case "orbit":
			return (
				<div className="relative flex items-center justify-center w-12 h-12">
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
						className="absolute w-full h-full"
					>
						<div className="absolute top-0 left-1/2 -translate-x-1/2 text-yellow-500">
							<Cat size={16} />
						</div>
					</motion.div>
					{showFace && <div className="text-xl">🐱</div>}
				</div>
			);

		default:
			return (
				<Spinner
					color="secondary"
					size={size === "small" ? "sm" : size === "large" ? "lg" : "md"}
				/>
			);
	}
});

CatSpinnerContent.displayName = "CatSpinnerContent";

export const Loading: React.FC<LoadingProps> = memo(
	({
		variant = "inline",
		catVariant = "paw",
		showCatFace = true,
		text,
		message,
		overlay = false,
		className = "",
		children,
		width = "100%",
		height = 20,
		size = "md",
		cardSkeletonVariant = "name-card",
	}) => {
		const randomAsset = useMemo(() => getRandomLoadingAsset(), []);
		const isVideo = (randomAsset || "").endsWith(".webm");

		// Normalize size prop to support both conventions
		const normalizedSize =
			size === "sm" || size === "small"
				? "small"
				: size === "lg" || size === "large"
					? "large"
					: "medium";

		// Support both message and text props (message takes precedence)
		const displayMessage = message || text;

		// Determine if fullscreen mode (support both variant and overlay prop)
		const isFullscreen = variant === "fullscreen" || overlay;

		const containerClasses = cn(
			"flex flex-col items-center justify-center gap-3 p-4",
			isFullscreen && "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
			className,
		);

		// Handle legacy variant names
		const effectiveVariant =
			variant === "inline" ? "spinner" : variant === "fullscreen" ? "spinner" : variant;

		if (effectiveVariant === "suspense") {
			if (!children) {
				return null;
			}

			const fallback = (
				<div className={containerClasses}>
					{isVideo ? (
						<video
							src={randomAsset}
							className="w-24 h-24 object-contain rounded-full bg-white/5 p-2"
							autoPlay={true}
							muted={true}
							loop={true}
						/>
					) : (
						<img src={randomAsset} alt="Loading..." className="w-24 h-24 object-contain" />
					)}
					{displayMessage && (
						<p className="text-sm font-medium text-white/70 animate-pulse">{displayMessage}</p>
					)}
					<span className="sr-only">Loading...</span>
				</div>
			);

			return <Suspense fallback={fallback}>{children}</Suspense>;
		}

		if (effectiveVariant === "skeleton") {
			return (
				<Skeleton
					className={cn("rounded-lg bg-white/5", className)}
					style={{
						width,
						height: typeof height === "number" ? `${height}px` : height,
					}}
				/>
			);
		}

		if (effectiveVariant === "card-skeleton") {
			return (
				<div
					className={cn(
						"rounded-xl overflow-hidden border border-white/5 bg-white/5 backdrop-blur-sm flex flex-col p-4 gap-3",
						cardSkeletonVariant === "elevated-card" && "shadow-lg",
						className,
					)}
					style={{
						width,
						height: typeof height === "number" ? `${height}px` : height,
						minHeight:
							typeof height === "number"
								? `${height}px`
								: cardSkeletonVariant === "name-card"
									? "200px"
									: "auto",
					}}
				>
					<div className="flex items-center gap-3">
						<Skeleton className="rounded-full w-10 h-10" />
						<div className="flex flex-col gap-2 flex-1">
							<Skeleton className="h-4 w-3/4 rounded-lg" />
							<Skeleton className="h-3 w-1/2 rounded-lg" />
						</div>
					</div>
					<Skeleton className="flex-1 rounded-lg w-full min-h-[100px]" />
					<div className="flex justify-end pt-2">
						<Skeleton className="h-8 w-20 rounded-lg" />
					</div>
					{displayMessage && (
						<div className="text-center text-xs text-white/50 pt-2">{displayMessage}</div>
					)}
				</div>
			);
		}

		if (effectiveVariant === "bongo") {
			return (
				<div className={containerClasses}>
					<BongoCat size={normalizedSize} text={displayMessage} />
				</div>
			);
		}

		if (effectiveVariant === "cat") {
			return (
				<div className={containerClasses} role="status" aria-label="Loading">
					<div className="relative flex items-center justify-center p-4 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
						<CatSpinnerContent
							catVariant={catVariant}
							showFace={showCatFace}
							size={normalizedSize}
						/>
					</div>
					{displayMessage && (
						<p className="text-sm font-medium text-white/70 animate-pulse">{displayMessage}</p>
					)}
					<span className="sr-only">Loading...</span>
				</div>
			);
		}

		// Default: spinner variant (handles both 'inline' and 'fullscreen')
		return (
			<div className={containerClasses} role="status" aria-label="Loading">
				<Spinner
					color="secondary"
					size={normalizedSize === "small" ? "sm" : normalizedSize === "large" ? "lg" : "md"}
					label={displayMessage}
					classNames={{ label: "text-white/70 font-medium mt-2" }}
				/>
				{!displayMessage && <span className="sr-only">Loading...</span>}
			</div>
		);
	},
);

Loading.displayName = "Loading";

/* ==========================================================================
   OFFLINE INDICATOR COMPONENT
   ========================================================================== */

interface OfflineIndicatorProps {
	showWhenOnline?: boolean;
	position?: "top" | "bottom";
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
	showWhenOnline = false,
	position = "top",
}) => {
	const { isOnline, isSlowConnection } = useBrowserState();
	const [showIndicator, setShowIndicator] = useState(false);
	const [justCameOnline, setJustCameOnline] = useState(false);

	useEffect(() => {
		if (!isOnline) {
			setShowIndicator(true);
			setJustCameOnline(false);
		} else if (showWhenOnline || justCameOnline) {
			setShowIndicator(true);
			if (!justCameOnline) {
				setJustCameOnline(true);
				setTimeout(() => {
					setShowIndicator(false);
					setJustCameOnline(false);
				}, 3000);
			}
		} else {
			setShowIndicator(false);
		}
	}, [isOnline, showWhenOnline, justCameOnline]);

	if (!showIndicator) {
		return null;
	}

	const getStatusMessage = () => {
		if (!isOnline) {
			return "You are offline";
		}
		if (justCameOnline) {
			return "Back online";
		}
		if (isSlowConnection) {
			return "Slow connection detected";
		}
		return "Connected";
	};

	const getStatusClass = () => {
		if (!isOnline) {
			return "offline";
		}
		if (justCameOnline) {
			return "online";
		}
		if (isSlowConnection) {
			return "slow";
		}
		return "online";
	};

	return (
		<div className={`indicator ${position} ${getStatusClass()}`}>
			<div className="indicator-content">
				<span className="indicator-dot" />
				<span className="indicator-message">{getStatusMessage()}</span>
			</div>
		</div>
	);
};

/* ==========================================================================
   PERFORMANCE BADGE COMPONENTS
   ========================================================================== */

const INSIGHT_CATEGORIES: Record<string, { label: string; icon: string; description: string }> = {
	top_rated: {
		label: "Top Rated",
		icon: "⭐",
		description: "Among the highest rated names",
	},
	trending_up: {
		label: "Trending",
		icon: "📈",
		description: "Rising in popularity",
	},
	trending_down: {
		label: "Declining",
		icon: "📉",
		description: "Decreasing in popularity",
	},
	new: { label: "New", icon: "✨", description: "Recently added" },
	undefeated: {
		label: "Undefeated",
		icon: "🏆",
		description: "Has never lost a matchup",
	},
	popular: { label: "Popular", icon: "❤️", description: "Frequently selected" },
	underdog: {
		label: "Underdog",
		icon: "🐕",
		description: "Low rating but gaining traction",
	},
};

const getInsightCategory = (type: string) => INSIGHT_CATEGORIES[type] || null;

interface PerformanceBadgeProps {
	type: string;
	label?: string;
	variant?: "sm" | "md";
	className?: string;
}

function PerformanceBadge({ type, label, variant = "md", className = "" }: PerformanceBadgeProps) {
	const category = getInsightCategory(type);

	if (!category && !label) {
		return null;
	}

	const badgeLabel = label || category?.label || type;
	const badgeIcon = category?.icon || "•";
	const badgeDescription = category?.description || "";
	const badgeClass =
		`performance-badge performance-badge-${type} performance-badge-${variant} ${className}`.trim();

	return (
		<span className={badgeClass} aria-label={`${badgeLabel}: ${badgeDescription}`} role="status">
			<span className="badge-icon" aria-hidden="true">
				{badgeIcon}
			</span>
			<span className="badge-label">{badgeLabel}</span>
		</span>
	);
}

PerformanceBadge.displayName = "PerformanceBadge";

interface PerformanceBadgesProps {
	types?: string[];
	className?: string;
}

export function PerformanceBadges({ types = [], className = "" }: PerformanceBadgesProps) {
	if (!types || types.length === 0) {
		return null;
	}

	return (
		<div className={`performance-badges ${className}`.trim()}>
			{types.map((type) => (
				<PerformanceBadge key={type} type={type} variant="sm" />
			))}
		</div>
	);
}

PerformanceBadges.displayName = "PerformanceBadges";

/* ==========================================================================
   TREND INDICATOR COMPONENT
   ========================================================================== */

interface TrendIndicatorProps {
	direction?: "up" | "down" | "stable";
	percentChange?: number;
	compact?: boolean;
	className?: string;
	animated?: boolean;
}

export function TrendIndicator({
	direction = "stable",
	percentChange = 0,
	compact = false,
	className = "",
	animated = true,
}: TrendIndicatorProps) {
	const trendClass =
		`trend-indicator trend-${direction} ${animated ? "trend-animated" : ""} ${className}`.trim();

	const renderIcon = () => {
		switch (direction) {
			case "up":
				return (
					<span className="trend-icon" aria-hidden="true">
						📈
					</span>
				);
			case "down":
				return (
					<span className="trend-icon" aria-hidden="true">
						📉
					</span>
				);
			default:
				return (
					<span className="trend-icon" aria-hidden="true">
						➡️
					</span>
				);
		}
	};

	const ariaLabel = `${direction === "up" ? "Trending up" : direction === "down" ? "Trending down" : "Stable"} ${percentChange ? `by ${percentChange}%` : ""}`;

	if (compact) {
		return (
			<span className={trendClass} aria-label={ariaLabel}>
				{renderIcon()}
			</span>
		);
	}

	return (
		<span className={trendClass} aria-label={ariaLabel}>
			{renderIcon()}
			{percentChange !== 0 && (
				<span className="trend-value">
					{direction === "up" ? "+" : direction === "down" ? "−" : ""}
					{percentChange}%
				</span>
			)}
		</span>
	);
}

TrendIndicator.displayName = "TrendIndicator";

/* ==========================================================================
   TOAST COMPONENTS
   ========================================================================== */

const toastVariants = cva(
	"relative flex items-center overflow-hidden rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300",
	{
		variants: {
			type: {
				info: "bg-blue-500/10 border-blue-500/20 text-blue-100",
				success: "bg-green-500/10 border-green-500/20 text-green-100",
				warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-100",
				error: "bg-red-500/10 border-red-500/20 text-red-100",
			},
			isExiting: {
				true: "translate-x-full opacity-0",
				false: "translate-x-0 opacity-100 animate-in slide-in-from-right-4 fade-in duration-300",
			},
		},
		defaultVariants: {
			type: "info",
			isExiting: false,
		},
	},
);

interface ToastItemProps {
	message: string;
	type?: "success" | "error" | "info" | "warning";
	duration?: number;
	onDismiss?: () => void;
	autoDismiss?: boolean;
	className?: string;
}

const ToastItem: React.FC<ToastItemProps> = ({
	message,
	type = "info",
	duration = 5000,
	onDismiss,
	autoDismiss = true,
	className = "",
}) => {
	const [isVisible, setIsVisible] = useState(true);
	const [isExiting, setIsExiting] = useState(false);
	const toastGlassId = useId();

	const handleDismiss = useCallback(() => {
		setIsExiting(true);
		setTimeout(() => {
			setIsVisible(false);
			onDismiss?.();
		}, 300);
	}, [onDismiss]);

	useEffect(() => {
		if (autoDismiss && duration > 0) {
			const timer = setTimeout(() => {
				handleDismiss();
			}, duration);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [autoDismiss, duration, handleDismiss]);

	if (!isVisible) {
		return null;
	}

	const getTypeIcon = () => {
		switch (type) {
			case "success":
				return "✅";
			case "error":
				return "❌";
			case "warning":
				return "⚠️";
			default:
				return "ℹ️";
		}
	};

	const progressBarColor = {
		info: "bg-blue-400",
		success: "bg-green-400",
		warning: "bg-yellow-400",
		error: "bg-red-400",
	};

	return (
		<LiquidGlass
			id={`toast-glass-${toastGlassId.replace(/:/g, "-")}`}
			{...GLASS_PRESETS.toast}
			className="pointer-events-auto"
			style={{
				width: "auto",
				height: "auto",
				minWidth: "240px",
				maxWidth: "320px",
			}}
		>
			<div
				className={cn(toastVariants({ type, isExiting }), className)}
				role="alert"
				aria-live="polite"
				aria-atomic="true"
			>
				<div className="flex items-start gap-3 p-4 w-full">
					<span className="text-xl select-none leading-none pt-0.5">{getTypeIcon()}</span>
					<span className="flex-1 text-sm font-medium leading-tight pt-0.5 break-words text-white/90 drop-shadow-sm">
						{message}
					</span>

					<button
						onClick={handleDismiss}
						className="items-start -mt-1 -mr-2 p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
						aria-label="Dismiss notification"
						type="button"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>

				{autoDismiss && duration > 0 && (
					<div className="absolute bottom-0 left-0 w-full h-[3px] bg-black/20">
						<div
							className={cn(
								"h-full transition-all ease-linear origin-left",
								progressBarColor[type] || "bg-white",
							)}
							style={{
								width: "100%",
								animation: isExiting ? "none" : `progress-shrink ${duration}ms linear forwards`,
							}}
						/>
						<style>{`
							@keyframes progress-shrink {
								from { transform: scaleX(1); }
								to { transform: scaleX(0); }
							}
						`}</style>
					</div>
				)}
			</div>
		</LiquidGlass>
	);
};

export interface IToastItem {
	id: string;
	message: string;
	type: "success" | "error" | "info" | "warning";
	duration?: number;
	autoDismiss?: boolean;
}

interface ToastContainerProps {
	toasts?: IToastItem[];
	removeToast?: (id: string) => void;
	position?:
		| "top-left"
		| "top-center"
		| "top-right"
		| "bottom-left"
		| "bottom-center"
		| "bottom-right";
	maxToasts?: number;
	className?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
	toasts = [],
	removeToast,
	position = "top-right",
	maxToasts = 5,
	className = "",
}) => {
	const visibleToasts = toasts.slice(0, maxToasts);

	const positionClasses = {
		"top-left": "top-4 left-4 items-start",
		"top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
		"top-right": "top-4 right-4 items-end",
		"bottom-left": "bottom-4 left-4 items-start flex-col-reverse",
		"bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center flex-col-reverse",
		"bottom-right": "bottom-4 right-4 items-end flex-col-reverse",
	};

	const handleToastDismiss = useCallback(
		(toastId: string) => {
			removeToast?.(toastId);
		},
		[removeToast],
	);

	if (toasts.length === 0) {
		return null;
	}

	return (
		<div
			className={cn(
				"fixed z-[100] flex flex-col gap-3 pointer-events-none p-4 min-w-[320px] max-w-[100vw]",
				positionClasses[position] || positionClasses["top-right"],
				className,
			)}
			role="region"
			aria-label="Notifications"
			aria-live="polite"
			aria-atomic="false"
		>
			{visibleToasts.map((toast) => (
				<ToastItem
					key={toast.id}
					message={toast.message}
					type={toast.type}
					duration={toast.duration}
					autoDismiss={toast.autoDismiss}
					onDismiss={() => handleToastDismiss(toast.id)}
					className="pointer-events-auto"
				/>
			))}

			{toasts.length > maxToasts && (
				<div className="bg-black/50 backdrop-blur-md text-white text-xs py-1 px-3 rounded-full border border-white/10 shadow-lg animate-in fade-in">
					+{toasts.length - maxToasts} more
				</div>
			)}
		</div>
	);
};

interface ToastProps extends Partial<ToastItemProps>, ToastContainerProps {
	variant?: "item" | "container";
}

export const Toast: React.FC<ToastProps> = ({
	variant = "item",
	toasts,
	removeToast,
	position = "top-right",
	maxToasts = 5,
	message,
	type = "info",
	duration = 5000,
	onDismiss,
	autoDismiss = true,
	className = "",
}) => {
	if (variant === "container") {
		return (
			<ToastContainer
				toasts={toasts}
				removeToast={removeToast}
				position={position}
				maxToasts={maxToasts}
				className={className}
			/>
		);
	}

	return (
		<ToastItem
			message={message || ""}
			type={type}
			duration={duration}
			onDismiss={onDismiss}
			autoDismiss={autoDismiss}
			className={className}
		/>
	);
};

Toast.displayName = "Toast";

/* ==========================================================================
   ERROR COMPONENTS
   ========================================================================== */

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
