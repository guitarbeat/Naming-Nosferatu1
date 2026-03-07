/**
 * @module FloatingNavbar
 * @description Accessible, bottom-fixed primary navigation for key app flows.
 */

import { motion } from "framer-motion";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn, hapticNavTap, hapticTournamentStart } from "@/shared/lib/basic";
import {
	BarChart3,
	CheckCircle,
	Layers,
	LayoutGrid,
	Lightbulb,
	Lock,
	Trophy,
	User,
} from "@/shared/lib/icons";
import useAppStore from "@/store/appStore";

type NavSection = "pick" | "suggest" | "profile";
const NavbarFxCanvas = lazy(() =>
	import("@/shared/components/layout/NavbarFxCanvas").then((module) => ({
		default: module.NavbarFxCanvas,
	})),
);

const keyToId: Record<NavSection, string> = {
	pick: "pick",
	suggest: "suggest",
	profile: "profile",
};

function isTypingTarget(target: EventTarget | null): boolean {
	const element = target as HTMLElement | null;
	return Boolean(
		element?.tagName === "INPUT" ||
			element?.tagName === "TEXTAREA" ||
			element?.tagName === "SELECT" ||
			element?.isContentEditable,
	);
}

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
				"group flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-transparent p-2.5 text-foreground/75 transition-all duration-200 ease-in-out hover:bg-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 sm:flex-none",
				isActive && "bg-foreground/15 text-foreground",
				className,
			)}
			onClick={onClick}
			aria-pressed={isActive}
			aria-label={label}
			title={label}
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
	const [shouldRenderFx, setShouldRenderFx] = useState(false);

	const isHomeRoute = location.pathname === "/";
	const isAnalysisRoute = location.pathname === "/analysis";
	const isAdminRoute = location.pathname === "/admin";
	const isTournamentRoute = location.pathname === "/tournament";

	const selectedCount = selectedNames?.length || 0;
	const isTournamentActive = Boolean(tournament.names);
	const isComplete = tournament.isComplete;
	const profileLabel = isLoggedIn ? userName?.split(" ")[0] || "Profile" : "Profile";
	const primaryLabel =
		isTournamentActive && !isComplete
			? "Resume"
			: isAnalysisRoute
				? "New Bracket"
				: selectedCount >= 2
					? `Start (${selectedCount})`
					: "Pick Names";

	const scrollToSection = useCallback(
		(key: NavSection) => {
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
		},
		[prefersReducedMotion],
	);

	const handleStartTournament = useCallback(() => {
		hapticTournamentStart();
		if (selectedNames && selectedNames.length >= 2) {
			tournamentActions.setNames(selectedNames);
			navigate("/tournament");
		}
	}, [navigate, selectedNames, tournamentActions]);

	const handleNavClick = useCallback(
		(key: NavSection | "analyze") => {
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
		},
		[isHomeRoute, navigate, scrollToSection],
	);

	const handlePrimaryAction = useCallback(() => {
		hapticNavTap();
		if (isTournamentActive && !isComplete) {
			navigate("/tournament");
			return;
		}
		if (isAnalysisRoute) {
			navigate("/");
			window.setTimeout(() => scrollToSection("pick"), 120);
			return;
		}
		if (selectedCount >= 2) {
			handleStartTournament();
			return;
		}
		handleNavClick("pick");
	}, [
		handleNavClick,
		handleStartTournament,
		isAnalysisRoute,
		isComplete,
		isTournamentActive,
		navigate,
		scrollToSection,
		selectedCount,
	]);

	const toggleViewMode = useCallback(() => {
		setSwipeMode(!isSwipeMode);
	}, [isSwipeMode, setSwipeMode]);

	const handleAdminOpen = useCallback(() => {
		hapticNavTap();
		navigate("/admin");
	}, [navigate]);

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
		if (prefersReducedMotion) {
			setShouldRenderFx(false);
			return;
		}
		const desktopMediaQuery = window.matchMedia("(min-width: 768px)");
		const lowPowerMode = Boolean(
			(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
		);
		const cpuThreads = navigator.hardwareConcurrency ?? 4;
		setShouldRenderFx(desktopMediaQuery.matches && !lowPowerMode && cpuThreads >= 6);

		const onChange = () => {
			setShouldRenderFx(desktopMediaQuery.matches && !lowPowerMode && cpuThreads >= 6);
		};

		desktopMediaQuery.addEventListener("change", onChange);
		return () => desktopMediaQuery.removeEventListener("change", onChange);
	}, [prefersReducedMotion]);

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

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (isTypingTarget(event.target)) {
				return;
			}

			if (event.key === "1") {
				handlePrimaryAction();
				return;
			}
			if (event.key === "2") {
				toggleViewMode();
				return;
			}
			if (event.key === "3") {
				handleNavClick("suggest");
				return;
			}
			if (event.key === "4") {
				handleNavClick("profile");
				return;
			}
			if (event.key === "5") {
				if (isAdmin) {
					handleAdminOpen();
					return;
				}
				if (isComplete) {
					handleNavClick("analyze");
				}
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handlePrimaryAction, handleNavClick, handleAdminOpen, isAdmin, isComplete, toggleViewMode]);

	if (isTournamentRoute) {
		return null;
	}

	return (
		<div
			style={{
				bottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))",
			}}
			className={cn(
				"pointer-events-none fixed inset-x-0 z-[100] flex justify-center px-2 sm:px-3",
				!prefersReducedMotion && "transition-transform transition-opacity duration-300",
				prefersReducedMotion && "transition-none",
				isNavVisible
					? "translate-y-0 opacity-100"
					: "translate-y-[calc(100%+1.25rem)] opacity-0 pointer-events-none",
			)}
		>
			<nav
				aria-label="Primary"
				className="pointer-events-auto relative isolate flex min-h-[var(--mobile-nav-height)] w-full max-w-[46rem] items-center gap-1 overflow-x-auto rounded-full border border-border/80 bg-black/45 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md sm:gap-1.5"
			>
				{!prefersReducedMotion && (
					<>
						{shouldRenderFx && (
							<Suspense fallback={null}>
								<NavbarFxCanvas className="opacity-80" />
							</Suspense>
						)}
						<motion.div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-35"
							style={{
								backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 0.8px, transparent 0.8px)",
								backgroundSize: "14px 14px",
							}}
							animate={{ backgroundPosition: ["0px 0px", "14px 14px"] }}
							transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
						/>
					</>
				)}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-[radial-gradient(110%_90%_at_50%_-20%,rgba(255,255,255,0.18)_0%,transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.1),rgba(0,0,0,0.3))]"
				/>
				<div className="relative z-10 flex w-full items-center gap-1 sm:gap-1.5">
					<FloatingNavItem
						icon={isTournamentActive && !isComplete ? Trophy : CheckCircle}
						label={primaryLabel}
						isActive={isHomeRoute && activeSection === "pick"}
						onClick={handlePrimaryAction}
						className={cn(selectedCount >= 2 && "text-chart-4 hover:text-chart-4/80")}
					/>

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
						onClick={toggleViewMode}
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

					{isAdmin && (
						<FloatingNavItem
							icon={Lock}
							label="Admin"
							isActive={isAdminRoute}
							onClick={handleAdminOpen}
						/>
					)}
				</div>
			</nav>
		</div>
	);
}
