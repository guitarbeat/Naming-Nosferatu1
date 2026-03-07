import { cva } from "class-variance-authority";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { memo, useId } from "react";
import { cn } from "@/shared/lib/basic";
import LiquidGlass, { DEFAULT_GLASS_CONFIG, resolveGlassConfig } from "../LiquidGlass";
import type { CardProps, GlassConfig } from "./Card.types";

const cardVariants = cva(
	"relative flex flex-col overflow-hidden rounded-xl transition-all duration-300 backdrop-blur-md",
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
					"cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary",
				interactive && onClick && "active:translate-y-0",
				"before:absolute before:inset-0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 before:pointer-events-none before:z-0",
				"before:bg-[radial-gradient(circle_at_var(--mouse-x)_var(--mouse-y),rgba(168,85,247,0.15),transparent_50%)]",
			);

			const shouldUseLiquidGlass = liquidGlass || background === "glass";
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
						className="relative z-10 h-full"
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
