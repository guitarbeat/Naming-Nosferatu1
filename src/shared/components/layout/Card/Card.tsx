/**
 * @module Card
 * @description Reusable card component with flexible styling options
 * Includes sub-components: CardStats and CardName
 */

import { cva } from "class-variance-authority";
import { motion } from "framer-motion";
import React, { memo, useEffect, useId, useState } from "react";
import CatImage from "@/shared/components/layout/CatImage";
import { useTilt } from "@/shared/hooks/useTilt";
import { cn } from "@/shared/lib/basic";
import { TIMING } from "@/shared/lib/constants";
import { ZoomIn } from "@/shared/lib/icons";
import LiquidGlass, { DEFAULT_GLASS_CONFIG, resolveGlassConfig } from "../LiquidGlass";

type CardVariant =
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

type CardPadding = "none" | "small" | "medium" | "large" | "xl";
type CardShadow = "none" | "small" | "medium" | "large" | "xl";
type CardBackground = "solid" | "glass" | "gradient" | "transparent";

// CVA variant for Card component
const cardVariants = cva(
	"relative flex flex-col overflow-hidden rounded-xl transition-all duration-300 backdrop-blur-md", // Base classes
	{
		variants: {
			variant: {
				default: "bg-foreground/5 border border-border/10",
				elevated: "bg-foreground/5 border-none shadow-md",
				outlined: "bg-transparent border border-border/20",
				filled: "bg-foreground/10 border-none",
				primary:
					"bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/30",
				success:
					"bg-gradient-to-br from-chart-2/10 to-chart-2/5 border border-chart-2/20 hover:border-chart-2/30",
				warning:
					"bg-gradient-to-br from-chart-4/10 to-chart-4/5 border border-chart-4/20 hover:border-chart-4/30",
				info: "bg-gradient-to-br from-chart-5/10 to-chart-5/5 border border-chart-5/20 hover:border-chart-5/30",
				danger:
					"bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20 hover:border-destructive/30",
				secondary:
					"bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 hover:border-secondary/30",
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
				true: "border border-border/10",
				false: "",
			},
			background: {
				solid: "bg-background/40",
				glass: "backdrop-blur-xl bg-foreground/5",
				gradient: "bg-gradient-to-br from-foreground/10 to-foreground/5",
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

interface GlassConfig {
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

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
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
			const tilt = useTilt(enableTilt);

			const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
				const rect = e.currentTarget.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const y = e.clientY - rect.top;

				// Update CSS variables for the CSS-based glow effect
				e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
				e.currentTarget.style.setProperty("--mouse-y", `${y}px`);

				tilt.handleMouseMove(e);
				onMouseMove?.(e);
			};

			const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
				tilt.handleMouseLeave();
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
					"cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary",
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

			const motionProps = tilt.isEnabled
				? {
						style: {
							rotateX: tilt.rotateX,
							rotateY: tilt.rotateY,
							transformStyle: "preserve-3d" as const,
							...style,
						},
					}
				: { style };

			const CommonComponent = (tilt.isEnabled ? motion.div : Component) as React.ElementType;

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
						className="relative z-10 h-full" // Ensure content is above glow and can fill card height
						style={
							enableTilt
								? {
										transform: "translateZ(10px)",
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

interface CardStatsProps extends CardProps {
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
		default: "from-foreground/20 to-foreground/5",
		primary: "from-primary to-primary/70",
		success: "from-chart-2 to-chart-2/70",
		warning: "from-chart-4 to-chart-4/70",
		info: "from-chart-5 to-chart-5/70",
		danger: "from-destructive to-destructive/70",
		secondary: "from-secondary to-secondary/70",
		elevated: "from-foreground/20 to-foreground/5",
		outlined: "from-transparent to-transparent",
		filled: "from-transparent to-transparent",
	};
	const valueColor: Record<CardVariant, string> = {
		default: "text-foreground",
		primary: "text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60",
		success: "text-transparent bg-clip-text bg-gradient-to-r from-chart-2 to-chart-2/60",
		warning: "text-transparent bg-clip-text bg-gradient-to-r from-chart-4 to-chart-4/60",
		info: "text-transparent bg-clip-text bg-gradient-to-r from-chart-5 to-chart-5/60",
		danger: "text-transparent bg-clip-text bg-gradient-to-r from-destructive to-destructive/60",
		secondary: "text-secondary-foreground",
		elevated: "text-foreground",
		outlined: "text-foreground",
		filled: "text-foreground",
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
						"text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2",
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

interface CardNameProps {
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
	enableTilt?: boolean;
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
	enableTilt = true,
}: CardNameProps) {
	const [rippleStyle, setRippleStyle] = useState<React.CSSProperties>({});
	const [isRippling, setIsRippling] = useState(false);
	const cardRef = React.useRef<HTMLDivElement>(null);

	// Disable tilt on touch devices for better performance
	const [isTouchDevice, setIsTouchDevice] = useState(false);
	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
			setIsTouchDevice(false);
			return;
		}

		setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
	}, []);
	const shouldEnableTilt = enableTilt && !isTouchDevice;

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
		<div
			className="relative w-full h-full"
			style={{ perspective: shouldEnableTilt && !disabled ? "800px" : undefined }}
		>
			<Card
				as={Component}
				ref={cardRef as React.Ref<HTMLDivElement>}
				className={cn(
					"w-full h-full relative flex flex-col items-center gap-1 text-center font-inherit cursor-pointer overflow-visible transition-all duration-300",
					"backdrop-blur-md rounded-xl border",
					size === "small" ? "p-2 min-h-24" : "p-4 min-h-32",
					isSelected
						? "border-primary bg-gradient-to-br from-primary/20 to-primary/10 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
						: "border-border/10 bg-gradient-to-br from-foreground/10 to-foreground/5 shadow-lg hover:border-border/20 hover:bg-foreground/10",
					disabled && "opacity-50 cursor-not-allowed filter grayscale",
					isHidden && "opacity-75 bg-chart-4/10 border-chart-4/50 grayscale-[0.4]",
					image && "min-h-[220px] p-0 overflow-hidden",
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
				enableTilt={shouldEnableTilt && !disabled}
			>
				{/* Hidden Badge */}
				{isHidden && (
					<div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 text-[10px] font-bold text-background bg-chart-4 rounded-full shadow-sm animate-in slide-in-from-top-2 fade-in duration-300">
						🔒 HIDDEN
					</div>
				)}

				{image && (
					<div
						className={cn(
							"absolute inset-0 w-full h-full overflow-hidden rounded-xl group/image outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
							imageClassName="w-full h-full object-cover transition-transform duration-500 hover:scale-110 group-focus-visible/image:scale-110"
						/>
						{/* Bottom gradient for text legibility */}
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
						{onImageClick && (
							<div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 group-focus-visible/image:opacity-100 transition-opacity flex items-center justify-center">
								<ZoomIn className="text-white w-8 h-8 drop-shadow-md" />
							</div>
						)}
					</div>
				)}

				{/* Text content - overlaid on image when present */}
				<div
					className={cn(
						"z-10 flex flex-col items-center gap-1",
						image && "absolute inset-0 justify-center px-3 w-full",
					)}
				>
					<h3
						className={cn(
							"font-bold leading-tight m-0 tracking-tight",
							image ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" : "text-foreground",
							size === "small" ? "text-sm" : "text-lg md:text-xl",
							isHidden && "text-chart-4/80",
						)}
						id={`${getSafeId(name)}-title`}
					>
						{name}
					</h3>

					{pronunciation && (
						<p
							id={`${getSafeId(name)}-pronunciation`}
							className={cn(
								"m-0 font-medium",
								image
									? "text-warning drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
									: "text-foreground/80",
								size === "small" ? "text-[10px]" : "text-xs",
								isHidden && "text-chart-4/70",
							)}
						>
							[{pronunciation}]
						</p>
					)}

					{description && (
						<p
							id={`${getSafeId(name)}-description`}
							className={cn(
								"m-0 font-normal leading-tight",
								image
									? "text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
									: "text-foreground/70",
								size === "small" ? "text-[10px]" : "text-xs",
								isHidden && "text-chart-4/60",
							)}
						>
							{description}
						</p>
					)}
				</div>

				{metadata && (
					<div className="flex flex-col gap-1 mt-auto w-full z-10">
						<div className="flex flex-wrap gap-1 justify-center mt-1">
							{metadata.rating && (
								<span
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 bg-foreground/5 border border-foreground/5 rounded-full"
									title="Average Rating"
								>
									⭐ {metadata.rating}
								</span>
							)}
							{metadata.popularity && (
								<span
									className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 bg-foreground/5 border border-foreground/5 rounded-full"
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
										className="px-1.5 py-0.5 text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full"
									>
										{category}
									</span>
								))}
								{metadata.categories.length > 2 && (
									<span className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/40 bg-foreground/5 border border-foreground/5 rounded-full">
										+{metadata.categories.length - 2}
									</span>
								)}
							</div>
						)}
					</div>
				)}

				{shortcutHint && (
					<span
						className="absolute top-2 right-2 text-[10px] font-mono text-muted-foreground/30 border border-border/10 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
						aria-hidden="true"
					>
						{shortcutHint}
					</span>
				)}

				{isSelected && (
					<span
						className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground rounded-full text-xs font-bold shadow-lg animate-in zoom-in spin-in-12 duration-300 z-20"
						aria-hidden="true"
					>
						✓
					</span>
				)}

				{isRippling && isInteractive && (
					<span
						className="absolute rounded-full bg-foreground/20 pointer-events-none animate-ping"
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
