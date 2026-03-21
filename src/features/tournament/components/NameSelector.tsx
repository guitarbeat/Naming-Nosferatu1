/**
 * @module NameSelector
 * @description Name selection component with grid and swipe modes, showing cat images from Supabase
 */

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/app/providers/Providers";
import { useAdminActionConfirmation } from "@/features/tournament/hooks/useAdminActionConfirmation";
import Button, { getButtonClassName } from "@/shared/components/layout/Button";
import { Card } from "@/shared/components/layout/Card";
import CatImage from "@/shared/components/layout/CatImage";
import { CollapsibleContent } from "@/shared/components/layout/CollapsibleHeader";
import { ConfirmDialog } from "@/shared/components/layout/ConfirmDialog";
import { Loading } from "@/shared/components/layout/Feedback";
import { Lightbox } from "@/shared/components/layout/Lightbox";
import { useCollapsible, useNamesCache } from "@/shared/hooks";
import {
	getActiveNames,
	getHiddenNames,
	getLockedNames,
	getRandomCatImage,
	isNameHidden,
	isNameLocked,
	matchesNameSearchTerm,
} from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import {
	Check,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Eye,
	EyeOff,
	Heart,
	Shuffle,
	Undo2,
	X,
	ZoomIn,
} from "@/shared/lib/icons";
import {
	adminNamesAPI,
	coreAPI,
	hiddenNamesAPI,
	isUsingFallbackData,
} from "@/shared/services/supabase/api";
import type { IdType, NameItem } from "@/shared/types";
import useAppStore from "@/store/appStore";

const SWIPE_OFFSET_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;

const areIdSetsEqual = (a: Set<IdType>, b: Set<IdType>) => {
	if (a.size !== b.size) {
		return false;
	}

	for (const id of a) {
		if (!b.has(id)) {
			return false;
		}
	}

	return true;
};

// Smart tooltip positioning hook - positions tooltip on the best side
function useSmartTooltip() {
	const tooltipRef = useRef<HTMLDivElement>(null);
	const [tooltipPosition, setTooltipPosition] = useState<"top" | "bottom">("top");

	const measureTooltip = useCallback(() => {
		if (!tooltipRef.current) {
			return;
		}

		const rect = tooltipRef.current.getBoundingClientRect();
		const spaceAbove = rect.top;
		const spaceBelow = window.innerHeight - rect.bottom;

		// If tooltip is off-screen at top and there's more space below, flip it
		if (spaceAbove < 0 && spaceBelow > -spaceAbove) {
			setTooltipPosition("bottom");
		} else {
			setTooltipPosition("top");
		}
	}, []);

	return { tooltipRef, tooltipPosition, measureTooltip };
}

// Optimized spring physics for smoother interactions
const SMOOTH_SPRING_CONFIG = {
	type: "spring" as const,
	stiffness: 260,
	damping: 20,
	mass: 0.8,
	velocity: 2,
};

const EXIT_SPRING_CONFIG = {
	type: "spring" as const,
	stiffness: 400,
	damping: 25,
	velocity: 50,
};

// Shared hook for deferred sync to prevent render cycle issues
const useDeferredSync = () => {
	const deferredSync = useCallback((syncFn: () => void) => {
		setTimeout(syncFn, 0);
	}, []);

	return deferredSync;
};

// Shared components for better DRY architecture

// Selection badge component
const SelectionBadge = () => (
	<motion.div
		initial={{ scale: 0, opacity: 0 }}
		animate={{ scale: 1, opacity: 1 }}
		className="absolute top-3 right-3 z-20"
	>
		<div className="relative">
			<div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
			<div className="relative size-6 sm:size-7 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/40 border-2 border-primary/50">
				<Check size={14} className="text-primary-foreground" strokeWidth={3} />
			</div>
		</div>
	</motion.div>
);

// Name content component
const NameContent = ({
	nameItem,
	variant = "grid",
	showDetails = true,
}: {
	nameItem: NameItem;
	variant?: "grid" | "swipe";
	showDetails?: boolean;
}) => {
	const isGrid = variant === "grid";
	const nameClasses = isGrid
		? "mobile-readable-title block w-full text-left text-lg sm:text-[1.35rem] font-semibold leading-tight text-foreground drop-shadow-md"
		: "font-whimsical text-5xl lg:text-6xl text-foreground tracking-wide drop-shadow-2xl break-words w-full text-center";

	const pronunciationClasses = isGrid
		? `mobile-readable-meta block text-left text-[11px] sm:text-sm leading-tight font-semibold italic text-warning/95 drop-shadow-sm transition-all duration-300 ${
				showDetails ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
			}`
		: `text-warning text-3xl lg:text-4xl font-bold italic opacity-90 transition-all duration-300 ${
				showDetails ? "opacity-100 scale-100" : "opacity-80 scale-95"
			}`;

	const descriptionClasses = isGrid
		? `mobile-readable-description mt-1 max-w-[24ch] text-left text-sm sm:text-[15px] leading-snug line-clamp-2 text-foreground/84 drop-shadow-sm transition-all duration-500 ${
				showDetails ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
			}`
		: `text-foreground/90 text-base md:text-lg leading-relaxed max-w-md mt-3 drop-shadow-sm line-clamp-3 text-center transition-all duration-300 ${
				showDetails ? "opacity-100 transform scale-100" : "opacity-70 transform scale-95"
			}`;

	return (
		<>
			<span className={nameClasses}>{nameItem.name}</span>
			{nameItem.pronunciation && (
				<span className={isGrid ? pronunciationClasses : `${pronunciationClasses} block mt-2`}>
					[{nameItem.pronunciation}]
				</span>
			)}
			{nameItem.description && <p className={descriptionClasses}>{nameItem.description}</p>}
		</>
	);
};

// Zoom button component
const ZoomButton = ({ nameId, onClick }: { nameId: IdType; onClick: (id: IdType) => void }) => (
	<Button
		type="button"
		onClick={(e) => {
			e.stopPropagation();
			onClick(nameId);
		}}
		variant="ghost"
		size="icon"
		iconOnly={true}
		shape="pill"
		className="absolute top-3 right-3 z-10 size-9 bg-foreground/70 text-background opacity-0 backdrop-blur-md group-hover:opacity-100 hover:bg-foreground/90 hover:text-background focus:opacity-100 sm:size-10"
		aria-label="View full size"
	>
		<ZoomIn size={14} />
	</Button>
);

