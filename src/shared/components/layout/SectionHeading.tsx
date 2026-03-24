/**
 * @module SectionHeading
 * @description Decorative section heading. Supports two variants:
 *   - "default": icon circle flanked by gradient divider lines (original)
 *   - "matchcard": theatrical fight-card style with monospace eyebrow label,
 *     bold gradient title, and optional gradient rules (for the hero/main-event section)
 */

import type { ElementType } from "react";
import { cn } from "@/shared/lib/basic";

interface SectionHeadingProps {
        icon?: ElementType;
        title: string;
        subtitle?: string;
        className?: string;
        variant?: "default" | "matchcard";
        eyebrow?: string;
        isHero?: boolean;
}

export function SectionHeading({
        icon: Icon,
        title,
        subtitle,
        className,
        variant = "default",
        eyebrow,
        isHero = false,
}: SectionHeadingProps) {
        if (variant === "matchcard") {
                return (
                        <div className={cn("flex flex-col items-center gap-0 py-1 mb-2 sm:mb-4 w-full", className)}>
                                {isHero && (
                                        <div
                                                className="w-full h-px mb-3 bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent"
                                                aria-hidden="true"
                                        />
                                )}
                                {eyebrow && (
                                        <span className="text-[11px] tracking-[0.28em] font-mono font-bold text-fuchsia-400 uppercase mb-2">
                                                {eyebrow}
                                        </span>
                                )}
                                <h2
                                        className={cn(
                                                "font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-fuchsia-500 text-center leading-none",
                                                isHero ? "text-3xl sm:text-4xl md:text-5xl mb-3" : "text-2xl sm:text-3xl",
                                        )}
                                >
                                        {title}
                                </h2>
                                {isHero && (
                                        <div
                                                className="w-full h-px mt-2 bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent"
                                                aria-hidden="true"
                                        />
                                )}
                                {subtitle && !isHero && (
                                        <p className="mt-1.5 text-sm text-muted-foreground text-center">{subtitle}</p>
                                )}
                        </div>
                );
        }

        return (
                <div className={cn("flex flex-col items-center gap-2 py-1 mb-2 sm:mb-4", className)}>
                        <div className="flex w-full items-center gap-4" aria-hidden="true">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                                {Icon && (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/50 text-muted-foreground shadow-sm">
                                                <Icon className="h-4 w-4" />
                                        </div>
                                )}
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                        </div>

                        <div className="text-center">
                                <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
                                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
                        </div>
                </div>
        );
}
