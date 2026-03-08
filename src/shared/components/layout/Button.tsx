/**
 * @module Button
 * @description Simplified button component with direct variant API.
 */

import { cva } from "class-variance-authority";
import React, { memo } from "react";
import { cn } from "@/shared/lib/basic";
import { Loader2 } from "@/shared/lib/icons";

/**
 * Unified button variants - single source of truth
 */
const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all",
	{
		variants: {
			variant: {
				primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
				secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
				danger: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				outline:
					"border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
				gradient:
					"rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-purple-900/20 active:scale-95 disabled:active:scale-100",
				secondaryGradient:
					"rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-900/20 active:scale-95 disabled:active:scale-100",
			},
			size: {
				small: "h-8 rounded-md px-3 text-xs",
				medium: "h-9 px-4 py-2",
				large: "h-10 rounded-md px-8",
				xl: "h-[50px] px-8",
				icon: "h-9 w-9",
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
	| "secondaryGradient";
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

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (disabled || loading) {
			event.preventDefault();
			return;
		}
		onClick?.(event);
	};

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
