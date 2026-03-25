/**
 * @module FloatingNavbar
 * @description Accessible, bottom-fixed primary navigation for key app flows.
 */

import { motion } from "framer-motion";
import type { ElementType, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn, hapticNavTap, hapticTournamentStart } from "@/shared/lib/basic";
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
import { getGlassPreset } from "./GlassPresets";
import LiquidGlass from "./LiquidGlass";

type NavSection = "pick" | "suggest";

const keyToId: Record<NavSection, string> = {
	pick: "pick",
	suggest: "suggest",
};

function useIsMobile() {
	const [isMobile, setIsMobile] = useState(() =>
		typeof window !== "undefined"
			? window.matchMedia("(max-width: 768px)").matches
			: false,
	);
	useEffect(() => {
		const mql = window.matchMedia("(max-width: 768px)");
		const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);
	return isMobile;
}

function FloatingNavItem({
	icon: Icon,
	label,
	variant = "primary",
	isCurrent = false,
	isPressed = false,
	isAccent = false,
	onClick,
	customIcon,
	className,
	ariaLabel,
}: {
	icon: ElementType;
	label: string;
	variant?: "primary" | "utility";
	isCurrent?: boolean;
	isPressed?: boolean;
	isAccent?: boolean;
	onClick: () => void;
	customIcon?: ReactNode;
	className?: string;
	ariaLabel?: string;
}) {
	return (
		<motion.button
			type="button"
			whileTap={{ scale: 0.97 }}
			className={cn(
				"floating-navbar__item",
				variant === "utility"
					? "floating-navbar__item--utility"
					: "floating-navbar__item--primary",
				isAccent && "floating-navbar__item--accent",
				className,
			)}
			onClick={onClick}
			aria-current={variant === "primary" && isCurrent ? "location" : undefined}
			aria-pressed={variant === "utility" ? isPressed : undefined}
			aria-label={ariaLabel ?? label}
		>
			<span className="floating-navbar__icon" aria-hidden="true">
				{customIcon || <Icon className="h-5 w-5 sm:h-6 sm:w-6" />}
			</span>
			<span
				className={cn(
					"floating-navbar__label",
					variant === "utility" && "floating-navbar__label--utility",
				)}
			>
				{label}
			</span>
		</motion.button>
	);
}

export function FloatingNavbar() {
	const appStore = useAppStore();
	const navigate = useNavigate();
	const location = useLocation();
	const isMobile = useIsMobile();
	const { tournament, tournamentActions, user, ui, uiActions } = appStore;
	const { selectedNames } = tournament;
	const { isLoggedIn, name: userName, avatarUrl, isAdmin } = user;
	const { isSwipeMode } = ui;
	const { setSwipeMode } = uiActions;
	const [activeSection, setActiveSection] = useState<NavSection>("pick");
	const [isNavVisible, setIsNavVisible] = useState(true);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
	const navGlassId = useId();

	const isHomeRoute = location.pathname === "/";
	const isAnalysisRoute = location.pathname === "/analysis";
	const isTournamentRoute = location.pathname === "/tournament";

	const selectedCount = selectedNames?.length || 0;
	const isTournamentActive = Boolean(tournament.names);
	const isComplete = tournament.isComplete;
	const profileLabel = isLoggedIn
		? userName?.split(" ")[0] || "Profile"
		: "Profile";
	// On mobile, hide utility toggle (it moves into the picker surface)
	const primaryItemCount =
		Number(!isTournamentActive || isTournamentRoute) + 1 + 2;

	if (isTournamentRoute) {
		return null;
	}

	const scrollToSection = (key: NavSection) => {
		const id = keyToId[key];
		const target = document.getElementById(id);
		if (!target) {
			window.scrollTo({
				top: 0,
				behavior: prefersReducedMotion ? "auto" : "smooth",
			});
			return;
		}

		target.scrollIntoView({
			behavior: prefersReducedMotion ? "auto" : "smooth",
			block: "start",
		});
	};

	const handleStartTournament = () => {
		hapticTournamentStart();
		if (selectedNames && selectedNames.length >= 2) {
			tournamentActions.setNames(selectedNames);
			navigate("/tournament");
		}
	};

	const handleNavClick = (key: NavSection | "analyze") => {
		hapticNavTap();
		if (key === "analyze") {
			navigate("/analysis");
			return;
		}

		if (!isHomeRoute) {
			navigate("/");
			window.setTimeout(() => scrollToSection(key), 120);
			return;
		}

		scrollToSection(key);
	};

	useEffect(() => {
		if (!isHomeRoute) {
			return;
		}

		let rafId: number | null = null;
		const sections: NavSection[] = ["pick", "suggest"];

		const handleScroll = () => {
			if (rafId) {
				return;
			}
			rafId = requestAnimationFrame(() => {
				rafId = null;
				let current: NavSection = "pick";
				let minDistance = Number.POSITIVE_INFINITY;

				for (const section of sections) {
					const element = document.getElementById(section);
					if (!element) {
						continue;
					}
					const rect = element.getBoundingClientRect();
					const distance = Math.abs(rect.top);
					if (distance < minDistance && rect.top < window.innerHeight * 0.7) {
						minDistance = distance;
						current = section;
					}
				}
				setActiveSection(current);
			});
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll();
		return () => {
			window.removeEventListener("scroll", handleScroll);
			if (rafId) {
				cancelAnimationFrame(rafId);
			}
		};
	}, [isHomeRoute]);

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

	return (
		<motion.div
			className={cn(
				"floating-navbar-frame",
				!prefersReducedMotion &&
					"transition-transform transition-opacity duration-300",
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
						style={{
							gridTemplateColumns: `repeat(${primaryItemCount}, minmax(0, 1fr))`,
						}}
					>
						{(!isTournamentActive || isTournamentRoute) && (
							<FloatingNavItem
								icon={
									selectedCount >= 2 && !isTournamentRoute
										? Trophy
										: CheckCircle
								}
								label={
									isTournamentRoute
										? "Home"
										: selectedCount >= 2
											? `Start (${selectedCount})`
											: "Pick Names"
								}
								isCurrent={isHomeRoute && activeSection === "pick"}
								isAccent={selectedCount >= 2 && !isTournamentRoute}
								onClick={() => {
									if (isTournamentRoute) {
										navigate("/");
									} else if (selectedCount >= 2) {
										handleStartTournament();
									} else {
										handleNavClick("pick");
									}
								}}
							/>
						)}

						<FloatingNavItem
							icon={BarChart3}
							label="Analyze"
							isCurrent={isAnalysisRoute}
							onClick={() => handleNavClick("analyze")}
						/>

						<FloatingNavItem
							icon={Lightbulb}
							label="Suggest"
							isCurrent={isHomeRoute && activeSection === "suggest"}
							onClick={() => handleNavClick("suggest")}
						/>

						<FloatingNavItem
							icon={User}
							label={profileLabel}
							isCurrent={ui.isProfileOpen}
							onClick={() => uiActions.setProfileOpen(true)}
							customIcon={
								isLoggedIn && avatarUrl ? (
									<img
										src={avatarUrl}
										alt={profileLabel}
										className="floating-navbar__avatar"
									/>
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

					{/* Utility toggle hidden on mobile via CSS, moved into picker surface */}
					<div className="floating-navbar__utility">
						<FloatingNavItem
							icon={isSwipeMode ? Layers : LayoutGrid}
							label={isSwipeMode ? "Swipe" : "Grid"}
							variant="utility"
							isPressed={isSwipeMode}
							ariaLabel={isSwipeMode ? "Swipe mode active" : "Grid mode active"}
							onClick={() => setSwipeMode(!isSwipeMode)}
						/>
					</div>
				</nav>
			</LiquidGlass>
		</motion.div>
	);
}
