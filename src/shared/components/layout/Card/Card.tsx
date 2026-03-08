/**
 * @module Card
 * @description Reusable card component with flexible styling options
 * Includes sub-components: CardStats and CardName
 */

import { cva } from "class-variance-authority";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { memo, useEffect, useId, useState } from "react";
import CatImage from "@/shared/components/layout/CatImage";
import { cn } from "@/shared/lib/basic";
import { TIMING } from "@/shared/lib/constants";
import { ZoomIn } from "@/shared/lib/icons";
import LiquidGlass, { DEFAULT_GLASS_CONFIG, resolveGlassConfig } from "../LiquidGlass";

export type CardVariant =
        | "default"
        | "elevated"
        | "outlined"
        | "filled"
        | "primary"
        | "success"
        | "warning"
        | "info"
        | "danger"
        | "secondary";

export type CardPadding = "none" | "small" | "medium" | "large" | "xl";
export type CardShadow = "none" | "small" | "medium" | "large" | "xl";
export type CardBackground = "solid" | "glass" | "gradient" | "transparent";

// CVA variant for Card component
const cardVariants = cva(
        "relative flex flex-col overflow-hidden rounded-xl transition-all duration-300 backdrop-blur-md", // Base classes
        {
                variants: {
                        variant: {
                                default: "bg-white/5 border border-white/10",
                                elevated: "bg-white/5 border-none shadow-md",
                                outlined: "bg-transparent border border-white/20",
                                filled: "bg-white/10 border-none",
                                primary:
                                        "bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/30",
                                success:
                                        "bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 hover:border-green-500/30",
                                warning:
                                        "bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/30",
                                info: "bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/30",
                                danger:
                                        "bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 hover:border-red-500/30",
                                secondary:
                                        "bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 hover:border-gray-500/30",
                        },
                        padding: {
                                none: "p-0",
                                small: "p-3",
                                medium: "p-5",
                                large: "p-8",
                                xl: "p-10",
                        },
                        shadow: {
                                none: "shadow-none",
                                small: "shadow-sm",
                                medium: "shadow-md",
                                large: "shadow-lg",
                                xl: "shadow-xl",
                        },
                        bordered: {
                                true: "border border-white/10",
                                false: "",
                        },
                        background: {
                                solid: "bg-black/40",
                                glass: "backdrop-blur-xl bg-white/5",
                                gradient: "bg-gradient-to-br from-white/10 to-white/5",
                                transparent: "bg-transparent",
                        },
                },
                defaultVariants: {
                        variant: "default",
                        padding: "medium",
                        shadow: "none",
                        bordered: false,
                        background: "solid",
                },
        },
);

export interface GlassConfig {
        width?: number;
        height?: number;
        radius?: number;
        scale?: number;
        saturation?: number;
        frost?: number;
        inputBlur?: number;
        outputBlur?: number;
        id?: string;
        [key: string]: unknown;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
        children?: React.ReactNode;
        variant?: CardVariant;
        padding?: CardPadding;
        shadow?: CardShadow;
        border?: boolean;
        background?: CardBackground;
        as?: React.ElementType;
        liquidGlass?: boolean | GlassConfig;
        interactive?: boolean;
        enableTilt?: boolean;
}

