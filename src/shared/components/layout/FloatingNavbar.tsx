/**
 * @module FloatingNavbar
 * @description Simplified navigation for tournament completion flow only
 */

import { motion } from "framer-motion";
import type { ElementType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/basic";
import { CheckCircle, Trophy, BarChart3, Lightbulb, User, Layers, LayoutGrid } from "@/shared/lib/icons";
import useAppStore from "@/store/appStore";
import { getGlassPreset } from "./GlassPresets";
import LiquidGlass from "./LiquidGlass";
import { useState, useEffect } from "react";

type NavSection = "pick" | "suggest" | "profile" | "analyze";

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
  const baseClasses = cn(
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
  const { tournament, tournamentActions, user, userActions, ui, uiActions } = useAppStore();

  const [activeSection, setActiveSection] = useState<NavSection>("pick");
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const isHomeRoute = location.pathname === "/";
  const isTournamentRoute = location.pathname === "/tournament";
  const isAnalysisRoute = location.pathname === "/analysis";

  const { selectedNames } = tournament;
  const { isLoggedIn, userName, isAdmin, avatarUrl } = user;
  const { isSwipeMode } = ui;

  const selectedCount = selectedNames?.length || 0;
  const isTournamentActive = Boolean(tournament.names);
  const isComplete = tournament.isComplete;
  const profileLabel = isLoggedIn ? userName?.split(" ")[0] || "Profile" : "Profile";
  const primaryItemCount = Number(!isTournamentActive || isTournamentRoute) + 1 + 2;
  const navGlassId = cn("navbar", isHomeRoute ? "home" : "page");

  const handleStartTournament = () => {
    if (selectedNames && selectedNames.length >= 2) {
      tournamentActions.setNames(selectedNames);
      navigate("/tournament");
    }
  };

  const handleViewResults = () => {
    navigate("/analysis");
  };

  const scrollToSection = (key: NavSection) => {
    const element = document.getElementById(key);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleNavClick = (key: NavSection) => {
    scrollToSection(key);
  };

	useEffect(() => {
		if (!isHomeRoute) {
			return;
		}

		let rafId: number | null = null;
		const sections: NavSection[] = ["pick", "suggest", "profile"];

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
						{(!isTournamentActive || isTournamentRoute) && (
							<FloatingNavItem
								icon={selectedCount >= 2 && !isTournamentRoute ? Trophy : CheckCircle}
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
							isCurrent={isHomeRoute && activeSection === "profile"}
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
