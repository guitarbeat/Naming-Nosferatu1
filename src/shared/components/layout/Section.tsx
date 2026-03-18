/**
 * @module Section
 * @description Generic content section with configurable width, padding, and styling.
 * Used throughout the app to create consistent layout structure.
 */

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/basic";

interface SectionProps {
	id?: string;
	children: ReactNode;
	variant?: "minimal" | "card" | "default";
	padding?: "comfortable" | "compact" | "none";
	maxWidth?: "full" | "sm" | "md" | "lg" | "xl" | "2xl";
	className?: string;
	separator?: boolean;
	scrollMargin?: boolean;
	centered?: boolean;
}

const paddingClasses = {
	comfortable: "py-6 sm:py-8 md:py-10",
	compact: "py-4 sm:py-6",
	none: "",
} as const;

const maxWidthClasses = {
	full: "w-full",
	sm: "mx-auto w-full max-w-xl",
	md: "mx-auto w-full max-w-2xl",
	lg: "mx-auto w-full max-w-4xl",
	xl: "mx-auto w-full max-w-6xl",
	"2xl": "mx-auto w-full max-w-7xl",
} as const;

const variantClasses = {
	minimal: "",
	card: "rounded-xl border border-border bg-card/50 backdrop-blur-sm p-4 sm:p-6",
	default: "bg-background/50",
} as const;

export function Section({
	id,
	children,
	variant = "minimal",
	padding = "comfortable",
	maxWidth = "full",
	className = "",
	separator = false,
	scrollMargin = true,
	centered = false,
}: SectionProps) {
	return (
		<section
			id={id}
			className={cn(
				paddingClasses[padding],
				maxWidthClasses[maxWidth],
				variantClasses[variant],
				separator && "mt-8 border-t border-border pt-8",
				scrollMargin && "scroll-mt-20",
				centered && "flex flex-col items-center w-full",
				className,
			)}
		>
			{children}
		</section>
	);
}
