/**
 * @module TabNavigation
 * @description Simplified tab navigation for consolidated UI
 */

import { motion } from "framer-motion";
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

type Tab = "pick" | "suggest" | "profile" | "analyze";

interface TabItem {
	id: Tab;
	label: string;
	icon: any;
	href?: string;
}

interface TabNavigationProps {
	activeTab: "pick" | "suggest" | "profile";
	onTabChange: (tab: "pick" | "suggest" | "profile") => void;
	className?: string;
}

export function TabNavigation({ activeTab, onTabChange, className }: TabNavigationProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { tournament, user, ui, uiActions } = useAppStore();
	const { selectedNames } = tournament;
	const { isLoggedIn, name: userName, avatarUrl, isAdmin } = user;
	const { isSwipeMode } = ui;
	const { setSwipeMode } = uiActions;

	const selectedCount = selectedNames?.length || 0;
	const isTournamentActive = Boolean(tournament.names);
	const isComplete = tournament.isComplete;
	const isTournamentRoute = location.pathname === "/tournament";

	// Define tabs based on current state
	const getTabs = (): TabItem[] => {
		const baseTabs: TabItem[] = [
			{
				id: "pick",
				label: selectedCount >= 2 ? `Start (${selectedCount})` : "Pick Names",
				icon: selectedCount >= 2 ? Trophy : CheckCircle,
			},
			{
				id: "suggest",
				label: "Suggest",
				icon: Lightbulb,
			},
			{
				id: "profile",
				label: isLoggedIn ? userName?.split(" ")[0] || "Profile" : "Profile",
				icon: User,
			},
		];

		// Add analyze tab if tournament is complete
		if (isComplete) {
			baseTabs.splice(1, 0, {
				id: "analyze",
				label: "Analyze",
				icon: BarChart3,
			});
		}

		return baseTabs;
	};

	const tabs = getTabs();

	const handleTabClick = (tab: Tab) => {
		if (tab === "pick" && selectedCount >= 2) {
			// Start tournament
			if (selectedNames && selectedNames.length >= 2) {
				tournament.actions.setNames(selectedNames);
				navigate("/tournament");
			}
		} else if (tab === "analyze") {
			navigate("/analysis");
		} else {
			onTabChange(tab);
		}
	};

	// Don't show navigation on tournament route
	if (isTournamentRoute) {
		return null;
	}

	return (
		<div className={cn("tab-navigation", className)}>
			{/* Mode Toggle */}
			<div className="flex justify-center mb-6">
				<motion.button
					type="button"
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => setSwipeMode(!isSwipeMode)}
					className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-foreground/10 to-foreground/5 border border-border/30 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-gradient-to-r hover:from-foreground/20 hover:to-foreground/10 transition-all duration-300 shadow-sm hover:shadow-md"
				>
					{isSwipeMode ? <Layers size={16} /> : <LayoutGrid size={16} />}
					<span className="font-medium">{isSwipeMode ? "Swipe Mode" : "Grid Mode"}</span>
				</motion.button>
			</div>

			{/* Tab Navigation */}
			<div className="flex items-center justify-center bg-gradient-to-r from-background via-background/95 to-background backdrop-blur-sm rounded-2xl border border-border/20 p-1.5 shadow-xl shadow-foreground/5">
				{tabs.map((tab, index) => (
					<motion.button
						key={tab.id}
						type="button"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => handleTabClick(tab.id)}
						className={cn(
							"relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
							activeTab === tab.id
								? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25"
								: "text-foreground/70 hover:text-foreground hover:bg-foreground/10",
							tab.id === "pick" && selectedCount >= 2 && "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
						)}
					>
						<tab.icon size={16} className={cn(
							activeTab === tab.id && "text-primary-foreground",
							tab.id === "pick" && selectedCount >= 2 && "text-white"
						)} />
						<span className="hidden sm:inline font-medium">{tab.label}</span>
						<span className="sm:hidden font-medium">{tab.label.split(" ")[0]}</span>
						
						{/* Active indicator */}
						{activeTab === tab.id && (
							<motion.div
								layoutId="activeTab"
								className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl"
								transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
							/>
						)}
					</motion.button>
				))}
			</div>
		</div>
	);
}