const CardBase = memo(
        React.forwardRef<HTMLDivElement, CardProps>(
                (
                        {
                                children,
                                className = "",
                                variant = "default",
                                padding = "medium",
                                shadow = "medium",
                                border = false,
                                background = "solid",
                                as: Component = "div",
                                liquidGlass,
                                interactive = false,
                                enableTilt = false,
                                onClick,
                                onMouseMove,
                                onMouseLeave,
                                style,
                                ...props
                        },
                        ref,
                ) => {
                        const mouseX = useMotionValue(0);
                        const mouseY = useMotionValue(0);

                        const mouseXSpring = useSpring(mouseX);
                        const mouseYSpring = useSpring(mouseY);

                        const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
                        const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

                        const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const y = e.clientY - rect.top;

                                // Update CSS variables for the CSS-based glow effect
                                e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
                                e.currentTarget.style.setProperty("--mouse-y", `${y}px`);

                                if (enableTilt) {
                                        const xPct = x / rect.width - 0.5;
                                        const yPct = y / rect.height - 0.5;
                                        mouseX.set(xPct);
                                        mouseY.set(yPct);
                                }

                                onMouseMove?.(e);
                        };

                        const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
                                if (enableTilt) {
                                        mouseX.set(0);
                                        mouseY.set(0);
                                }
                                onMouseLeave?.(e);
                        };

                        const cardRefClasses = cardVariants({
                                variant,
                                padding,
                                shadow,
                                bordered: border,
                                background:
                                        background !== "solid" && background !== "glass" && !liquidGlass ? background : "solid",
                        });

                        const finalClasses = cn(
                                cardRefClasses,
                                className,
                                interactive &&
                                        "cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-purple-500",
                                interactive && onClick && "active:translate-y-0",
                                // Glow effect helper
                                "before:absolute before:inset-0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 before:pointer-events-none before:z-0",
                                "before:bg-[radial-gradient(circle_at_var(--mouse-x)_var(--mouse-y),rgba(168,85,247,0.15),transparent_50%)]",
                        );

                        // * If liquidGlass is enabled OR background is "glass", wrap content in LiquidGlass
                        const shouldUseLiquidGlass = liquidGlass || background === "glass";
                        // * Generate unique ID for this LiquidGlass instance
                        const glassId = useId();

                        if (shouldUseLiquidGlass) {
                                const glassConfig = resolveGlassConfig(liquidGlass, DEFAULT_GLASS_CONFIG) as GlassConfig;
                                const {
                                        width = 240,
                                        height = 110,
                                        radius = 42,
                                        scale = -110,
                                        saturation = 1.08,
                                        frost = 0.12,
                                        inputBlur = 14,
                                        outputBlur = 0.9,
                                        id,
                                        ...glassProps
                                } = glassConfig;

                                const wrapperClasses = [className].filter(Boolean).join(" ");
                                const contentClasses = cardVariants({
                                        variant,
                                        padding,
                                        shadow,
                                        bordered: border,
                                });

                                return (
                                        <LiquidGlass
                                                id={id || `card-glass-${glassId.replace(/:/g, "-")}`}
                                                width={width}
                                                height={height}
                                                radius={radius}
                                                scale={scale}
                                                saturation={saturation}
                                                frost={frost}
                                                inputBlur={inputBlur}
                                                outputBlur={outputBlur}
                                                className={wrapperClasses}
                                                style={{
                                                        width: "100%",
                                                        height: "auto",
                                                        ...(props as React.HTMLAttributes<HTMLElement>).style,
                                                }}
                                                {...glassProps}
                                        >
                                                <Component ref={ref} className={contentClasses} onClick={onClick} {...props}>
                                                        {children}
                                                </Component>
                                        </LiquidGlass>
                                );
                        }

                        const motionProps = enableTilt
                                ? {
                                                style: {
                                                        rotateX,
                                                        rotateY,
                                                        transformStyle: "preserve-3d" as const,
                                                        ...style,
                                                },
                                        }
                                : { style };

                        const CommonComponent = (enableTilt ? motion.div : Component) as React.ElementType;

                        return (
                                <CommonComponent
                                        ref={ref}
                                        className={finalClasses}
                                        onClick={onClick}
                                        onMouseMove={handleMouseMove}
                                        onMouseLeave={handleMouseLeave}
                                        {...motionProps}
                                        {...props}
                                >
                                        <div
                                                className="relative z-10" // Ensure content is above glow
                                                style={
                                                        enableTilt
                                                                ? {
                                                                                transform: "translateZ(20px)",
                                                                                transformStyle: "preserve-3d",
                                                                        }
                                                                : undefined
                                                }
                                        >
                                                {children}
                                        </div>
                                </CommonComponent>
                        );
                },
        ),
);

CardBase.displayName = "Card";

export const Card = CardBase;

/* ============================================================================
   CARD STATS SUB-COMPONENT
   ============================================================================ */

export interface CardStatsProps extends CardProps {
        title?: string;
        label?: string;
        value: string | number | React.ReactNode;
        emoji?: React.ReactNode;
        labelClassName?: string;
        valueClassName?: string;
        emojiClassName?: string;
}