// Admin action button component
const AdminActionButton = ({
	nameItem,
	actionType,
	isProcessing,
	onClick,
}: {
	nameItem: NameItem;
	actionType: "toggle-hidden" | "toggle-locked";
	isProcessing: boolean;
	onClick: () => void;
}) => {
	const isHidden = actionType === "toggle-hidden";
	const isEnabled = isHidden ? isNameHidden(nameItem) : isNameLocked(nameItem);

	const buttonClasses = [
		getButtonClassName({
			variant: isHidden ? (isEnabled ? "secondary" : "danger") : isEnabled ? "ghost" : "secondary",
			presentation: "chip",
		}),
		"flex-1 justify-center shadow-lg",
		isHidden
			? isEnabled
				? "bg-success text-success-foreground hover:bg-success/80 hover:text-success-foreground shadow-success/25"
				: "bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground shadow-destructive/25"
			: isEnabled
				? "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-muted-foreground shadow-muted/25"
				: "bg-warning text-warning-foreground hover:bg-warning/80 hover:text-warning-foreground shadow-warning/25",
		isProcessing ? "opacity-50" : "",
	].join(" ");

	return (
		<motion.button
			type="button"
			onClick={onClick}
			disabled={isProcessing}
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
			className={buttonClasses}
		>
			{isProcessing ? (
				<div className="flex items-center justify-center gap-1">
					<div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
					<span>Processing...</span>
				</div>
			) : isHidden ? (
				<>
					<Eye size={12} className="mr-1" />
					{isEnabled ? "Unhide" : "Hide"}
				</>
			) : (
				<>
					<CheckCircle size={12} className="mr-1" />
					{isEnabled ? "Unlock" : "Lock"}
				</>
			)}
		</motion.button>
	);
};

// Card styles utility
const getCardStyles = (isSelected: boolean, isLocked: boolean) => {
	const baseClasses =
		"mobile-readable-card relative group overflow-hidden rounded-[1.65rem] border transition-all duration-300 transform-gpu";
	const selectedClasses = isSelected
		? "z-10 -translate-y-1 border-primary/60 bg-primary/10 shadow-xl shadow-primary/15 ring-2 ring-primary/20"
		: "border-border/40 bg-background/55 shadow-lg shadow-foreground/5 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-foreground/10";
	const lockedClasses = isLocked ? "cursor-not-allowed opacity-55 saturate-50" : "";

	return `${baseClasses} ${selectedClasses} ${lockedClasses}`;
};

// Name overlay styles utility
const getNameOverlayClasses = (variant: "grid" | "swipe") => {
	const baseClasses = "absolute flex flex-col pointer-events-none";
	const gridClasses =
		"inset-x-0 bottom-0 justify-end items-start p-3 sm:p-4 text-left bg-gradient-to-t from-background/96 via-background/38 to-transparent";
	const swipeClasses =
		"inset-0 justify-end items-center p-8 text-center bg-gradient-to-t from-background/95 via-background/40 to-transparent z-10";

	return `${baseClasses} ${variant === "grid" ? gridClasses : swipeClasses}`;
};

