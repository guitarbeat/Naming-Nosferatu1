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
		"font-medium tracking-wide",
		"rounded-[var(--radius-button)]",
		"transition-all duration-200 ease-in-out",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
		"disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
		"[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
		"select-none",
	].join(" "),
	{
		variants: {
			variant: {
				primary: [
					"bg-primary text-primary-foreground",
					"shadow-sm",
					"hover:brightness-110 hover:shadow-md hover:-translate-y-px",
					"active:translate-y-0 active:shadow-sm active:brightness-95",
				].join(" "),
				secondary: [
					"bg-secondary text-secondary-foreground",
					"border border-border/40",
					"shadow-sm",
					"hover:bg-secondary/80 hover:border-border/60 hover:shadow-md hover:-translate-y-px",
					"active:translate-y-0 active:shadow-sm active:bg-secondary/70",
				].join(" "),
				danger: [
					"bg-destructive text-destructive-foreground",
					"shadow-sm",
					"hover:brightness-110 hover:shadow-md hover:-translate-y-px",
					"active:translate-y-0 active:shadow-sm active:brightness-95",
				].join(" "),
				ghost: [
					"text-foreground/80",
					"hover:bg-accent/50 hover:text-accent-foreground",
					"active:bg-accent/70",
				].join(" "),
				outline: [
					"border border-border bg-transparent text-foreground",
					"shadow-sm",
					"hover:bg-accent/30 hover:border-border/80 hover:text-accent-foreground hover:-translate-y-px",
					"active:translate-y-0 active:bg-accent/50",
				].join(" "),
				link: [
					"text-primary underline-offset-4",
					"hover:underline hover:text-primary/80",
					"active:text-primary/70",
				].join(" "),
				gradient: [
					"rounded-xl bg-gradient-to-r from-primary to-accent",
					"text-primary-foreground font-bold",
					"shadow-lg shadow-primary/20",
					"hover:from-primary/90 hover:to-accent/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-px",
					"active:scale-[0.98] active:shadow-md",
					"disabled:active:scale-100",
				].join(" "),
				secondaryGradient: [
					"rounded-xl bg-gradient-to-r from-chart-2 to-chart-3",
					"text-primary-foreground font-bold",
					"shadow-lg shadow-chart-2/20",
					"hover:from-chart-2/90 hover:to-chart-3/90 hover:shadow-xl hover:shadow-chart-2/30 hover:-translate-y-px",
					"active:scale-[0.98] active:shadow-md",
					"disabled:active:scale-100",
				].join(" "),
				glass: "",
			},
			size: {
				small: "h-8 px-3 py-1.5 text-xs rounded-md",
				medium: "h-9 px-4 py-2 text-sm",
				large: "h-11 px-6 py-2.5 text-base",
				xl: "h-[50px] px-8 py-3 text-base",
				icon: "h-9 w-9 p-0",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "medium",
		},
	},
);

type ButtonVariant =
	| "primary"
	| "secondary"
	| "danger"
	| "ghost"
	| "outline"
	| "link"
	| "gradient"
	| "secondaryGradient"
	| "glass";
type ButtonSize = "small" | "medium" | "large" | "xl" | "icon";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
	children: React.ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
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
	size = "medium",
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
	const finalSize = iconOnly ? "icon" : size;
	const glassSizeClass =
		finalSize === "small"
			? "fancy-button--small"
			: finalSize === "large"
				? "fancy-button--large"
				: finalSize === "xl"
					? "fancy-button--xl"
					: finalSize === "icon"
						? "fancy-button--icon"
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
			{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
			{startIcon && !loading && startIcon}
			{!iconOnly && children}
			{iconOnly && !startIcon && !loading && children}
			{endIcon && !loading && endIcon}
		</>
	);

	if (variant === "glass") {
		return (
			<div className={cn("fancy-button-wrap", className)}>
				<button
					type={type}
					disabled={disabled || loading}
					className={cn("fancy-button", glassSizeClass)}
					onClick={handleClick}
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
			className={cn(buttonVariants({ variant, size: finalSize }), className)}
			onClick={handleClick}
			{...rest}
		>
			{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
			{startIcon && !loading && <span className="mr-2">{startIcon}</span>}
			{!iconOnly && children}
			{iconOnly && !startIcon && !loading && children}
			{endIcon && !loading && <span className="ml-2">{endIcon}</span>}
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
			className={`scroll-to-top visible ${className}`.trim()}
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
