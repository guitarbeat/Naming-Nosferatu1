/**
 * @module SectionHeading
 * @description Decorative section heading with icon, title, subtitle, and divider line.
 */

import type { ElementType, ReactNode } from "react";
import { cn } from "@/shared/lib/basic";

interface SectionHeadingProps {
	icon?: ElementType;
	title: string;
	subtitle?: string;
	className?: string;
	children?: ReactNode;
}

export function SectionHeading({ icon: Icon, title, subtitle, className }: SectionHeadingProps) {
	return (
		<div className={cn("flex flex-col items-center gap-2 py-1 mb-2 sm:mb-4", className)}>
			{/* Decorative divider */}
			<div className="flex w-full items-center gap-4" aria-hidden="true">
				<div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
				{Icon && (
					<div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/50 text-muted-foreground shadow-sm">
						<Icon className="h-4 w-4" />
					</div>
				)}
				<div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
			</div>

			{/* Text */}
			<div className="text-center">
				<h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
				{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
			</div>
		</div>
	);
}