export function NameSelector() {
	const navigate = useNavigate();
	const toast = useToast();
	const storedSelectedNames = useAppStore((state) => state.tournament.selectedNames);
	const [selectedNames, setSelectedNames] = useState<Set<IdType>>(
		() => new Set(storedSelectedNames.map((name) => name.id)),
	);
	const isSwipeMode = useAppStore((state) => state.ui.isSwipeMode);
	const isAdmin = useAppStore((state) => state.user.isAdmin);
	const userName = useAppStore((state) => state.user.name);
	const tournamentActions = useAppStore((state) => state.tournamentActions);
	const [swipedIds, setSwipedIds] = useState<Set<IdType>>(new Set());
	const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(null);
	const [dragOffset, setDragOffset] = useState(0);
	const [names, setNames] = useState<NameItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const [togglingHidden, setTogglingHidden] = useState<Set<IdType>>(new Set());
	const [togglingLocked, setTogglingLocked] = useState<Set<IdType>>(new Set());
	const { getCachedData, setCachedData } = useNamesCache();
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);
	const hiddenPanel = useCollapsible(true, "hidden-names-collapsed");
	const [hiddenQuery, setHiddenQuery] = useState("");
	const [hiddenShowSelectedOnly, setHiddenShowSelectedOnly] = useState(false);
	const [hiddenRenderCount, setHiddenRenderCount] = useState(24);
	const [swipeHistory, setSwipeHistory] = useState<
		Array<{ id: IdType; direction: "left" | "right"; timestamp: number }>
	>([]);
	const { tooltipRef, tooltipPosition, measureTooltip } = useSmartTooltip();
	const deferredSync = useDeferredSync();

	// Memoize cat images and build an id->image lookup map
	const { catImages, catImageById } = useMemo(() => {
		const images = names.map((nameItem) => getRandomCatImage(nameItem.id, CAT_IMAGES));
		const byId = new Map<IdType, string>();
		names.forEach((nameItem, index) => {
			const img = images[index];
			if (img) {
				byId.set(nameItem.id, img);
			}
		});
		return { catImages: images, catImageById: byId };
	}, [names]);

	// Fetch names from Supabase on mount with retry mechanism and caching
	useEffect(() => {
		let retryTimeout: number | undefined;

		const fetchNames = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Try cache first, but don't short-circuit on empty cache entries.
				const cachedData = getCachedData(true);
				if (cachedData && retryCount === 0) {
					setNames(cachedData);
					setIsLoading(false);
					if (cachedData.length > 0) {
						return;
					}
				}

				const fetchedNames = await coreAPI.getTrendingNames(true);
				setNames(fetchedNames);
				setCachedData(fetchedNames, true);
				setRetryCount(0); // Reset retry count on success
			} catch (error) {
				console.error("Failed to fetch names:", error);
				const errorMessage = error instanceof Error ? error.message : "Failed to load names";
				setError(errorMessage);

				// Auto-retry for network errors (max 3 retries)
				if (retryCount < 2 && errorMessage.toLowerCase().includes("network")) {
					retryTimeout = window.setTimeout(
						() => {
							setRetryCount((prev) => prev + 1);
						},
						1000 * (retryCount + 1),
					); // Exponential backoff
				}
			} finally {
				setIsLoading(false);
			}
		};

		fetchNames();

		return () => {
			if (retryTimeout != null) {
				window.clearTimeout(retryTimeout);
			}
		};
	}, [retryCount, getCachedData, setCachedData]);

	// Show warning when using fallback data
	useEffect(() => {
		if (isUsingFallbackData()) {
			toast.showWarning(
				"Using demo data - database connection unavailable. Your votes won't be saved to the global leaderboard.",
			);
		}
	}, [toast]);

	// Keep local selection in sync with store state and locked names after remounts.
	useEffect(() => {
		const storedIds = new Set(storedSelectedNames.map((name) => name.id));
		const availableIds = new Set(names.map((name) => name.id));
		const nextSelectedIds =
			names.length > 0
				? new Set([...storedIds].filter((id) => availableIds.has(id)))
				: new Set(storedIds);

		getLockedNames(names).forEach((name) => {
			nextSelectedIds.add(name.id);
		});

		setSelectedNames((prev) => (areIdSetsEqual(prev, nextSelectedIds) ? prev : nextSelectedIds));

		if (names.length === 0 || areIdSetsEqual(storedIds, nextSelectedIds)) {
			return;
		}

		tournamentActions.setSelection(names.filter((name) => nextSelectedIds.has(name.id)));
	}, [names, storedSelectedNames, tournamentActions]);

	const getSelectedNameItems = useCallback(
		(selectedIds: Set<IdType>) => names.filter((name) => selectedIds.has(name.id)),
		[names],
	);

	const syncSelectionToStore = useCallback(
		(nextSelectedIds: Set<IdType>) => {
			const selectedNameItems = getSelectedNameItems(nextSelectedIds);
			tournamentActions.setSelection(selectedNameItems);
		},
		[getSelectedNameItems, tournamentActions],
	);

	const handleStartTournament = useCallback(() => {
		const selectedNameItems = getSelectedNameItems(selectedNames);

		if (selectedNameItems.length < 2) {
			toast.showWarning("Choose at least two names before starting the tournament.");
			return;
		}

		tournamentActions.startTournament(selectedNameItems);
		navigate("/tournament");
	}, [getSelectedNameItems, navigate, selectedNames, toast, tournamentActions]);

	const toggleName = useCallback(
		(nameId: IdType) => {
			setSelectedNames((prev) => {
				const next = new Set(prev);
				if (next.has(nameId)) {
					next.delete(nameId);
				} else {
					next.add(nameId);
				}

				syncSelectionToStore(next);

				return next;
			});
		},
		[syncSelectionToStore],
	);

	// Trigger haptic feedback if available
	const triggerHaptic = useCallback(() => {
		if ("vibrate" in navigator) {
			navigator.vibrate(50);
		}
	}, []);

	// Add haptic feedback for better UX
	const handleToggleName = useCallback(
		(nameId: IdType) => {
			// Add subtle haptic feedback if supported
			triggerHaptic();
			toggleName(nameId);
		},
		[triggerHaptic, toggleName],
	);

	// Optimized drag state update with batching
	const updateDragState = useCallback(
		(offset: number, direction: "left" | "right" | null = null) => {
			requestAnimationFrame(() => {
				setDragOffset(offset);
				if (direction) {
					setDragDirection(direction);
				}
			});
		},
		[],
	);

	const markSwiped = useCallback((nameId: IdType, direction: "left" | "right") => {
		setSwipedIds((prev) => {
			const next = new Set(prev);
			next.add(nameId);
			return next;
		});
		setSwipeHistory((prev) => [...prev, { id: nameId, direction, timestamp: Date.now() }]);
	}, []);

	const handleSwipe = useCallback(
		(nameId: IdType, direction: "left" | "right", velocity: number = 0) => {
			if (direction === "right") {
				setSelectedNames((prev) => {
					const next = new Set(prev);
					next.add(nameId);
					// Use deferred sync to prevent render cycle issue
					deferredSync(() => syncSelectionToStore(next));
					return next;
				});
			}
			markSwiped(nameId, direction);
			triggerHaptic();

			// Dynamic reset delay based on velocity for smoother feel
			const baseDelay = 200;
			const velocityFactor = Math.min(Math.abs(velocity) * 0.05, 150);
			const resetDelay = Math.max(baseDelay, 350 - velocityFactor);

			// Batch state updates for better performance
			requestAnimationFrame(() => {
				setTimeout(() => {
					requestAnimationFrame(() => {
						setDragDirection(null);
						setDragOffset(0);
					});
				}, resetDelay);
			});
		},
		[markSwiped, syncSelectionToStore, triggerHaptic, deferredSync],
	);

	const handleDragEnd = useCallback(
		(nameId: IdType, info: PanInfo) => {
			const offset = info.offset.x;
			const velocity = info.velocity.x;

			if (
				Math.abs(offset) < SWIPE_OFFSET_THRESHOLD &&
				Math.abs(velocity) < SWIPE_VELOCITY_THRESHOLD
			) {
				// Smooth snap back animation
				updateDragState(0);
				return;
			}

			// Determine direction based on offset and velocity
			const isRightSwipe = offset > SWIPE_OFFSET_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;
			const direction = isRightSwipe ? "right" : "left";

			updateDragState(0, direction);
			handleSwipe(nameId, direction, Math.abs(velocity));
		},
		[handleSwipe, updateDragState],
	);

	// Undo last swipe functionality
	const handleUndo = useCallback(() => {
		if (swipeHistory.length === 0) {
			return;
		}

		const lastSwipe = swipeHistory[swipeHistory.length - 1];
		if (!lastSwipe) {
			return;
		}

		setSwipeHistory((prev) => prev.slice(0, -1));
		setSwipedIds((prev) => {
			const next = new Set(prev);
			next.delete(lastSwipe.id);
			return next;
		});

		// If it was a right swipe, remove from selected names and sync with store
		if (lastSwipe.direction === "right") {
			setSelectedNames((prev) => {
				const next = new Set(prev);
				next.delete(lastSwipe.id);
				// Use deferred sync to prevent render cycle issue
				deferredSync(() => syncSelectionToStore(next));
				return next;
			});
		}

		triggerHaptic();
	}, [swipeHistory, syncSelectionToStore, triggerHaptic, deferredSync]);

	const handleToggleHidden = useCallback(
		async (nameId: IdType, isCurrentlyHidden: boolean) => {
			if (!isAdmin || !userName?.trim()) {
				return;
			}

			setTogglingHidden((prev) => {
				const next = new Set(prev);
				next.add(nameId);
				return next;
			});

			try {
				if (isCurrentlyHidden) {
					const result = await hiddenNamesAPI.unhideName(userName, nameId);
					if (!result.success) {
						throw new Error(result.error || "Failed to unhide name");
					}
				} else {
					const result = await hiddenNamesAPI.hideName(userName, nameId);
					if (!result.success) {
						throw new Error(result.error || "Failed to hide name");
					}
				}

				const fetchedNames = await coreAPI.getTrendingNames(true);
				setNames(fetchedNames);
				toast.showSuccess(isCurrentlyHidden ? "Name is visible again." : "Name is now hidden.");
			} catch (error) {
				console.error("Failed to toggle hidden status:", error);
				const detail = error instanceof Error ? error.message : "Unknown error";
				toast.showError(`Could not update hidden status: ${detail}`);
			} finally {
				setTogglingHidden((prev) => {
					const next = new Set(prev);
					next.delete(nameId);
					return next;
				});
			}
		},
		[userName, isAdmin, toast],
	);

	const handleToggleLocked = useCallback(
		async (nameId: IdType, isCurrentlyLocked: boolean) => {
			if (!isAdmin || !userName?.trim()) {
				return;
			}

			setTogglingLocked((prev) => {
				const next = new Set(prev);
				next.add(nameId);
				return next;
			});

			try {
				const result = await adminNamesAPI.toggleLockedIn(nameId, !isCurrentlyLocked);

				if (result.success) {
					const fetchedNames = await coreAPI.getTrendingNames(true);
					setNames(fetchedNames);
					toast.showSuccess(isCurrentlyLocked ? "Name unlocked." : "Name locked in.");
				} else {
					throw new Error(result.error || "Failed to toggle locked status");
				}
			} catch (error) {
				console.error("Failed to toggle locked status:", error);
				const detail = error instanceof Error ? error.message : "Unknown error";
				toast.showError(`Could not update lock state: ${detail}`);
			} finally {
				setTogglingLocked((prev) => {
					const next = new Set(prev);
					next.delete(nameId);
					return next;
				});
			}
		},
		[userName, isAdmin, toast],
	);

	const {
		pendingAdminAction,
		requestAdminAction,
		confirmAdminAction,
		cancelAdminAction,
		confirmActionName,
		isPendingActionBusy,
	} = useAdminActionConfirmation({
		isAdmin,
		userName,
		names,
		toast,
		isBusy: (action) => {
			if (action.type === "toggle-hidden") {
				return togglingHidden.has(action.nameId);
			}
			return togglingLocked.has(action.nameId);
		},
		executeAction: async (action) => {
			if (action.type === "toggle-hidden") {
				await handleToggleHidden(action.nameId, action.isCurrentlyEnabled);
				return;
			}
			await handleToggleLocked(action.nameId, action.isCurrentlyEnabled);
		},
	});

	const visibleCards = useMemo(() => {
		const unlockedNames = names.filter((name) => !isNameLocked(name));
		return unlockedNames.filter((name) => !swipedIds.has(name.id));
	}, [names, swipedIds]);
	const cardsToRender = useMemo(() => visibleCards.slice(0, 3), [visibleCards]);

	const availableNames = useMemo(() => getActiveNames(names), [names]);
	const lockedInNames = useMemo(() => getLockedNames(names), [names]);
	const hiddenNamesAll = useMemo(() => getHiddenNames(names), [names]);
	const hiddenFiltered = useMemo(() => {
		return hiddenNamesAll.filter((name) => {
			if (hiddenShowSelectedOnly && !selectedNames.has(name.id)) {
				return false;
			}
			if (!hiddenQuery.trim()) {
				return true;
			}
			return matchesNameSearchTerm(name, hiddenQuery);
		});
	}, [hiddenNamesAll, hiddenQuery, hiddenShowSelectedOnly, selectedNames]);
	const previewItems = useMemo(() => hiddenNamesAll.slice(0, 6), [hiddenNamesAll]);
	const renderItems = useMemo(
		() => hiddenFiltered.slice(0, hiddenRenderCount),
		[hiddenFiltered, hiddenRenderCount],
	);
	const selectedIdsSet = useMemo(() => {
		const ids = new Set(selectedNames);
		return ids;
	}, [selectedNames]);
	const selectedAvailableCount = useMemo(() => {
		const availableIds = new Set(availableNames.map((n) => n.id));
		let count = 0;
		selectedNames.forEach((id) => {
			if (availableIds.has(id)) {
				count += 1;
			}
		});
		return count;
	}, [availableNames, selectedNames]);
	const selectedHiddenCount = useMemo(() => {
		let count = 0;
		hiddenNamesAll.forEach((name) => {
			if (selectedIdsSet.has(name.id)) {
				count += 1;
			}
		});
		return count;
	}, [hiddenNamesAll, selectedIdsSet]);
	const progressPercentage = useMemo(
		() => Math.round((selectedAvailableCount / Math.max(availableNames.length, 1)) * 100),
		[selectedAvailableCount, availableNames.length],
	);
	const canSelectAllAvailable = useMemo(
		() => availableNames.some((name) => !selectedIdsSet.has(name.id)),
		[availableNames, selectedIdsSet],
	);
	const hasAnySelection = selectedIdsSet.size > 0;

	// Keyboard navigation for swipe mode
	useEffect(() => {
		if (!isSwipeMode) {
			return;
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't handle keyboard events if lightbox is open
			if (lightboxOpen) {
				return;
			}

			const currentCard = visibleCards[0];
			if (!currentCard) {
				return;
			}

			switch (e.key) {
				case "ArrowLeft":
				case "a":
				case "A":
					e.preventDefault();
					setDragDirection("left");
					handleSwipe(currentCard.id, "left");
					break;
				case "ArrowRight":
				case "d":
				case "D":
					e.preventDefault();
					setDragDirection("right");
					handleSwipe(currentCard.id, "right");
					break;
				case "z":
				case "Z":
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						handleUndo();
					}
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isSwipeMode, visibleCards, handleSwipe, handleUndo, lightboxOpen]);

	const handleOpenLightbox = useCallback(
		(nameId: IdType) => {
			const index = names.findIndex((n) => n.id === nameId);
			if (index !== -1) {
				setLightboxIndex(index);
				setLightboxOpen(true);
			}
		},
		[names],
	);

	const handleSelectAllAvailable = useCallback(() => {
		setSelectedNames((prev) => {
			const next = new Set(prev);
			availableNames.forEach((name) => {
				next.add(name.id);
			});
			// Use deferred sync to prevent render cycle issue
			deferredSync(() => syncSelectionToStore(next));
			return next;
		});
		triggerHaptic();
	}, [availableNames, syncSelectionToStore, triggerHaptic, deferredSync]);

	const handleClearSelection = useCallback(() => {
		const lockedIds = new Set(getLockedNames(names).map((name) => name.id));
		setSelectedNames(lockedIds);
		// Use deferred sync to prevent render cycle issue
		deferredSync(() => syncSelectionToStore(lockedIds));
		triggerHaptic();
	}, [names, syncSelectionToStore, triggerHaptic, deferredSync]);

	const handleSelectRandomAvailable = useCallback(() => {
		if (availableNames.length === 0) {
			return;
		}

		const targetCount = Math.min(8, availableNames.length);
		const pool = [...availableNames];
		for (let i = pool.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			const temp = pool[i];
			pool[i] = pool[j] as NameItem;
			pool[j] = temp as NameItem;
		}

		const randomIds = new Set(pool.slice(0, targetCount).map((name) => name.id));
		setSelectedNames((prev) => {
			const next = new Set(prev);
			randomIds.forEach((id) => {
				next.add(id);
			});
			// Use deferred sync to prevent render cycle issue
			deferredSync(() => syncSelectionToStore(next));
			return next;
		});
		triggerHaptic();
		toast.showSuccess(`Added ${targetCount} random names.`);
	}, [availableNames, syncSelectionToStore, toast, triggerHaptic, deferredSync]);

	if (isLoading) {
		return (
			<div className="mx-auto w-full">
				<div className="flex items-center justify-center py-20">
					<Loading variant="spinner" text="Loading cat names..." />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="mx-auto w-full">
				<div className="flex flex-col items-center justify-center py-20 space-y-4">
					<div className="text-destructive text-center">
						<p className="text-lg font-medium">Failed to load names</p>
						<p className="text-sm opacity-75 mt-1">{error}</p>
					</div>
					<Button onClick={() => setRetryCount((prev) => prev + 1)} variant="glass" size="sm">
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-7xl">
			<div className="space-y-6">
				<div className="overflow-hidden rounded-[2rem] border border-border/50 bg-gradient-to-br from-background/96 via-background/90 to-muted/45 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
					<div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
						<div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
							<div className="max-w-2xl space-y-3">
								<span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
									Name Shortlist
								</span>
								<div className="space-y-2">
									<h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
										Pick Names
									</h1>
									<p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
										Keep the names that feel right. Choose at least two contenders to unlock the
										tournament bracket.
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								<div className="rounded-2xl border border-border/40 bg-background/70 px-4 py-3 shadow-sm">
									<div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
										Selected
									</div>
									<div className="mt-1 text-2xl font-semibold text-foreground">
										{selectedIdsSet.size}
									</div>
								</div>
								<div className="rounded-2xl border border-border/40 bg-background/70 px-4 py-3 shadow-sm">
									<div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
										Available
									</div>
									<div className="mt-1 text-2xl font-semibold text-foreground">
										{availableNames.length}
									</div>
								</div>
								<div className="rounded-2xl border border-border/40 bg-background/70 px-4 py-3 shadow-sm">
									<div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
										Status
									</div>
									<div className="mt-1 text-sm font-semibold text-foreground sm:text-base">
										{selectedIdsSet.size >= 2
											? "Ready to bracket"
											: `Need ${Math.max(2 - selectedIdsSet.size, 0)} more`}
									</div>
								</div>
							</div>
						</div>

						{lockedInNames.length > 0 && (
							<div className="rounded-[1.5rem] border border-warning/20 bg-warning/[0.08] px-4 py-4">
								<div className="mb-3 flex flex-wrap items-center gap-2">
									<span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
										My cat is named
									</span>
									<span className="rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground/70">
										Locked into every bracket
									</span>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									{lockedInNames.map((nameItem, index) => (
										<motion.div
											key={nameItem.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: index * 0.05 }}
											whileHover={{ y: -1 }}
											className="group relative rounded-full border border-warning/25 bg-background/85 px-3.5 py-2 shadow-sm"
										>
											<span className="text-sm font-medium text-foreground">{nameItem.name}</span>
											{(nameItem.description || nameItem.pronunciation) && (
												<div
													ref={tooltipRef}
													onMouseEnter={measureTooltip}
													className={`name-lock-tooltip ${
														tooltipPosition === "top"
															? "name-lock-tooltip--top"
															: "name-lock-tooltip--bottom"
													}`}
												>
													{nameItem.pronunciation && (
														<div className="name-lock-tooltip__header">
															<div className="name-lock-tooltip__label">Pronunciation</div>
															<div className="name-lock-tooltip__pronunciation">
																{nameItem.pronunciation}
															</div>
														</div>
													)}
													<div className="name-lock-tooltip__body">{nameItem.description}</div>
													<div className="name-lock-tooltip__arrow" />
												</div>
											)}
										</motion.div>
									))}
								</div>
							</div>
						)}

						<div className="flex flex-col gap-4 rounded-[1.5rem] border border-border/40 bg-background/70 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
							<div className="min-w-0 flex-1">
								<div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
									<div>
										<div className="font-semibold text-foreground">Selection progress</div>
										<div className="text-xs text-muted-foreground">
											{progressPercentage}% of visible names chosen
										</div>
									</div>
									<div className="rounded-full bg-background/85 px-3 py-1 text-sm font-medium text-foreground/80">
										{selectedAvailableCount}/{availableNames.length}
									</div>
								</div>
								<div className="h-2.5 overflow-hidden rounded-full bg-border/30">
									<motion.div
										className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/80"
										initial={{ width: 0 }}
										animate={{ width: `${progressPercentage}%` }}
										transition={{ duration: 0.5, ease: "easeOut" }}
									/>
								</div>
								<div className="mt-3 flex flex-wrap items-center gap-2">
									<span
										className={`rounded-full px-3 py-1 text-xs font-medium ${
											selectedIdsSet.size >= 2
												? "bg-primary/10 text-primary"
												: "bg-muted text-muted-foreground"
										}`}
									>
										{selectedIdsSet.size >= 2 ? "Tournament ready" : "Select at least 2 names"}
									</span>
									{selectedHiddenCount > 0 && (
										<span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning/90">
											<EyeOff size={12} />
											{selectedHiddenCount} hidden selected
										</span>
									)}
								</div>
							</div>

							<div className="flex justify-center lg:justify-end">
								{isSwipeMode && swipeHistory.length > 0 ? (
									<div className="flex items-center gap-3">
										<Button
											onClick={handleUndo}
											variant="outline"
											size="sm"
											className="gap-2 border-warning/25 bg-background/80 text-warning hover:border-warning hover:bg-warning/10"
										>
											<Undo2 size={14} />
											Undo ({swipeHistory.length})
										</Button>
									</div>
								) : (
									<div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-border/40 bg-background/85 p-1.5 shadow-sm">
										<Button
											variant="ghost"
											size="sm"
											onClick={handleSelectAllAvailable}
											disabled={!canSelectAllAvailable}
											className="h-9 gap-2 rounded-full px-4 text-sm font-medium hover:bg-accent/60 disabled:opacity-50"
										>
											<CheckCircle size={14} />
											All
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={handleSelectRandomAvailable}
											className="h-9 gap-2 rounded-full px-4 text-sm font-medium hover:bg-accent/60"
										>
											<Shuffle size={14} />
											Random
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={handleClearSelection}
											disabled={!hasAnySelection}
											className="h-9 gap-2 rounded-full px-4 text-sm font-medium hover:bg-accent/60 disabled:opacity-50"
										>
											<X size={14} />
											Clear
										</Button>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{isSwipeMode ? (
					<>
						<div
							className="relative w-full flex items-center justify-center"
							style={{ minHeight: "600px" }}
						>
							<AnimatePresence mode="popLayout">
								{visibleCards.length > 0 ? (
									cardsToRender.map((nameItem, index) => {
										const catImage =
											catImageById.get(nameItem.id) ?? getRandomCatImage(nameItem.id, CAT_IMAGES);
										return (
											<motion.div
												key={nameItem.id}
												layout={true}
												layoutId={String(nameItem.id)}
												className="absolute inset-0 flex items-center justify-center"
												style={{ zIndex: 10 - index }}
												exit={{
													opacity: 0,
													x: dragDirection === "right" ? 400 : -400,
													rotate: dragDirection === "right" ? 25 : -25,
													scale: 0.8,
													transition: EXIT_SPRING_CONFIG,
												}}
											>
												<motion.div
													drag={index === 0 ? "x" : false}
													dragConstraints={{ left: -250, right: 250 }}
													onDrag={(_, info) => {
														if (index === 0) {
															updateDragState(info.offset.x);
														}
													}}
													onDragEnd={(_, info) => {
														if (index === 0) {
															handleDragEnd(nameItem.id, info);
														}
													}}
													animate={{
														scale: index === 0 ? 1 : 0.95,
														opacity: 1,
														rotate: index === 0 ? dragOffset / 30 : 0,
														x: index === 0 ? dragOffset * 0.15 : 0,
														y: index * 8,
													}}
													transition={SMOOTH_SPRING_CONFIG}
													whileDrag={{
														scale: 1.02,
														transition: { duration: 0.15 },
													}}
													whileHover={{
														scale: index === 0 ? 1.05 : 1,
														transition: { duration: 0.2 },
													}}
													className="w-full max-w-md h-[550px]"
												>
													<Card
														className={`relative overflow-hidden group transition-all duration-500 h-full bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-sm ${
															selectedNames.has(nameItem.id)
																? "shadow-[0_0_40px_hsl(var(--success)/0.4)] ring-2 ring-success/30 ring-offset-4 ring-offset-background/20"
																: "shadow-2xl shadow-foreground/30 border-2 border-border/20"
														} ${
															index === 0
																? "cursor-grab active:cursor-grabbing shadow-2xl active:scale-95 hover:shadow-3xl hover:shadow-foreground/40"
																: "pointer-events-none opacity-80"
														}`}
														variant="filled"
														padding="none"
													>
														{index === 0 && (
															<>
																<motion.div
																	className="absolute left-8 top-1/2 -translate-y-1/2 z-20"
																	initial={{ opacity: 0, scale: 0.8 }}
																	animate={{
																		opacity: dragOffset < -50 ? 1 : 0,
																		scale: dragOffset < -50 ? 1 : 0.8,
																	}}
																>
																	<div className="flex items-center gap-2 px-6 py-3 bg-destructive/90 backdrop-blur-md rounded-full border-2 border-destructive shadow-lg rotate-[-20deg]">
																		<X size={24} className="text-destructive-foreground" />
																		<span className="text-destructive-foreground font-black text-lg uppercase">
																			Nope
																		</span>
																	</div>
																</motion.div>

																<motion.div
																	className="absolute right-8 top-1/2 -translate-y-1/2 z-20"
																	initial={{ opacity: 0, scale: 0.8 }}
																	animate={{
																		opacity: dragOffset > 50 ? 1 : 0,
																		scale: dragOffset > 50 ? 1 : 0.8,
																	}}
																>
																	<div className="flex items-center gap-2 px-6 py-3 bg-success/90 backdrop-blur-md rounded-full border-2 border-success shadow-lg rotate-[20deg]">
																		<Heart
																			size={24}
																			className="text-success-foreground fill-success-foreground"
																		/>
																		<span className="text-success-foreground font-black text-lg uppercase">
																			Like
																		</span>
																	</div>
																</motion.div>
															</>
														)}

														<div className="relative w-full h-full flex flex-col justify-end bg-foreground/10">
															<CatImage
																src={catImage}
																alt={nameItem.name}
																objectFit="cover"
																containerClassName="absolute inset-0 w-full h-full"
																imageClassName="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700"
															/>

															{/* Zoom Button Overlay */}
															{index === 0 && (
																<Button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		handleOpenLightbox(nameItem.id);
																	}}
																	variant="ghost"
																	size="icon"
																	iconOnly={true}
																	shape="pill"
																	className="absolute top-4 right-4 z-30 size-10 bg-foreground/50 text-background opacity-0 backdrop-blur-sm group-hover:opacity-100 hover:bg-foreground/70 hover:text-background focus:opacity-100"
																	aria-label="View full size"
																>
																	<ZoomIn size={18} />
																</Button>
															)}

															{/* Name and Info Overlay */}
															<div className={getNameOverlayClasses("swipe")}>
																<div className="flex flex-col gap-1.5 max-w-full">
																	<NameContent
																		nameItem={nameItem}
																		variant="swipe"
																		showDetails={true}
																	/>
																</div>

																{isAdmin && (
																	<Button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			requestAdminAction({
																				type: "toggle-hidden",
																				nameId: nameItem.id,
																				isCurrentlyEnabled: isNameHidden(nameItem),
																			});
																		}}
																		disabled={togglingHidden.has(nameItem.id)}
																		variant="ghost"
																		shape="pill"
																		className={`mt-4 pointer-events-auto w-fit bg-transparent text-sm font-bold tracking-wider uppercase ${
																			togglingHidden.has(nameItem.id)
																				? "text-muted-foreground"
																				: "text-warning hover:bg-warning/10 hover:text-warning/80"
																		}`}
																	>
																		{togglingHidden.has(nameItem.id) ? (
																			<>
																				<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
																				<span>Processing...</span>
																			</>
																		) : isNameHidden(nameItem) ? (
																			<>
																				<Eye size={16} />
																				<span>Unhide From Public</span>
																			</>
																		) : (
																			<>
																				<EyeOff size={16} />
																				<span>Hide From Public</span>
																			</>
																		)}
																	</Button>
																)}

																{selectedNames.has(nameItem.id) && (
																	<div className="flex mt-4">
																		<div className="px-4 py-1.5 bg-success/30 backdrop-blur-md border border-success/40 rounded-full flex items-center gap-2 shadow-lg shadow-success/20">
																			<Check size={16} className="text-success" />
																			<span className="text-success font-black text-xs tracking-[0.2em] uppercase">
																				Selected
																			</span>
																		</div>
																	</div>
																)}
															</div>
														</div>
													</Card>
												</motion.div>
											</motion.div>
										);
									})
								) : (
									<div className="absolute inset-0 flex items-center justify-center">
										<motion.div
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.6, ease: "easeOut" }}
											className="text-center space-y-6 max-w-md mx-auto px-6"
										>
											<motion.div
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 25 }}
												className="mx-auto w-20 h-20 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center shadow-xl shadow-success/30"
											>
												<Check size={40} className="text-success-foreground" strokeWidth={3} />
											</motion.div>
											<div className="space-y-3">
												<h2 className="text-3xl sm:text-4xl font-bold text-foreground">
													All done!
												</h2>
												<p className="text-muted-foreground text-lg leading-relaxed">
													You've reviewed all names. Ready to start the tournament?
												</p>
											</div>
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{ delay: 0.4 }}
												className="pt-4"
											>
												<Button
													onClick={handleStartTournament}
													className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-primary/30 transition-all duration-300 hover:scale-105 active:scale-95"
												>
													Start Tournament
												</Button>
											</motion.div>
										</motion.div>
									</div>
								)}
							</AnimatePresence>
						</div>

						{visibleCards.length > 0 && (
							<div className="flex items-center justify-center gap-6 sm:gap-8 mt-8 pb-6">
								<motion.div
									whileHover={{ scale: 1.05, y: -2 }}
									whileTap={{ scale: 0.95 }}
									transition={{ type: "spring", stiffness: 400, damping: 25 }}
								>
									<Button
										variant="outline"
										iconOnly={true}
										className="group relative h-16 w-16 sm:h-20 sm:w-20 rounded-full border-3 border-destructive/30 hover:border-destructive/50 bg-gradient-to-br from-destructive/5 to-destructive/10 hover:from-destructive/15 hover:to-destructive/20 text-destructive transition-all duration-300 shadow-xl hover:shadow-destructive/30 hover:scale-110 active:scale-95"
										onClick={() => {
											const currentCard = visibleCards[0];
											if (currentCard) {
												handleSwipe(currentCard.id, "left");
											}
										}}
										aria-label="Skip (Left Arrow)"
										title="Skip (Left Arrow)"
									>
										<div className="relative">
											<X size={28} className="sm:size-8" strokeWidth={2.5} />
											<div className="absolute inset-0 bg-destructive/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
										</div>
									</Button>
									<div className="text-center mt-2">
										<span className="text-xs text-muted-foreground font-medium">Skip</span>
									</div>
								</motion.div>

								<motion.div
									whileHover={{ scale: 1.05, y: -2 }}
									whileTap={{ scale: 0.95 }}
									transition={{ type: "spring", stiffness: 400, damping: 25 }}
								>
									<Button
										variant="outline"
										iconOnly={true}
										className="group relative h-16 w-16 sm:h-20 sm:w-20 rounded-full border-3 border-success/30 hover:border-success/50 bg-gradient-to-br from-success/5 to-success/10 hover:from-success/15 hover:to-success/20 text-success transition-all duration-300 shadow-xl hover:shadow-success/30 hover:scale-110 active:scale-95"
										onClick={() => {
											const currentCard = visibleCards[0];
											if (currentCard) {
												handleSwipe(currentCard.id, "right");
											}
										}}
										aria-label="Select (Right Arrow)"
										title="Select (Right Arrow)"
									>
										<div className="relative">
											<Heart
												size={28}
												className="sm:size-8"
												strokeWidth={2.5}
												fill="currentColor"
											/>
											<div className="absolute inset-0 bg-success/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
										</div>
									</Button>
									<div className="text-center mt-2">
										<span className="text-xs text-muted-foreground font-medium">Select</span>
									</div>
								</motion.div>
							</div>
						)}
					</>
				) : (
					<div className="space-y-8">
						{(() => {
							const activeNames = getActiveNames(names);
							return (
								activeNames.length > 0 && (
									<div className="grid grid-cols-2 gap-4 pb-6 min-[520px]:grid-cols-3 sm:gap-5 sm:pb-8 md:grid-cols-4 xl:gap-6">
										{activeNames.map((nameItem) => {
											const isSelected = selectedNames.has(nameItem.id);
											const catImage =
												catImageById.get(nameItem.id) ?? getRandomCatImage(nameItem.id, CAT_IMAGES);
											return (
												<motion.div
													key={nameItem.id}
													onClick={() => handleToggleName(nameItem.id)}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															handleToggleName(nameItem.id);
														}
													}}
													role="button"
													tabIndex={0}
													whileHover={{ scale: 1.04, y: -4, rotate: [-1, 1] }}
													whileTap={{ scale: 0.96 }}
													transition={{ type: "spring", stiffness: 300, damping: 20 }}
													className={getCardStyles(isSelected, isNameLocked(nameItem))}
												>
													<div className="w-full relative aspect-[5/4] group/img sm:aspect-[4/3] xl:aspect-[3/2]">
														<CatImage
															src={catImage}
															alt={nameItem.name}
															objectFit="cover"
															containerClassName="w-full h-full"
															imageClassName="h-full w-full object-cover brightness-[0.8] saturate-[1.05] transition-transform duration-700 ease-out group-hover:scale-105 group-hover:brightness-[0.9]"
														/>

														{/* Selection Badge */}
														{isSelected && <SelectionBadge />}

														{/* Enhanced Name Overlay */}
														<div className={getNameOverlayClasses("grid")}>
															<div className="flex max-w-full flex-col gap-1.5 rounded-[1.35rem] border border-white/10 bg-background/78 px-3.5 py-3 shadow-xl shadow-black/15 backdrop-blur-md sm:px-4 sm:py-3.5">
																<NameContent nameItem={nameItem} variant="grid" />
															</div>
														</div>

														{/* Enhanced Zoom Button */}
														<ZoomButton nameId={nameItem.id} onClick={handleOpenLightbox} />
													</div>
													{isAdmin && !isSwipeMode && (
														<motion.div
															initial={{ opacity: 0, y: 10 }}
															animate={{ opacity: 1, y: 0 }}
															transition={{ delay: 0.1 }}
															className="px-3 pb-3 flex gap-2"
														>
															<AdminActionButton
																nameItem={nameItem}
																actionType="toggle-hidden"
																isProcessing={togglingHidden.has(nameItem.id)}
																onClick={() =>
																	requestAdminAction({
																		type: "toggle-hidden",
																		nameId: nameItem.id,
																		isCurrentlyEnabled: isNameHidden(nameItem),
																	})
																}
															/>

															<AdminActionButton
																nameItem={nameItem}
																actionType="toggle-locked"
																isProcessing={togglingLocked.has(nameItem.id)}
																onClick={() =>
																	requestAdminAction({
																		type: "toggle-locked",
																		nameId: nameItem.id,
																		isCurrentlyEnabled: isNameLocked(nameItem),
																	})
																}
															/>
														</motion.div>
													)}
												</motion.div>
											);
										})}
									</div>
								)
							);
						})()}

						{(() => {
							if (hiddenNamesAll.length === 0) {
								return null;
							}

							if (isSwipeMode) {
								return (
									<div className="mt-6 text-center text-muted-foreground text-sm">
										Hidden names available in Grid mode
									</div>
								);
							}

							return (
								<div className="mt-6">
									<div className="select-none">
										<Button
											type="button"
											onClick={() => {
												if (!hiddenPanel.isCollapsed) {
													hiddenPanel.collapse();
													return;
												}
												hiddenPanel.expand();
												setHiddenRenderCount(24);
											}}
											aria-expanded={hiddenPanel.isCollapsed ? "false" : "true"}
											aria-controls="hidden-names-panel"
											variant="ghost"
											className="w-full justify-between bg-transparent px-0 py-0 text-left hover:bg-transparent hover:text-inherit"
										>
											<div className="flex items-center gap-2">
												<span className="text-muted-foreground">
													{hiddenPanel.isCollapsed ? (
														<ChevronRight size={20} />
													) : (
														<ChevronDown size={20} />
													)}
												</span>
												<span className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter">
													Hidden Names ({hiddenNamesAll.length})
												</span>
											</div>
											<span className="text-[11px] sm:text-xs text-muted-foreground">
												{hiddenPanel.isCollapsed ? "Click to expand" : "Click to collapse"}
											</span>
										</Button>

										{hiddenPanel.isCollapsed && (
											<div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
												{previewItems.map((n) => {
													const img = catImageById.get(n.id) ?? getRandomCatImage(n.id, CAT_IMAGES);
													return (
														<div
															key={n.id}
															className="relative aspect-square overflow-hidden border border-border/10"
														>
															<CatImage
																src={img}
																alt="Hidden name"
																containerClassName="w-full h-full"
																imageClassName="w-full h-full object-cover opacity-20"
															/>
															<div className="absolute inset-0 flex items-center justify-center">
																<span className="text-muted-foreground/50 text-sm font-bold">
																	?
																</span>
															</div>
														</div>
													);
												})}
											</div>
										)}
									</div>

									<CollapsibleContent id="hidden-names-panel" isCollapsed={hiddenPanel.isCollapsed}>
										<div className="mt-4">
											<div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
												<input
													value={hiddenQuery}
													onChange={(e) => {
														setHiddenQuery(e.target.value);
														setHiddenRenderCount(24);
													}}
													placeholder="Search hidden names"
													className="w-full sm:max-w-sm px-3 py-2 bg-foreground/5 border border-border/10 text-foreground text-sm"
												/>
												<div className="flex items-center justify-between sm:justify-end gap-3">
													{hiddenQuery.trim().length > 0 && (
														<Button
															type="button"
															onClick={() => {
																setHiddenQuery("");
																setHiddenRenderCount(24);
															}}
															variant="ghost"
															presentation="chip"
															shape="pill"
															className="border border-border/10 bg-foreground/5 text-foreground/80 hover:bg-foreground/10 hover:text-foreground"
														>
															Clear search
														</Button>
													)}
													<Button
														type="button"
														onClick={() => setHiddenShowSelectedOnly((v) => !v)}
														variant={hiddenShowSelectedOnly ? "secondary" : "ghost"}
														presentation="chip"
														shape="pill"
														className={`border ${
															hiddenShowSelectedOnly
																? "bg-primary/20 border-primary/40 text-foreground hover:bg-primary/24"
																: "bg-foreground/5 border-border/10 text-foreground/80 hover:bg-foreground/10 hover:text-foreground"
														}`}
													>
														Selected only
													</Button>
													<span className="text-xs text-muted-foreground">
														{hiddenFiltered.length} / {hiddenNamesAll.length}
													</span>
												</div>
											</div>

											<motion.div
												className="grid grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-4 gap-3"
												initial="hidden"
												animate="visible"
												variants={{
													hidden: { opacity: 0 },
													visible: {
														opacity: 1,
														transition: {
															staggerChildren: 0.05,
															delayChildren: 0.1,
														},
													},
												}}
											>
												{renderItems.map((nameItem) => {
													const isSelected = selectedNames.has(nameItem.id);
													const catImage =
														catImageById.get(nameItem.id) ??
														getRandomCatImage(nameItem.id, CAT_IMAGES);
													return (
														<div
															key={nameItem.id}
															onClick={() => handleToggleName(nameItem.id)}
															onKeyDown={(e) => {
																if (e.key === "Enter" || e.key === " ") {
																	e.preventDefault();
																	handleToggleName(nameItem.id);
																}
															}}
															role="button"
															tabIndex={0}
															className={`mobile-readable-card relative rounded-lg sm:rounded-xl border-2 transition-all overflow-hidden group transform hover:scale-105 active:scale-95 cursor-pointer ${
																isSelected
																	? "border-primary bg-primary/20 shadow-lg shadow-primary/20 ring-2 ring-primary/50"
																	: "border-border/10 bg-foreground/5 hover:border-border/20 hover:bg-foreground/10 hover:shadow-lg"
															}`}
														>
															<div className="aspect-[5/4] sm:aspect-[4/3] w-full relative group/hidden">
																<CatImage
																	src={catImage}
																	alt={nameItem.name}
																	objectFit="cover"
																	containerClassName="w-full h-full"
																	imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
																/>

																{/* Hidden Grid Name Overlay */}
																<div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 bg-gradient-to-t from-background/95 via-background/65 to-transparent flex flex-col justify-end pointer-events-none">
																	<div className="flex flex-col gap-0.5">
																		<div className="flex items-center justify-between gap-2">
																			<span className="mobile-readable-title font-bold text-foreground text-[13px] sm:text-base leading-tight drop-shadow-md truncate">
																				{nameItem.name}
																			</span>
																			{isSelected && (
																				<motion.div
																					initial={{ scale: 0, opacity: 0 }}
																					animate={{ scale: 1, opacity: 1 }}
																					className="shrink-0 size-4 bg-primary rounded-full flex items-center justify-center shadow-md"
																				>
																					<Check size={10} className="text-primary-foreground" />
																				</motion.div>
																			)}
																		</div>
																		{nameItem.pronunciation && (
																			<span className="mobile-readable-meta text-warning text-[11px] sm:text-sm leading-tight font-bold italic opacity-95 drop-shadow-md truncate">
																				[{nameItem.pronunciation}]
																			</span>
																		)}
																		{nameItem.description && (
																			<p className="mobile-readable-description text-foreground/95 text-[11px] sm:text-sm leading-snug line-clamp-2 sm:line-clamp-3 mt-1 drop-shadow-sm italic">
																				{nameItem.description}
																			</p>
																		)}
																	</div>
																</div>

																<Button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		handleOpenLightbox(nameItem.id);
																	}}
																	variant="ghost"
																	size="icon"
																	iconOnly={true}
																	shape="pill"
																	className="absolute top-1.5 right-1.5 z-10 size-7 bg-foreground/60 text-background opacity-100 backdrop-blur-sm hover:bg-foreground/80 hover:text-background md:opacity-0 md:group-hover/hidden:opacity-100 sm:top-2 sm:right-2 sm:size-9"
																	aria-label="View full size"
																>
																	<ZoomIn size={14} />
																</Button>
															</div>
															{isAdmin && (
																<div className="px-3 pb-3">
																	<Button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			requestAdminAction({
																				type: "toggle-hidden",
																				nameId: nameItem.id,
																				isCurrentlyEnabled: true,
																			});
																		}}
																		disabled={togglingHidden.has(nameItem.id)}
																		variant="secondary"
																		className={`w-full bg-success text-success-foreground hover:bg-success/80 hover:text-success-foreground ${
																			togglingHidden.has(nameItem.id)
																				? "opacity-50 cursor-not-allowed"
																				: ""
																		}`}
																	>
																		{togglingHidden.has(nameItem.id) ? (
																			<div className="flex items-center justify-center gap-1">
																				<div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
																				<span>Processing...</span>
																			</div>
																		) : (
																			<>
																				<Eye size={12} className="mr-1 inline" />
																				Unhide
																			</>
																		)}
																	</Button>
																</div>
															)}
														</div>
													);
												})}
											</motion.div>
											{hiddenFiltered.length === 0 && (
												<div className="mt-4 rounded-xl border border-border/10 bg-foreground/5 px-4 py-6 text-center text-sm text-foreground/70">
													No hidden names match this filter.
												</div>
											)}

											{hiddenFiltered.length > hiddenRenderCount && (
												<div className="mt-4 flex justify-center">
													<Button
														onClick={() => setHiddenRenderCount((c) => c + 24)}
														variant="glass"
														size="sm"
													>
														Load more
													</Button>
												</div>
											)}
										</div>
									</CollapsibleContent>
								</div>
							);
						})()}
					</div>
				)}
			</div>

			{lightboxOpen && (
				<Lightbox
					images={catImages}
					currentIndex={lightboxIndex}
					onClose={() => setLightboxOpen(false)}
					onNavigate={setLightboxIndex}
				/>
			)}

			<ConfirmDialog
				open={Boolean(pendingAdminAction)}
				title={
					pendingAdminAction?.type === "toggle-hidden"
						? pendingAdminAction.isCurrentlyEnabled
							? "Unhide this name?"
							: "Hide this name?"
						: pendingAdminAction?.isCurrentlyEnabled
							? "Unlock this name?"
							: "Lock this name?"
				}
				description={
					pendingAdminAction?.type === "toggle-hidden"
						? `${confirmActionName} will ${pendingAdminAction.isCurrentlyEnabled ? "be visible to everyone again." : "be removed from public view."}`
						: `${confirmActionName} will ${pendingAdminAction?.isCurrentlyEnabled ? "be removed from the locked list." : "stay selected for all users."}`
				}
				confirmLabel={
					pendingAdminAction?.type === "toggle-hidden"
						? pendingAdminAction?.isCurrentlyEnabled
							? "Unhide"
							: "Hide"
						: pendingAdminAction?.isCurrentlyEnabled
							? "Unlock"
							: "Lock"
				}
				confirmTone="danger"
				loading={isPendingActionBusy}
				onCancel={cancelAdminAction}
				onConfirm={confirmAdminAction}
			/>
		</div>
	);
}
