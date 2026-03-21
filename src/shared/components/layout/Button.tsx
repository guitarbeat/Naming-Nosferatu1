/**
 * @module Button
 * @description Simplified button component with direct variant API.
 */

import { cva } from "class-variance-authority";
import React, { memo } from "react";
import { cn } from "@/shared/lib/basic";
import { Loader2 } from "@/shared/lib/icons";
import "./FancyButton.css";

/**
 * Unified button variants - single source of truth
 */
const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-2 whitespace-nowrap",
		"border border-transparent",
		"font-semibold tracking-wide",
		"rounded-[var(--radius-button)]",
		"transition-all duration-200 ease-out",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
		"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
		"[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
		"select-none",
	].join(" "),
	{
		variants: {
			variant: {
				primary: [
					"bg-primary text-primary-foreground border-primary/45",
					"shadow-sm shadow-primary/20",
					"hover:-translate-y-px hover:bg-primary/92 hover:shadow-md hover:shadow-primary/25",
					"active:translate-y-0 active:shadow-sm active:bg-primary/88",
				].join(" "),
				secondary: [
					"bg-secondary/90 text-secondary-foreground border-border/45",
					"shadow-sm",
					"hover:-translate-y-px hover:bg-secondary hover:border-border/70 hover:shadow-md",
					"active:translate-y-0 active:shadow-sm active:bg-secondary/85",
				].join(" "),
				danger: [
					"bg-destructive/92 text-destructive-foreground border-destructive/45",
					"shadow-sm shadow-destructive/20",
					"hover:-translate-y-px hover:bg-destructive hover:shadow-md hover:shadow-destructive/25",
					"active:translate-y-0 active:shadow-sm active:bg-destructive/88",
				].join(" "),
				ghost: [
					"bg-foreground/[0.04] text-foreground/80",
					"hover:bg-accent/55 hover:text-accent-foreground",
					"active:bg-accent/70",
				].join(" "),
				outline: [
					"border-border/55 bg-background/85 text-foreground",
					"shadow-sm",
					"hover:-translate-y-px hover:bg-accent/30 hover:border-border/80 hover:text-accent-foreground",
					"active:translate-y-0 active:bg-accent/45",
				].join(" "),
				glass: "",
			},
			size: {
				sm: "h-8 px-3 text-xs",
				md: "h-10 px-4 text-sm",
				lg: "h-11 px-5 text-sm sm:text-base",
				xl: "h-12 px-6 text-base",
				icon: "size-10 p-0",
			},
			presentation: {
				default: "",
				chip: "h-auto min-h-8 px-3 py-1.5 text-xs font-semibold tracking-normal shadow-none",
			},
			shape: {
				default: "",
				pill: "rounded-full",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
			presentation: "default",
			shape: "default",
		},
	},
);

const BUTTON_SIZE_ALIASES = {
	small: "sm",
	medium: "md",
	large: "lg",
	sm: "sm",
	md: "md",
	lg: "lg",
	xl: "xl",
	icon: "icon",
} as const;

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline" | "glass";
type ButtonSize = keyof typeof BUTTON_SIZE_ALIASES;
type NormalizedButtonSize = (typeof BUTTON_SIZE_ALIASES)[ButtonSize];
type ButtonPresentation = "default" | "chip";
type ButtonShape = "default" | "pill";

const normalizeButtonSize = (size: ButtonSize = "md"): NormalizedButtonSize =>
	BUTTON_SIZE_ALIASES[size] ?? "md";

const getButtonClassName = ({
	variant = "primary",
	size = "md",
	presentation = "default",
	shape = "default",
	iconOnly = false,
	className,
}: {
	variant?: Exclude<ButtonVariant, "glass">;
	size?: ButtonSize;
	presentation?: ButtonPresentation;
	shape?: ButtonShape;
	iconOnly?: boolean;
	className?: string;
}) =>
	cn(
		buttonVariants({
			variant,
			size: iconOnly ? "icon" : normalizeButtonSize(size),
			presentation: iconOnly ? "default" : presentation,
			shape: iconOnly ? "pill" : shape,
		}),
		className,
	);

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
	children: React.ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
	presentation?: ButtonPresentation;
	shape?: ButtonShape;
	disabled?: boolean;
	loading?: boolean;
	type?: "button" | "submit" | "reset";
	className?: string;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	startIcon?: React.ReactNode | null;
	endIcon?: React.ReactNode | null;
	iconOnly?: boolean;
}

