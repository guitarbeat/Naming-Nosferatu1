/**
 * @module FluidNav
 * @description Fluid navigation component with expandable login panel
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/Providers";
import { useNameSuggestion } from "@/hooks/useNames";
import Button from "@/shared/components/layout/Button";
import { Input, Textarea } from "@/shared/components/layout/FormPrimitives";
import { cn, hapticNavTap, hapticTournamentStart } from "@/shared/lib/basic";
import {
	BarChart3,
	CheckCircle,
	Layers,
	LayoutGrid,
	Lightbulb,
	LogOut,
	Trophy,
	User,
} from "@/shared/lib/icons";
import useAppStore from "@/store/appStore";
import { AnimatedNavButton, NavButton } from "./NavButton";

// Map nav keys to Section IDs
const keyToId: Record<string, string> = {
	pick: "pick",
	play: "play",
	analyze: "analysis",
	suggest: "suggest",
	profile: "profile",
};

type UnifiedButtonState = {
	label: string;
	icon: typeof CheckCircle;
	action: "scroll-top" | "start" | "navigate-pick";
	highlight: boolean;
	disabled: boolean;
};

/**
 * Get the unified button state based on current context
 */
const getUnifiedButtonState = (
	activeSection: string,
	selectedCount: number,
	isTournamentActive: boolean,
	isComplete: boolean,
): UnifiedButtonState => {
	const isOnPickSection = activeSection === "pick";
	const hasEnoughNames = selectedCount >= 2;

	// If tournament is complete, show Analyze
	if (isComplete) {
		return {
			label: "Analyze",
			icon: BarChart3,
			action: "navigate-pick",
			highlight: false,
			disabled: false,
		};
	}

	// If tournament is active, show Pick to go back
	if (isTournamentActive) {
		return {
			label: "Pick",
			icon: CheckCircle,
			action: "navigate-pick",
			highlight: false,
			disabled: false,
		};
	}

	// On pick section with enough names - ready to start
	if (isOnPickSection && hasEnoughNames) {
		return {
			label: `Start (${selectedCount})`,
			icon: Trophy,
			action: "start",
			highlight: true,
			disabled: false,
		};
	}

	// On pick section without enough names
	if (isOnPickSection) {
		return {
			label: "Pick Names",
			icon: CheckCircle,
			action: "scroll-top",
			highlight: false,
			disabled: false,
		};
	}

	// On other sections - show Start if ready, otherwise Pick
	if (hasEnoughNames) {
		return {
			label: `Start (${selectedCount})`,
			icon: Trophy,
			action: "start",
			highlight: true,
			disabled: false,
		};
	}

	return {
		label: "Pick",
		icon: CheckCircle,
		action: "navigate-pick",
		highlight: false,
		disabled: false,
	};
};

/**
 * Fluid Bottom Navigation Bar
 * Renders as a fluid, percentage-width floating dock on all screen sizes
 */