const CardStatsBase = memo(function CardStats({
        title,
        label,
        value,
        emoji,
        className = "",
        labelClassName = "",
        valueClassName = "",
        emojiClassName = "",
        variant = "default",
        ...props
}: CardStatsProps) {
        const labelText = title || label || "stat";
        const valueText =
                typeof value === "string" || typeof value === "number" ? String(value) : "value";
        const ariaLabel = `${labelText}: ${valueText}`;

        // Determine top accent color based on variant
        const accentGradient: Record<CardVariant, string> = {
                default: "from-white/20 to-white/5",
                primary: "from-purple-500 to-purple-700",
                success: "from-green-500 to-green-700",
                warning: "from-yellow-500 to-yellow-700",
                info: "from-cyan-500 to-cyan-700",
                danger: "from-red-500 to-red-700",
                secondary: "from-gray-500 to-gray-700",
                elevated: "from-white/20 to-white/5",
                outlined: "from-transparent to-transparent",
                filled: "from-transparent to-transparent",
        };
        const valueColor: Record<CardVariant, string> = {
                default: "text-white",
                primary: "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-200",
                success: "text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-200",
                warning: "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200",
                info: "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200",
                danger: "text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-200",
                secondary: "text-gray-400",
                elevated: "text-white",
                outlined: "text-white",
                filled: "text-white",
        };

        return (
                <Card
                        variant={variant}
                        className={cn(
                                "flex flex-col items-center justify-center text-center min-h-[120px] relative pt-6",
                                className,
                        )}
                        role="status"
                        aria-label={ariaLabel}
                        {...props}
                >
                        {/* Top accent bar */}
                        <div
                                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentGradient[variant] || accentGradient.default}`}
                        />

                        {(title || label) && (
                                <span
                                        className={cn(
                                                "text-xs font-semibold uppercase tracking-wider text-white/50 mb-2",
                                                labelClassName,
                                        )}
                                >
                                        {title || label}
                                </span>
                        )}
                        <span
                                className={cn(
                                        "text-4xl font-bold p-1 overflow-hidden",
                                        valueColor[variant] || valueColor.default,
                                        valueClassName,
                                )}
                        >
                                {value}
                        </span>
                        {emoji && <span className={cn("text-2xl mt-2 drop-shadow-sm", emojiClassName)}>{emoji}</span>}
                </Card>
        );
});

CardStatsBase.displayName = "CardStats";

export const CardStats = CardStatsBase;

/* ============================================================================
   CARD NAME SUB-COMPONENT
   ============================================================================ */

interface NameMetadata {
        rating?: number;
        popularity?: number;
        tournaments?: number;
        categories?: string[];
        wins?: number;
        losses?: number;
        totalMatches?: number;
        winRate?: number;
        rank?: number;
        description?: string;
        [key: string]: unknown;
}

export interface CardNameProps {
        name: string;
        description?: string;
        pronunciation?: string;
        isSelected?: boolean;
        onClick?: () => void;
        disabled?: boolean;
        shortcutHint?: string;
        className?: string;
        size?: "small" | "medium";
        metadata?: NameMetadata;
        isAdmin?: boolean;
        isHidden?: boolean;
        _onToggleVisibility?: (id: string) => void;
        _onDelete?: (name: unknown) => void;
        onSelectionChange?: (selected: boolean) => void;
        image?: string;
        onImageClick?: (e: React.MouseEvent) => void;
}

const CardNameBase = memo(function CardName({
        name,
        description,
        pronunciation,
        isSelected,
        onClick,
        disabled = false,
        shortcutHint,
        className = "",
        size = "medium",
        metadata,
        isAdmin = false,
        isHidden = false,
        onSelectionChange,
        image,
        onImageClick,
}: CardNameProps) {
        const [rippleStyle, setRippleStyle] = useState<React.CSSProperties>({});
        const [isRippling, setIsRippling] = useState(false);
        const cardRef = React.useRef<HTMLDivElement>(null);

        useEffect(() => {
                if (isRippling) {
                        const timer = setTimeout(() => setIsRippling(false), TIMING.RIPPLE_ANIMATION_DURATION_MS);
                        return () => clearTimeout(timer);
                }
                return undefined;
        }, [isRippling]);

        const handleInteraction = (event: React.MouseEvent | React.KeyboardEvent) => {
                if (disabled) {
                        return;
                }

                if (
                        event.type === "click" ||
                        (event.type === "keydown" &&
                                ((event as React.KeyboardEvent).key === "Enter" ||
                                        (event as React.KeyboardEvent).key === " "))
                ) {
                        event.preventDefault();

                        const rect = event.currentTarget.getBoundingClientRect();
                        let x = rect.width / 2;
                        let y = rect.height / 2;

                        if ("clientX" in event) {
                                x = event.clientX - rect.left;
                                y = event.clientY - rect.top;
                        }

                        setRippleStyle({
                                left: `${x}px`,
                                top: `${y}px`,
                        });

                        setIsRippling(true);

                        if (isAdmin && onSelectionChange) {
                                onSelectionChange(!isSelected);
                        }

                        onClick?.();
                }
        };

        const getAriaLabel = () => {
                let label = name;
                if (pronunciation) {
                        label += ` - pronunciation ${pronunciation}`;
                }
                if (description) {
                        label += ` - ${description}`;
                }
                if (isSelected) {
                        label += " - selected";
                }
                if (disabled) {
                        label += " - disabled";
                }
                if (isHidden) {
                        label += " - hidden";
                }
                return label;
        };

        const getSafeId = (text: string) => {
                return text.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
        };

        const isInteractive = !disabled && (!!onClick || (isAdmin && !!onSelectionChange));
        const Component = isInteractive ? "button" : "div";

        const cardContent = (
                <div className="relative w-full h-full">
                        <Card
                                as={Component}
                                ref={cardRef as React.Ref<HTMLDivElement>}
                                className={cn(
                                        "w-full h-full relative flex flex-col items-center gap-1 text-center font-inherit cursor-pointer overflow-visible transition-all duration-300",
                                        "backdrop-blur-md rounded-xl border",
                                        size === "small" ? "p-2 min-h-24" : "p-4 min-h-32",
                                        isSelected
                                                ? "border-purple-500 bg-gradient-to-br from-purple-900/40 to-purple-800/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
                                                : "border-white/10 bg-gradient-to-br from-white/10 to-white/5 shadow-lg hover:border-white/20 hover:bg-white/10",
                                        disabled && "opacity-50 cursor-not-allowed filter grayscale",
                                        isHidden && "opacity-75 bg-amber-900/20 border-amber-500/50 grayscale-[0.4]",
                                        image && "min-h-[220px]",
                                        className,
                                )}
                                onClick={
                                        isInteractive ? (handleInteraction as unknown as React.MouseEventHandler) : undefined
                                }
                                onKeyDown={
                                        isInteractive ? (handleInteraction as unknown as React.KeyboardEventHandler) : undefined
                                }
                                // @ts-expect-error - Card props might not fully match HTML attributes
                                disabled={isInteractive ? disabled : undefined}
                                aria-pressed={isInteractive ? isSelected : undefined}
                                aria-label={getAriaLabel()}
                                aria-describedby={
                                        pronunciation && description
                                                ? `${getSafeId(name)}-pronunciation ${getSafeId(name)}-description`
                                                : pronunciation
                                                        ? `${getSafeId(name)}-pronunciation`
                                                        : description
                                                                ? `${getSafeId(name)}-description`
                                                                : undefined
                                }
                                aria-labelledby={`${getSafeId(name)}-title`}
                                type={isInteractive ? "button" : undefined}
                                role={isInteractive ? undefined : "article"}
                                variant={isSelected ? "primary" : "default"}
                                padding={size === "small" ? "small" : "medium"}
                                interactive={isInteractive}
                        >
                                {/* Hidden Badge */}
                                {isHidden && (
                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 text-[10px] font-bold text-black bg-amber-500 rounded-full shadow-sm animate-in slide-in-from-top-2 fade-in duration-300">
                                                🔒 HIDDEN
                                        </div>
                                )}

                                {image && (
                                        <div
                                                className={cn(
                                                        "relative w-full aspect-square mb-2 rounded-lg overflow-hidden border border-white/10 shadow-inner group/image outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
                                                        onImageClick && "cursor-pointer",
                                                )}
                                                onClick={(e) => {
                                                        if (onImageClick) {
                                                                e.stopPropagation();
                                                                onImageClick(e);
                                                        }
                                                }}
                                                role={onImageClick ? "button" : undefined}
                                                tabIndex={onImageClick ? 0 : undefined}
                                                onKeyDown={(e) => {
                                                        if (onImageClick && (e.key === "Enter" || e.key === " ")) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                onImageClick(e as unknown as React.MouseEvent);
                                                        }
                                                }}
                                                aria-label={onImageClick ? "Zoom image" : undefined}
                                        >
                                                <CatImage
                                                        src={image}
                                                        containerClassName="w-full h-full"
                                                        imageClassName="w-full h-full object-cover scale-125 transition-transform duration-500 hover:scale-110 group-focus-visible/image:scale-110"
                                                />
                                                {onImageClick && (
                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 group-focus-visible/image:opacity-100 transition-opacity flex items-center justify-center">
                                                                <ZoomIn className="text-white w-8 h-8 drop-shadow-md" />
                                                        </div>
                                                )}
                                        </div>
                                )}

                                <h3
                                        className={cn(
                                                "font-bold leading-tight text-white m-0 z-10 tracking-tight",
                                                size === "small" ? "text-sm" : "text-lg md:text-xl",
                                                isHidden && "text-amber-500/80",
                                        )}
                                        id={`${getSafeId(name)}-title`}
                                >
                                        {name}
                                </h3>

                                {pronunciation && (
                                        <p
                                                id={`${getSafeId(name)}-pronunciation`}
                                                className={cn(
                                                        "m-0 text-white/80 font-medium z-10",
                                                        size === "small" ? "text-[10px]" : "text-xs",
                                                        isHidden && "text-amber-500/70",
                                                )}
                                        >
                                                [{pronunciation}]
                                        </p>
                                )}

                                {description && (
                                        <p
                                                id={`${getSafeId(name)}-description`}
                                                className={cn(
                                                        "flex-1 m-0 text-white/70 font-normal leading-tight z-10",
                                                        size === "small" ? "text-[10px] min-h-[2.5em]" : "text-xs",
                                                        isHidden && "text-amber-500/60",
                                                )}
                                        >
                                                {description}
                                        </p>
                                )}

                                {metadata && (
                                        <div className="flex flex-col gap-1 mt-auto w-full z-10">
                                                <div className="flex flex-wrap gap-1 justify-center mt-1">
                                                        {metadata.rating && (
                                                                <span
                                                                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-white/60 bg-white/5 border border-white/5 rounded-full"
                                                                        title="Average Rating"
                                                                >
                                                                        ⭐ {metadata.rating}
                                                                </span>
                                                        )}
                                                        {metadata.popularity && (
                                                                <span
                                                                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-white/60 bg-white/5 border border-white/5 rounded-full"
                                                                        title="Popularity Score"
                                                                >
                                                                        🔥 {metadata.popularity}
                                                                </span>
                                                        )}
                                                </div>

                                                {metadata.categories && metadata.categories.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 justify-center mt-1">
                                                                {metadata.categories.slice(0, 2).map((category, index) => (
                                                                        <span
                                                                                key={index}
                                                                                className="px-1.5 py-0.5 text-[10px] font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full"
                                                                        >
                                                                                {category}
                                                                        </span>
                                                                ))}
                                                                {metadata.categories.length > 2 && (
                                                                        <span className="px-1.5 py-0.5 text-[10px] font-medium text-white/40 bg-white/5 border border-white/5 rounded-full">
                                                                                +{metadata.categories.length - 2}
                                                                        </span>
                                                                )}
                                                        </div>
                                                )}
                                        </div>
                                )}

                                {shortcutHint && (
                                        <span
                                                className="absolute top-2 right-2 text-[10px] font-mono text-white/30 border border-white/10 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-hidden="true"
                                        >
                                                {shortcutHint}
                                        </span>
                                )}

                                {isSelected && (
                                        <span
                                                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs font-bold shadow-lg animate-in zoom-in spin-in-12 duration-300 z-20"
                                                aria-hidden="true"
                                        >
                                                ✓
                                        </span>
                                )}

                                {isRippling && isInteractive && (
                                        <span
                                                className="absolute rounded-full bg-white/20 pointer-events-none animate-ping"
                                                style={{
                                                        ...rippleStyle,
                                                        width: "100px",
                                                        height: "100px",
                                                        transform: "translate(-50%, -50%)",
                                                }}
                                                aria-hidden="true"
                                        />
                                )}
                        </Card>
                </div>
        );

        return cardContent;
});

CardNameBase.displayName = "CardName";

export const CardName = CardNameBase;