const Button = ({
	children,
	variant = "primary",
	size = "md",
	presentation = "default",
	shape = "default",
	disabled = false,
	loading = false,
	type = "button",
	className = "",
	onClick,
	startIcon = null,
	endIcon = null,
	iconOnly = false,
	...rest
}: ButtonProps) => {
	const finalSize = iconOnly ? "icon" : normalizeButtonSize(size);
	const finalShape = iconOnly ? "pill" : shape;
	const glassSizeClass =
		finalSize === "lg"
			? "fancy-button--large"
			: finalSize === "xl"
				? "fancy-button--xl"
				: finalSize === "icon"
					? "fancy-button--icon"
					: finalSize === "sm"
						? "fancy-button--small"
						: "fancy-button--medium";

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (disabled || loading) {
			event.preventDefault();
			return;
		}
		onClick?.(event);
	};

	const content = (
		<>
			{loading && <Loader2 className="animate-spin" />}
			{startIcon && !loading && startIcon}
			{!iconOnly && children}
			{iconOnly && !startIcon && !loading && children}
			{endIcon && !loading && endIcon}
		</>
	);

	if (variant === "glass") {
		return (
			<div
				className={cn("fancy-button-wrap", className)}
				data-button-variant={variant}
				data-button-presentation={presentation}
				data-button-shape="pill"
			>
				<button
					type={type}
					disabled={disabled || loading}
					className={cn(
						"fancy-button",
						glassSizeClass,
						presentation === "chip" && "fancy-button--chip",
						className,
					)}
					onClick={handleClick}
					aria-busy={loading}
					{...rest}
				>
					<span className="fancy-button-content">{content}</span>
				</button>
				<div className="fancy-button-shadow" aria-hidden={true} />
			</div>
		);
	}

	return (
		<button
			type={type}
			disabled={disabled || loading}
			className={getButtonClassName({
				variant,
				size: finalSize,
				presentation,
				shape: finalShape,
				iconOnly,
				className,
			})}
			onClick={handleClick}
			data-button-variant={variant}
			data-button-presentation={presentation}
			data-button-shape={finalShape}
			aria-busy={loading}
			{...rest}
		>
			{loading && <Loader2 className="animate-spin" />}
			{startIcon && !loading && startIcon}
			{!iconOnly && children}
			{iconOnly && !startIcon && !loading && children}
			{endIcon && !loading && endIcon}
		</button>
	);
};

Button.displayName = "Button";

/**
 * ScrollToTopButton component - floating button that scrolls to top of page
 */
const ScrollToTopButton = ({
	isLoggedIn,
	className = "",
}: {
	isLoggedIn: boolean;
	className?: string;
}) => {
	const [showScrollTop, setShowScrollTop] = React.useState(false);

	React.useEffect(() => {
		if (!isLoggedIn) {
			setShowScrollTop(false);
			return undefined;
		}

		let scrollTimeout: number | null = null;

		const checkScroll = () => {
			const threshold = window.innerHeight <= 768 ? window.innerHeight * 1.5 : window.innerHeight;
			setShowScrollTop(window.scrollY > threshold);
		};

		const throttledCheckScroll = () => {
			if (scrollTimeout) {
				return;
			}

			scrollTimeout = requestAnimationFrame(() => {
				checkScroll();
				scrollTimeout = null;
			});
		};

		checkScroll();

		window.addEventListener("scroll", throttledCheckScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", throttledCheckScroll);
			if (scrollTimeout) {
				cancelAnimationFrame(scrollTimeout);
			}
		};
	}, [isLoggedIn]);

	if (!isLoggedIn || !showScrollTop) {
		return null;
	}

	return (
		<button
			type="button"
			className={cn(
				"scroll-to-top visible",
				getButtonClassName({
					variant: "secondary",
					size: "icon",
					shape: "pill",
					iconOnly: true,
				}),
				className,
			)}
			onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
			aria-label="Scroll to top"
			tabIndex={0}
		>
			↑
		</button>
	);
};

ScrollToTopButton.displayName = "ScrollToTopButton";

export default memo(Button);
export { ScrollToTopButton };
export { getButtonClassName, normalizeButtonSize };