export function FluidNav() {
	const appStore = useAppStore();
	const navigate = useNavigate();
	const location = useLocation();
	const { login, logout } = useAuth();
	const { tournament, tournamentActions, user, ui, uiActions, userActions } = appStore;
	const { selectedNames } = tournament;
	const { isLoggedIn, name: userName, avatarUrl, isAdmin } = user;
	const { isSwipeMode } = ui;
	const { setSwipeMode } = uiActions;
	const [activeSection, setActiveSection] = useState("pick");
	const [isLoginExpanded, setIsLoginExpanded] = useState(false);
	const [isSuggestExpanded, setIsSuggestExpanded] = useState(false);
	const [editedName, setEditedName] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const isAnalysisRoute = location.pathname === "/analysis";
	const isTournamentRoute = location.pathname === "/tournament";

	// Name suggestion hook
	const { values, isSubmitting, handleChange, handleSubmit, globalError, successMessage } =
		useNameSuggestion({
			onSuccess: () => {
				setTimeout(() => setIsSuggestExpanded(false), 2000);
			},
		});

	const { isComplete, names: tournamentNames } = tournament;
	const isTournamentActive = !!tournamentNames;
	const selectedCount = selectedNames?.length || 0;

	// Get unified button state
	const buttonState = getUnifiedButtonState(
		activeSection,
		selectedCount,
		isTournamentActive,
		isComplete,
	);

	const handleStartTournament = () => {
		hapticTournamentStart();
		if (selectedNames && selectedNames.length >= 2) {
			tournamentActions.setNames(selectedNames);
			navigate("/tournament");
		}
	};

	const handleLoginSave = async () => {
		if (!editedName.trim()) {
			return;
		}
		setIsSaving(true);
		try {
			// Use auth adapter login
			const success = await login({ name: editedName.trim() });
			if (success) {
				// Also update store for compatibility
				userActions.login(editedName.trim());
				setIsLoginExpanded(false);
				setEditedName("");
			}
		} catch (err) {
			console.error("Failed to login:", err);
		} finally {
			setIsSaving(false);
		}
	};

	const handleLogout = async () => {
		try {
			await logout();
			userActions.logout();
			setIsLoginExpanded(false);
		} catch (err) {
			console.error("Failed to logout:", err);
		}
	};

	const handleProfileClick = () => {
		setIsLoginExpanded(!isLoginExpanded);
		if (isSuggestExpanded) {
			setIsSuggestExpanded(false);
		}
	};

	const handleSuggestClick = () => {
		setIsSuggestExpanded(!isSuggestExpanded);
		if (isLoginExpanded) {
			setIsLoginExpanded(false);
		}
	};

	const handleSuggestSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await handleSubmit();
	};

	const handleUnifiedButtonClick = () => {
		if (navigator.vibrate) {
			navigator.vibrate(10);
		}

		switch (buttonState.action) {
			case "start":
				handleStartTournament();
				break;
			case "navigate-pick":
				if (isAnalysisRoute) {
					navigate("/");
				} else {
					document.getElementById("pick")?.scrollIntoView({ behavior: "smooth" });
				}
				setActiveSection("pick");
				break;
			case "scroll-top":
				document.getElementById("pick")?.scrollIntoView({ behavior: "smooth" });
				break;
		}
	};

	// Navigate or scroll to section, toggle visibility if already active
	const handleNavClick = (key: string) => {
		hapticNavTap();
		if (key === "analyze") {
			navigate("/analysis");
			setActiveSection("analysis");
			return;
		}
		if (key === "pick" && isAnalysisRoute) {
			navigate("/");
			setActiveSection("pick");
			return;
		}
		// Suggest and Profile only exist on home; navigate first if on analysis
		if ((key === "suggest" || key === "profile") && isAnalysisRoute) {
			const id = keyToId[key];
			if (!id) {
				return;
			}
			navigate("/");
			setActiveSection(id);
			requestAnimationFrame(() => {
				setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
			});
			return;
		}
		const id = keyToId[key];
		if (id) {
			const element = document.getElementById(id);
			if (!element) {
				return;
			}

			// If clicking the active section, toggle its visibility
			if (activeSection === id) {
				const isHidden = element.getAttribute("data-hidden") === "true";
				element.setAttribute("data-hidden", String(!isHidden));
				if (isHidden) {
					// Showing - remove class and scroll to it
					element.style.maxHeight = `${element.scrollHeight}px`;
					element.style.opacity = "1";
					element.style.overflow = "visible";
					setTimeout(() => {
						element.style.maxHeight = "";
					}, 300);
					element.scrollIntoView({ behavior: "smooth" });
				} else {
					// Hiding - add class for animation
					element.style.maxHeight = `${element.scrollHeight}px`;
					requestAnimationFrame(() => {
						element.style.maxHeight = "0";
						element.style.opacity = "0";
						element.style.overflow = "hidden";
					});
				}
			} else {
				// Otherwise, scroll to it and make sure it's visible
				element.scrollIntoView({ behavior: "smooth" });
				setActiveSection(id);
				element.setAttribute("data-hidden", "false");
				element.style.maxHeight = "";
				element.style.opacity = "1";
				element.style.overflow = "visible";
			}
		}
	};

	// Sync active section with route (analysis is route-based; home uses scroll)
	useEffect(() => {
		if (location.pathname === "/analysis") {
			setActiveSection("analysis");
		} else if (location.pathname === "/") {
			setActiveSection("pick");
		}
	}, [location.pathname]);

	// Track active section on scroll (home route only)
	useEffect(() => {
		if (location.pathname !== "/" || isAnalysisRoute) {
			return;
		}
		let rafId: number | null = null;
		const handleScroll = () => {
			if (rafId) {
				return;
			}
			rafId = requestAnimationFrame(() => {
				rafId = null;
				const sections = ["pick", "play", "suggest", "profile"];
				let current = "pick";
				let minDistance = Infinity;

				for (const id of sections) {
					const element = document.getElementById(id);
					if (element) {
						const rect = element.getBoundingClientRect();
						const distance = Math.abs(rect.top);
						if (distance < minDistance && distance < window.innerHeight * 0.6) {
							minDistance = distance;
							current = id;
						}
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
	}, [location.pathname, isAnalysisRoute]);

	const isActive = (key: string) => {
		const targetId = keyToId[key];
		return activeSection === targetId;
	};

	// Hide navbar on tournament page (after all hooks)
	if (isTournamentRoute) {
		return null;
	}

	const IconComponent = buttonState.icon;

	return (
		<>
			<motion.nav
				className={cn(
					"fixed z-[100] transition-all duration-500 ease-out",
					"h-auto py-3 px-4 md:px-6",
					"bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2",
					"w-[95%] max-w-[500px]",
					"backdrop-blur-xl bg-black/60 border border-white/20 rounded-2xl shadow-2xl",
				)}
				initial={{ y: 100, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ type: "spring", stiffness: 260, damping: 20 }}
			>
				<div className="flex items-center justify-center gap-2">
					{/* Unified Pick/Start Button - Uses AnimatedNavButton for pulse effect */}
					<AnimatedNavButton
						id="pick"
						icon={IconComponent}
						label={buttonState.label}
						isActive={isActive("pick")}
						onClick={handleUnifiedButtonClick}
						highlight={buttonState.highlight}
						disabled={buttonState.disabled}
						animateScale={buttonState.highlight}
						className="flex-1 "
						customIcon={
							<AnimatePresence mode="wait">
								<motion.div
									key={buttonState.icon.name}
									initial={{ scale: 0.8, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0.8, opacity: 0 }}
								>
									<IconComponent
										className={cn("w-5 h-5", buttonState.highlight && "text-cyan-400")}
										aria-hidden={true}
									/>
								</motion.div>
							</AnimatePresence>
						}
					/>

					{/* View Mode Toggle - Shows when on pick/play section and no tournament is active */}
					{(isActive("pick") || isActive("play")) && !isTournamentActive && (
						<motion.button
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							type="button"
							onClick={() => setSwipeMode(!isSwipeMode)}
							className={cn(
								"flex flex-row items-center justify-center gap-2 p-2 rounded-xl transition-all flex-1",
								"text-white/70 hover:text-white hover:bg-white/10",
								isSwipeMode && "bg-purple-500/20 text-purple-400",
							)}
							aria-label={isSwipeMode ? "Switch to grid view" : "Switch to swipe view"}
						>
							<AnimatePresence mode="wait">
								<motion.div
									key={isSwipeMode ? "swipe" : "grid"}
									initial={{ rotate: -90, opacity: 0 }}
									animate={{ rotate: 0, opacity: 1 }}
									exit={{ rotate: 90, opacity: 0 }}
									transition={{ duration: 0.15 }}
								>
									{isSwipeMode ? (
										<Layers className="w-5 h-5" aria-hidden={true} />
									) : (
										<LayoutGrid className="w-5 h-5" aria-hidden={true} />
									)}
								</motion.div>
							</AnimatePresence>
							<span className="text-xs font-medium">
								{isSwipeMode ? "Swipe View" : "Grid View"}
							</span>
						</motion.button>
					)}

					{/* Analyze Button - Only shows when tournament complete */}
					{isComplete && (
						<NavButton
							id="analyze"
							icon={BarChart3}
							label="Analyze"
							isActive={isActive("analyze")}
							onClick={() => handleNavClick("analyze")}
							className="flex-1 "
						/>
					)}

					{/* Suggest Button */}
					<NavButton
						id="suggest"
						icon={Lightbulb}
						label="Add More!"
						isActive={isSuggestExpanded}
						onClick={handleSuggestClick}
						ariaLabel="Suggest a name"
						className="flex-1 "
					/>

					{/* Profile/Login Button */}
					<NavButton
						id="profile"
						icon={User}
						label={
							isLoggedIn ? `${userName?.split(" ")[0] || "You"}${isAdmin ? " 👑" : ""}` : "Login"
						}
						isActive={isLoginExpanded}
						onClick={handleProfileClick}
						ariaLabel={isLoggedIn ? "Profile" : "Enter your name"}
						className="flex-1 "
						customIcon={
							isLoggedIn && avatarUrl ? (
								<div className="w-5 h-5 rounded-full overflow-hidden border border-white/20">
									<img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
								</div>
							) : (
								<User
									className={cn("w-5 h-5", isLoggedIn && "text-purple-400")}
									aria-hidden={true}
								/>
							)
						}
						badge={
							isLoggedIn ? (
								<div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-black" />
							) : undefined
						}
					/>
				</div>
			</motion.nav>

			{/* Expandable Login Panel */}
			<AnimatePresence>
				{isLoginExpanded && (
					<motion.div
						initial={{ y: 100, opacity: 0, scale: 0.9 }}
						animate={{ y: 0, opacity: 1, scale: 1 }}
						exit={{ y: 100, opacity: 0, scale: 0.9 }}
						transition={{ type: "spring", stiffness: 300, damping: 30 }}
						className={cn(
							"fixed z-[99] bottom-20 left-1/2 -translate-x-1/2",
							"w-[90vw] h-[60vh] max-w-2xl",
							"bg-black/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl",
							"p-8 overflow-hidden",
						)}
					>
						{isLoggedIn ? (
							<div className="flex flex-col items-center justify-center h-full space-y-6">
								<div className="flex flex-col items-center gap-4">
									{avatarUrl && (
										<div className="w-20 h-20 rounded-full overflow-hidden border-3 border-purple-500/40 shadow-lg">
											<img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
										</div>
									)}
									<div className="text-center">
										<h3 className="text-2xl font-bold text-white">{userName}</h3>
										<p className="text-base text-white/70">Successfully logged in</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="large"
									onClick={handleLogout}
									className="w-full max-w-xs flex items-center justify-center gap-3 text-red-400 hover:text-red-300 py-4 text-lg"
								>
									<LogOut size={20} />
									Logout
								</Button>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center h-full space-y-8">
								<div className="text-center space-y-3">
									<h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
										Who are you?
									</h3>
									<p className="text-lg text-white/70 max-w-md">
										Enter your name to track rankings and compete with others
									</p>
								</div>
								<div className="w-full max-w-md space-y-6">
									<Input
										type="text"
										value={editedName}
										onChange={(e) => setEditedName(e.target.value)}
										placeholder="Enter your awesome name..."
										onKeyDown={(e) => e.key === "Enter" && handleLoginSave()}
										className="w-full h-14 px-6 text-lg font-medium"
										autoFocus={true}
									/>
									<Button
										variant="gradient"
										size="xl"
										onClick={handleLoginSave}
										disabled={!editedName.trim() || isSaving}
										loading={isSaving}
										className="w-full h-14 text-lg font-semibold"
									>
										{isSaving ? "Connecting..." : "Let's Go!"}
									</Button>
								</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			{/* Expandable Suggest Panel */}
			<AnimatePresence>
				{isSuggestExpanded && (
					<motion.div
						initial={{ y: 100, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 100, opacity: 0 }}
						transition={{ type: "spring", stiffness: 300, damping: 30 }}
						className={cn(
							"fixed z-[99] bottom-24 left-1/2 -translate-x-1/2",
							"w-[95%] max-w-md",
							"bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl",
							"p-6",
						)}
					>
						<form onSubmit={handleSuggestSubmit} className="space-y-4">
							<div className="text-center space-y-1">
								<h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
									Got a name?
								</h3>
								<p className="text-sm text-white/60">Share your brilliant idea</p>
							</div>
							<div className="space-y-3">
								<Input
									type="text"
									value={values.name}
									onChange={(e) => handleChange("name", e.target.value)}
									placeholder="Name..."
									className="w-full h-12 px-4 font-medium"
									autoFocus={true}
								/>
								<Textarea
									value={values.description}
									onChange={(e) => handleChange("description", e.target.value)}
									placeholder="Why is it perfect?"
									rows={3}
									className="w-full px-4 py-3 font-medium resize-none"
								/>
								{globalError && (
									<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm font-medium text-center">
										{globalError}
									</div>
								)}
								{successMessage && (
									<div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-200 text-sm font-medium text-center">
										{successMessage}
									</div>
								)}
								<Button
									type="submit"
									variant="gradient"
									size="xl"
									disabled={!values.name.trim() || !values.description.trim() || isSubmitting}
									loading={isSubmitting}
									className="w-full"
								>
									Submit
								</Button>
							</div>
						</form>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
