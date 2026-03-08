/**
 * @module NavButton
 * @description Reusable navigation button component for FluidNav.
 * Extracts repeated button pattern into a single DRY component.
 */

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/shared/lib/basic";

interface NavButtonProps {
	/** Unique identifier for the button */
	id: string;
	/** Lucide icon component */
	icon: LucideIcon;
	/** Button label text */
	label: string;
	/** Whether this button is currently active */
	isActive: boolean;
	/** Click handler */
	onClick: () => void;
	/** Optional aria-label override */
	ariaLabel?: string;
	/** Additional className */
	className?: string;
	/** Whether button is highlighted (for special states) */
	highlight?: boolean;
	/** Whether button is disabled */
	disabled?: boolean;
	/** Custom content to render instead of icon (e.g., avatar) */
	customIcon?: React.ReactNode;
	/** Badge content (e.g., green dot for logged in) */
	badge?: React.ReactNode;
}

export function NavButton({
	id: _id,
	icon: Icon,
	label,
	isActive,
	onClick,
	ariaLabel,
	className,
	highlight = false,
	disabled = false,
	customIcon,
	badge,
}: NavButtonProps) {
	return (
		<button
			className={cn(
				"relative flex flex-row items-center justify-center flex-1 gap-2 p-2 rounded-xl transition-all",
				isActive && !highlight
					? "text-white bg-white/10"
					: "text-white/50 hover:text-white hover:bg-white/5",
				highlight && "text-cyan-400 bg-cyan-950/30 border border-cyan-500/30",
				disabled && "opacity-50 cursor-not-allowed",
				className,
			)}
			onClick={onClick}
			type="button"
			aria-label={ariaLabel || label}
			disabled={disabled}
		>
			<div className="relative">
				{customIcon || (
					<Icon className={cn("w-5 h-5", highlight && "text-cyan-400")} aria-hidden={true} />
				)}
				{badge}
			</div>
			<span className="text-xs font-medium tracking-wide truncate max-w-[80px]">{label}</span>
			{isActive && !highlight && (
				<motion.div
					layoutId="dockIndicator"
					className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/80 rounded-t-full"
				/>
			)}
		</button>
	);
}

/**
 * Animated version of NavButton with motion effects
 */
export function AnimatedNavButton({
	animateScale = false,
	...props
}: NavButtonProps & { animateScale?: boolean }) {
	const { icon: Icon, highlight, customIcon } = props;

	return (
		<motion.button
			className={cn(
				"relative flex flex-row items-center justify-center flex-1 gap-2 p-2 rounded-xl transition-all",
				props.isActive && !highlight
					? "text-white bg-white/10"
					: "text-white/50 hover:text-white hover:bg-white/5",
				highlight && "text-cyan-400 bg-cyan-950/30 border border-cyan-500/30",
				props.disabled && "opacity-50 cursor-not-allowed",
				props.className,
			)}
			onClick={props.onClick}
			type="button"
			disabled={props.disabled}
			animate={animateScale && highlight ? { scale: [1, 1.05, 1] } : {}}
			transition={animateScale && highlight ? { duration: 2, repeat: Infinity } : {}}
		>
			<div className="relative">
				{customIcon || (
					<Icon className={cn("w-5 h-5", highlight && "text-cyan-400")} aria-hidden={true} />
				)}
				{props.badge}
			</div>
			<span className="text-xs font-medium tracking-wide truncate max-w-[80px]">{props.label}</span>
		</motion.button>
	);
}
