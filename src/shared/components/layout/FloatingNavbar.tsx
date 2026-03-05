/**
 * @module FloatingNavbar
 * @description Accessible, bottom-fixed primary navigation for key app flows.
 */

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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

type NavSection = "pick" | "suggest" | "profile";

const keyToId: Record<NavSection, string> = {
	pick: "pick",
	suggest: "suggest",
	profile: "profile",
};

function FloatingNavItem({
	icon: Icon,
	label,
	isActive = false,
	onClick,
	customIcon,
	className,
}: {
	icon: any;
	label: string;
	isActive?: boolean;
	onClick: () => void;
	customIcon?: React.ReactNode;
	className?: string;
}) {
	return (
		<motion.button
			type="button"
			whileTap={{ scale: 0.97 }}
			className={cn(
				"group flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-transparent p-2.5 text-foreground/75 transition-all duration-200 ease-in-out hover:bg-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50",
				isActive && "bg-foreground/15 text-foreground",
				className,
			)}
			onClick={onClick}
			aria-pressed={isActive}
			aria-label={label}
		>
			<span className="flex shrink-0 items-center justify-center">
				{customIcon || <Icon className="h-5 w-5 sm:h-6 sm:w-6" />}
			</span>
			<span className="hidden whitespace-nowrap text-xs font-semibold sm:inline sm:text-sm">
				{label}
			</span>
		</motion.button>
	);
}

export function FloatingNavbar() {
	const appStore = useAppStore();
	const navigate = useNavigate();
	const location = useLocation();
	const { tournament, tournamentActions, user, ui, uiActions } = appStore;
	const { selectedNames } = tournament;
	const { isLoggedIn, name: userName, avatarUrl, isAdmin } = user;
	const { isSwipeMode } = ui;
	const { setSwipeMode } = uiActions;
	const [activeSection, setActiveSection] = useState<NavSection>("pick");
	const [isNavVisible, setIsNavVisible] = useState(true);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	const isHomeRoute = location.pathname === "/";
	const isAnalysisRoute = location.pathname === "/analysis";
	const isTournamentRoute = location.pathname === "/tournament";

	const selectedCount = selectedNames?.length || 0;
	const isTournamentActive = Boolean(tournament.names);
	const isComplete = tournament.isComplete;
	const profileLabel = isLoggedIn ? userName?.split(" ")[0] || "Profile" : "Profile";

	const scrollToSection = (key: NavSection) => {
		const id = keyToId[key];
		const target = document.getElementById(id);
		if (!target) {
			window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
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

	if (isTournamentRoute) {
		return null;
	}

	return (
		<nav
			aria-label="Primary"
			className={cn(
				"fixed bottom-5 left-1/2 z-[100] flex max-w-[95vw] -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-foreground/10 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md sm:gap-1.5",
				!prefersReducedMotion && "transition-transform transition-opacity duration-300",
				prefersReducedMotion && "transition-none",
				isNavVisible
					? "translate-y-0 opacity-100"
					: "translate-y-[calc(100%+1.25rem)] opacity-0 pointer-events-none",
			)}
		>
			{!isComplete && !isTournamentActive && (
				<FloatingNavItem
					icon={selectedCount >= 2 ? Trophy : CheckCircle}
					label={selectedCount >= 2 ? `Start (${selectedCount})` : "Pick Names"}
					isActive={isHomeRoute && activeSection === "pick"}
					onClick={() => (selectedCount >= 2 ? handleStartTournament() : handleNavClick("pick"))}
					className={cn(selectedCount >= 2 && "text-chart-4 hover:text-chart-4/80")}
				/>
			)}

			{isComplete && (
				<FloatingNavItem
					icon={BarChart3}
					label="Analyze"
					isActive={isAnalysisRoute}
					onClick={() => handleNavClick("analyze")}
				/>
			)}

			<FloatingNavItem
				icon={isSwipeMode ? Layers : LayoutGrid}
				label={isSwipeMode ? "Grid Mode" : "Swipe Mode"}
				onClick={() => setSwipeMode(!isSwipeMode)}
			/>

			<FloatingNavItem
				icon={Lightbulb}
				label="Suggest"
				isActive={isHomeRoute && activeSection === "suggest"}
				onClick={() => handleNavClick("suggest")}
			/>

			<FloatingNavItem
				icon={User}
				label={profileLabel}
				isActive={isHomeRoute && activeSection === "profile"}
				onClick={() => handleNavClick("profile")}
				customIcon={
					isLoggedIn && avatarUrl ? (
						<img
							src={avatarUrl}
							alt={profileLabel}
							className="h-6 w-6 rounded-full border border-border object-cover"
						/>
					) : (
						<User
							className={cn(
								"h-6 w-6",
								isLoggedIn && isAdmin && "text-chart-4",
								isLoggedIn && !isAdmin && "text-primary",
							)}
						/>
					)
				}
			/>
		</nav>
	);
}
