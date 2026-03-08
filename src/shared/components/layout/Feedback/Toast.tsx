/**
 * @module Toast
 * @description Toast notification system with container and item variants
 */

import { cva } from "class-variance-authority";
import type React from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { cn } from "@/shared/lib/basic";
import { GLASS_PRESETS } from "../GlassPresets";
import LiquidGlass from "../LiquidGlass";

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
