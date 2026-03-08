/**
 * @module Loading
 * @description Loading state indicators with multiple variants (spinner, cat, bongo, skeleton)
 */

import { Skeleton, Spinner } from "@heroui/react";
import { motion } from "framer-motion";
import type React from "react";
import { memo, Suspense, useMemo } from "react";
import { cn } from "@/shared/lib/basic";
import { Cat, Heart, PawPrint } from "@/shared/lib/icons";
import { BongoCat } from "../LayoutEffects";

const LOADING_ASSETS = ["/assets/images/cat.gif"];

const getRandomLoadingAsset = () => {
	return LOADING_ASSETS[Math.floor(Math.random() * LOADING_ASSETS.length)];
};

type CatVariant = "paw" | "tail" | "bounce" | "spin" | "heartbeat" | "orbit";
type CatColor = "neon" | "pastel" | "warm";
type CardSkeletonVariant = "name-card" | "elevated-card" | "mosaic-card";

export interface LoadingProps {
	variant?: "spinner" | "cat" | "bongo" | "suspense" | "skeleton" | "card-skeleton";
	catVariant?: CatVariant;
	catColor?: CatColor;
	showCatFace?: boolean;
	cardSkeletonVariant?: CardSkeletonVariant;
	text?: string;
	overlay?: boolean;
	className?: string;
	children?: React.ReactNode;
	width?: string | number;
	height?: string | number;
	size?: "small" | "medium" | "large";
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
		variant = "spinner",
		catVariant = "paw",
		showCatFace = true,
		text,
		overlay = false,
		className = "",
		children,
		width = "100%",
		height = 20,
		size = "medium",
		cardSkeletonVariant = "name-card",
	}) => {
		const randomAsset = useMemo(() => getRandomLoadingAsset(), []);
		const isVideo = (randomAsset || "").endsWith(".webm");

		const containerClasses = cn(
			"flex flex-col items-center justify-center gap-3 p-4",
			overlay && "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
			className,
		);

		if (variant === "suspense") {
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
					{text && <p className="text-sm font-medium text-white/70 animate-pulse">{text}</p>}
					<span className="sr-only">Loading...</span>
				</div>
			);

			return <Suspense fallback={fallback}>{children}</Suspense>;
		}

		if (variant === "skeleton") {
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

		if (variant === "card-skeleton") {
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
					{text && <div className="text-center text-xs text-white/50 pt-2">{text}</div>}
				</div>
			);
		}

		if (variant === "bongo") {
			return (
				<div className={containerClasses}>
					<BongoCat size={size} text={text} />
				</div>
			);
		}

		if (variant === "cat") {
			return (
				<div className={containerClasses} role="status" aria-label="Loading">
					<div className="relative flex items-center justify-center p-4 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
						<CatSpinnerContent catVariant={catVariant} showFace={showCatFace} size={size} />
					</div>
					{text && <p className="text-sm font-medium text-white/70 animate-pulse">{text}</p>}
					<span className="sr-only">Loading...</span>
				</div>
			);
		}

		return (
			<div className={containerClasses} role="status" aria-label="Loading">
				<Spinner
					color="secondary"
					size={size === "small" ? "sm" : size === "large" ? "lg" : "md"}
					label={text}
					classNames={{ label: "text-white/70 font-medium mt-2" }}
				/>
				{!text && <span className="sr-only">Loading...</span>}
			</div>
		);
	},
);

Loading.displayName = "Loading";
