/**
 * @module FloatingNavbar
 * @description Primary bottom navigation and quick actions for the app shell
 */

import { motion } from "framer-motion";
import { type ElementType, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/basic";
import {
	BarChart3,
	CheckCircle,
	Layers,
	LayoutGrid,
	Lightbulb,
	Trophy,
	User,
} from "@/shared/lib/icons";
import useAppStore from "@/store/appStore";
import { getButtonClassName } from "./Button";
import { getGlassPreset } from "./GlassPresets";
import LiquidGlass from "./LiquidGlass";

type NavSection = "pick" | "suggest" | "profile" | "analyze";
type HomeTab = Exclude<NavSection, "analyze">;

function getHomeTabFromHash(hash: string): HomeTab {
	switch (hash) {
		case "#suggest":
			return "suggest";
		case "#profile":
			return "profile";
		default:
			return "pick";
	}
}

function FloatingNavItem({
	icon: Icon,
	label,
	isAccent = false,
	isCurrent = false,
	isPressed = false,
	variant = "primary",
	onClick,
	className,
	customIcon,
	ariaLabel,
}: {
	icon: ElementType;
	label: string;
	isAccent?: boolean;
	isCurrent?: boolean;
	isPressed?: boolean;
	variant?: "primary" | "utility";
	onClick?: () => void;
	className?: string;
	customIcon?: React.ReactNode;
	ariaLabel?: string;
}) {
	const sharedVariant = isAccent ? "primary" : variant === "utility" ? "ghost" : "secondary";
	const baseClasses = cn(
		getButtonClassName({
			variant: sharedVariant,
			presentation: "chip",
			shape: "pill",
		}),
		"floating-navbar__item",
		"relative flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200",
		variant === "primary" && "floating-navbar__item--primary",
		variant === "utility" && "floating-navbar__item--utility",
		isCurrent && "floating-navbar__item--current",
		isPressed && "floating-navbar__item--pressed",
		isAccent && "floating-navbar__item--accent",
		className,
	);

	return (
		<motion.button
			type="button"
			whileTap={{ scale: 0.97 }}
			className={baseClasses}
			onClick={onClick}
			aria-label={ariaLabel}
			aria-current={isCurrent ? "location" : undefined}
			aria-pressed={isPressed}
		>
			{customIcon || <Icon className="floating-navbar__icon" />}
			<span className="floating-navbar__label">{label}</span>
		</motion.button>
	);
}

export function FloatingNavbar() {
	const navigate = useNavigate();
	const location = useLocation();
	const { tournament, user, ui, uiActions } = useAppStore();

	const [isNavVisible, setIsNavVisible] = useState(true);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	const isHomeRoute = location.pathname === "/";
	const isTournamentRoute = location.pathname === "/tournament";
	const isAnalysisRoute = location.pathname === "/analysis";
	const isAdminRoute = location.pathname === "/admin";
	const activeHomeTab = getHomeTabFromHash(location.hash);

	const { selectedNames } = tournament;
	const { isLoggedIn, name: userName, isAdmin, avatarUrl } = user;
	const { isSwipeMode } = ui;

	const selectedCount = selectedNames?.length || 0;
	const profileLabel = isLoggedIn ? userName?.split(" ")[0] || "Profile" : "Profile";
	const primaryItemCount = 4;
	const navGlassId = isHomeRoute
		? `navbar-home-${activeHomeTab}`
		: isAnalysisRoute
			? "navbar-analysis"
			: "navbar-page";

	const navigateHome = (tab: HomeTab = "pick", replace = false) => {
		navigate(
			{
				pathname: "/",
				hash: tab === "pick" ? "" : tab,
			},
			{ replace },
		);
	};

	const handleNavClick = (key: NavSection) => {
		if (key === "analyze") {
			if (!isAnalysisRoute) {
				navigate("/analysis");
			}
			return;
		}

		navigateHome(key, isHomeRoute);
	};

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
		updatePreference();
		mediaQuery.addEventListener("change", updatePreference);
		return () => mediaQuery.removeEventListener("change", updatePreference);
	}, []);

	useEffect(() => {
		let lastScrollY = window.scrollY;
		let ticking = false;
		const mobileMediaQuery = window.matchMedia("(max-width: 768px)");

		const onScroll = () => {
			if (!mobileMediaQuery.matches) {
				setIsNavVisible(true);
				lastScrollY = window.scrollY;
				return;
			}

			if (ticking) {
				return;
			}

			ticking = true;
			requestAnimationFrame(() => {
				const currentScrollY = window.scrollY;
				const delta = currentScrollY - lastScrollY;

				if (currentScrollY <= 80) {
					setIsNavVisible(true);
				} else if (delta > 12) {
					setIsNavVisible(false);
				} else if (delta < -12) {
					setIsNavVisible(true);
				}

				lastScrollY = currentScrollY;
				ticking = false;
			});
		};

		const onViewportChange = () => {
			if (!mobileMediaQuery.matches) {
				setIsNavVisible(true);
			}
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		mobileMediaQuery.addEventListener("change", onViewportChange);

		return () => {
			window.removeEventListener("scroll", onScroll);
			mobileMediaQuery.removeEventListener("change", onViewportChange);
		};
	}, []);

	if (isTournamentRoute || isAdminRoute) {
		return null;
	}

	return (
		<motion.div
			className={cn(
				"floating-navbar-frame",
				!prefersReducedMotion && "transition-transform transition-opacity duration-300",
				prefersReducedMotion && "transition-none",
				isNavVisible
					? "translate-y-0 opacity-100"
					: "translate-y-[calc(100%+1.25rem)] opacity-0 pointer-events-none",
			)}
		>
			<LiquidGlass
				id={`floating-navbar-${navGlassId.replace(/:/g, "-")}`}
				{...getGlassPreset("navbar")}
				className="floating-navbar-shell"
				style={{ width: "100%", height: "auto" }}
			>
				<nav aria-label="Primary" className="floating-navbar">
					<div
						className="floating-navbar__primary"
						style={{ gridTemplateColumns: `repeat(${primaryItemCount}, minmax(0, 1fr))` }}
					>
						<FloatingNavItem
							icon={selectedCount >= 2 ? Trophy : CheckCircle}
							label={selectedCount >= 2 ? `Pick (${selectedCount})` : "Pick"}
							isCurrent={isHomeRoute && activeHomeTab === "pick"}
							isAccent={selectedCount >= 2}
							onClick={() => handleNavClick("pick")}
						/>

						<FloatingNavItem
							icon={BarChart3}
							label="Analyze"
							isCurrent={isAnalysisRoute}
							onClick={() => handleNavClick("analyze")}
						/>

						<FloatingNavItem
							icon={Lightbulb}
							label="Suggest"
							isCurrent={isHomeRoute && activeHomeTab === "suggest"}
							onClick={() => handleNavClick("suggest")}
						/>

						<FloatingNavItem
							icon={User}
							label={profileLabel}
							isCurrent={isHomeRoute && activeHomeTab === "profile"}
							onClick={() => handleNavClick("profile")}
							customIcon={
								isLoggedIn && avatarUrl ? (
									<img src={avatarUrl} alt={profileLabel} className="floating-navbar__avatar" />
								) : (
									<User
										className={cn(
											"h-5 w-5",
											isLoggedIn && isAdmin && "text-chart-4",
											isLoggedIn && !isAdmin && "text-primary",
										)}
									/>
								)
							}
						/>
					</div>

					<div className="floating-navbar__utility">
						<FloatingNavItem
							icon={isSwipeMode ? Layers : LayoutGrid}
							label={isSwipeMode ? "Swipe" : "Grid"}
							variant="utility"
							isPressed={isSwipeMode}
							ariaLabel={isSwipeMode ? "Swipe mode active" : "Grid mode active"}
							onClick={() => uiActions.setSwipeMode(!isSwipeMode)}
						/>
					</div>
				</nav>
			</LiquidGlass>
		</motion.div>
	);
}
