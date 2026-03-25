/**
 * @module NameSelector
 * @description Name selection component with grid and swipe modes, showing cat images from Supabase
 */

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/providers/Providers";
import { useAdminActionConfirmation } from "@/features/tournament/hooks/useAdminActionConfirmation";
import Button from "@/shared/components/layout/Button";
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
import { isRpcSignatureError } from "@/shared/lib/errors";
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
import { api } from "@/shared/services/apiClient";
import {
	coreAPI,
	hiddenNamesAPI,
	isUsingFallbackData,
} from "@/shared/services/supabase/api";
import { resolveSupabaseClient } from "@/shared/services/supabase/client";
import { withSupabase } from "@/shared/services/supabase/runtime";
import type { IdType, NameItem } from "@/shared/types";
import useAppStore from "@/store/appStore";

const SWIPE_OFFSET_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;

// Smart tooltip positioning hook - positions tooltip on the best side
function useSmartTooltip() {
	const tooltipRef = useRef<HTMLDivElement>(null);
	const [tooltipPosition, setTooltipPosition] = useState<"top" | "bottom">(
		"top",
	);

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
}: {
	nameItem: NameItem;
	variant?: "grid" | "swipe";
}) => {
	const isGrid = variant === "grid";
	const nameClasses = isGrid
		? "mobile-readable-title font-bold text-foreground text-sm sm:text-base leading-tight drop-shadow-lg"
		: "font-whimsical text-4xl lg:text-5xl text-foreground tracking-wide drop-shadow-2xl break-words w-full text-center";

	const pronunciationClasses = isGrid
		? "mobile-readable-meta text-warning/90 text-xs sm:text-sm leading-tight font-bold italic drop-shadow-md"
		: "text-warning text-2xl lg:text-3xl font-bold italic opacity-90";

	const descriptionClasses = isGrid
		? "mobile-readable-description text-foreground/85 text-xs sm:text-sm leading-snug line-clamp-2 sm:line-clamp-2 mt-1 drop-shadow-sm font-medium"
		: "text-foreground/90 text-sm md:text-base leading-relaxed max-w-md mt-3 drop-shadow-sm line-clamp-3 text-center";

	return (
		<>
			<span className={nameClasses}>{nameItem.name}</span>
			{nameItem.pronunciation && (
				<span
					className={
						isGrid ? pronunciationClasses : `${pronunciationClasses} block mt-2`
					}
				>
					[{nameItem.pronunciation}]
				</span>
			)}
			{nameItem.description && (
				<p className={descriptionClasses}>{nameItem.description}</p>
			)}
		</>
	);
};

// Zoom button component
const ZoomButton = ({
	nameId,
	onClick,
}: {
	nameId: IdType;
	onClick: (id: IdType) => void;
}) => (
	<button
		type="button"
		onClick={(e) => {
			e.stopPropagation();
			onClick(nameId);
		}}
		className="absolute top-3 right-3 p-2 sm:p-2.5 rounded-full bg-foreground/70 backdrop-blur-md text-background opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none transition-all duration-300 hover:bg-foreground/90 hover:scale-110 z-10"
		aria-label="View full size"
	>
		<ZoomIn size={14} />
	</button>
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
	const isLocked = actionType === "toggle-locked";
	const isEnabled = isHidden ? isNameHidden(nameItem) : isNameLocked(nameItem);

	const buttonClasses = `flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
		isHidden
			? isEnabled
				? "bg-success hover:bg-success/80 text-success-foreground shadow-success/25"
				: "bg-destructive hover:bg-destructive/80 text-destructive-foreground shadow-destructive/25"
			: isEnabled
				? "bg-muted hover:bg-muted/80 text-muted-foreground shadow-muted/25"
				: "bg-warning hover:bg-warning/80 text-warning-foreground shadow-warning/25"
	} ${isProcessing ? "opacity-50 cursor-not-allowed" : ""} shadow-lg`;

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
		"mobile-readable-card relative group rounded-xl sm:rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300";
	const selectedClasses = isSelected
		? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-xl shadow-primary/20 ring-4 ring-primary/30 scale-[1.02] z-10"
		: "border-border/20 bg-gradient-to-br from-foreground/5 to-foreground/0 hover:border-border/40 hover:bg-gradient-to-br hover:from-foreground/10 hover:to-foreground/5 hover:shadow-xl hover:shadow-foreground/10";
	const lockedClasses = isLocked ? "opacity-60 cursor-not-allowed" : "";

	return `${baseClasses} ${selectedClasses} ${lockedClasses}`;
};

// Name overlay styles utility
const getNameOverlayClasses = (variant: "grid" | "swipe") => {
	const baseClasses =
		"absolute flex flex-col justify-center items-center text-center pointer-events-none";
	const gridClasses =
		"inset-0 p-3 sm:p-4 bg-gradient-to-t from-background/98 via-background/70 to-transparent";
	const swipeClasses =
		"inset-0 p-8 bg-gradient-to-t from-background/95 via-background/40 to-transparent z-10";

	return `${baseClasses} ${variant === "grid" ? gridClasses : swipeClasses}`;
};

export function NameSelector() {
	const toast = useToast();
	const [selectedNames, setSelectedNames] = useState<Set<IdType>>(new Set());
	const isSwipeMode = useAppStore((state) => state.ui.isSwipeMode);
	const isAdmin = useAppStore((state) => state.user.isAdmin);
	const userName = useAppStore((state) => state.user.name);
	const tournamentActions = useAppStore((state) => state.tournamentActions);
	const [swipedIds, setSwipedIds] = useState<Set<IdType>>(new Set());
	const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(
		null,
	);
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
		const images = names.map((nameItem) =>
			getRandomCatImage(nameItem.id, CAT_IMAGES),
		);
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

				const fetchedNames = await coreAPI.getTrendingNames(true); // Include hidden names for everyone
				if (fetchedNames.length === 0) {
					try {
						await api.get<unknown[]>("/names?includeHidden=true");
					} catch (probeError) {
						const hasSupabaseFallback =
							Boolean(import.meta.env.VITE_SUPABASE_URL) &&
							Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

						if (!hasSupabaseFallback) {
							throw new Error(
								"Could not load cards from backend. `/api/names` is unreachable and Supabase fallback is not configured.",
							);
						}

						console.warn(
							"Backend probe failed but Supabase fallback is configured:",
							probeError,
						);
					}
				}
				setNames(fetchedNames);
				setCachedData(fetchedNames, true);
				setRetryCount(0); // Reset retry count on success
			} catch (error) {
				console.error("Failed to fetch names:", error);
				const errorMessage =
					error instanceof Error ? error.message : "Failed to load names";
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

	// Auto-select locked-in names when names are loaded
	useEffect(() => {
		if (names.length > 0) {
			const lockedInIds = new Set(getLockedNames(names).map((name) => name.id));

			if (lockedInIds.size > 0) {
				setSelectedNames((prev) => {
					const newSelection = new Set(prev);
					lockedInIds.forEach((id) => {
						newSelection.add(id);
					});
					return newSelection;
				});
			}
		}
	}, [names]);

	const syncSelectionToStore = useCallback(
		(nextSelectedIds: Set<IdType>) => {
			const selectedNameItems = names.filter((n) => nextSelectedIds.has(n.id));
			tournamentActions.setSelection(selectedNameItems);
		},
		[names, tournamentActions],
	);

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

	const markSwiped = useCallback(
		(nameId: IdType, direction: "left" | "right") => {
			setSwipedIds((prev) => {
				const next = new Set(prev);
				next.add(nameId);
				return next;
			});
			setSwipeHistory((prev) => [
				...prev,
				{ id: nameId, direction, timestamp: Date.now() },
			]);
		},
		[],
	);

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
			const isRightSwipe =
				offset > SWIPE_OFFSET_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;
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
				// Ensure user context is set
				await withSupabase(async (_client) => {
					try {
						const client = await resolveSupabaseClient();
						if (client) {
							await client.rpc("set_user_context", {
								user_name_param: userName.trim(),
							});
						}
					} catch {
						/* ignore */
					}
				}, null);

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
				toast.showSuccess(
					isCurrentlyHidden ? "Name is visible again." : "Name is now hidden.",
				);
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
				const result = await withSupabase(async (client) => {
					try {
						await client.rpc("set_user_context", {
							user_name_param: userName.trim(),
						});
					} catch {
						/* ignore */
					}

					const canonicalArgs = {
						p_name_id: String(nameId),
						p_locked_in: !isCurrentlyLocked,
					};
					let rpcResult = await client.rpc(
						"toggle_name_locked_in",
						canonicalArgs,
					);

					if (
						rpcResult.error &&
						isRpcSignatureError(rpcResult.error.message || "")
					) {
						rpcResult = await client.rpc("toggle_name_locked_in", {
							...canonicalArgs,
							p_user_name: userName.trim(),
						});
					}

					if (rpcResult.error) {
						throw new Error(
							rpcResult.error.message || "Failed to toggle locked status",
						);
					}
					if (rpcResult.data !== true) {
						throw new Error("Failed to toggle locked status");
					}
					return rpcResult.data;
				}, null);

				if (result) {
					const fetchedNames = await coreAPI.getTrendingNames(true);
					setNames(fetchedNames);
					toast.showSuccess(
						isCurrentlyLocked ? "Name unlocked." : "Name locked in.",
					);
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
	const previewItems = useMemo(
		() => hiddenNamesAll.slice(0, 6),
		[hiddenNamesAll],
	);
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
		[names, setLightboxIndex, setLightboxOpen],
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

		const randomIds = new Set(
			pool.slice(0, targetCount).map((name) => name.id),
		);
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
	}, [
		availableNames,
		syncSelectionToStore,
		toast,
		triggerHaptic,
		deferredSync,
	]);

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
					<Button
						onClick={() => setRetryCount((prev) => prev + 1)}
						variant="glass"
						size="small"
					>
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full">
			<div className="space-y-4 sm:space-y-6 mobile-nav-safe-bottom">
				{/* Current Names - Prominent Display */}
				{lockedInNames.length > 0 && (
					<div className="flex flex-col items-center gap-1.5 sm:gap-2 px-2 sm:px-4">
						<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
							My cat is named
						</span>
						<div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 relative z-[60]">
							{lockedInNames.map((nameItem, index) => (
								<motion.div
									key={nameItem.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.05 }}
									whileHover={{ y: -1 }}
									className="group relative px-2.5 py-1 sm:px-4 sm:py-2 bg-gradient-to-b from-warning/15 to-warning/5 border border-warning/25 rounded-md"
								>
									<span className="text-foreground font-medium text-xs sm:text-sm">
										{nameItem.name}
									</span>
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
													<div className="name-lock-tooltip__label">
														Pronunciation
													</div>
													<div className="name-lock-tooltip__pronunciation">
														{nameItem.pronunciation}
													</div>
												</div>
											)}
											<div className="name-lock-tooltip__body">
												{nameItem.description}
											</div>
											<div className="name-lock-tooltip__arrow" />
										</div>
									)}
								</motion.div>
							))}
						</div>
					</div>
				)}

				{/* Selection Controls + Mode Toggle (inline on mobile) */}
				<div className="relative px-2 sm:px-4 py-2">
					{/* Progress Bar - compact on mobile */}
					<div className="mb-3 sm:mb-4">
						<div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">
							<span className="font-medium">
								{selectedAvailableCount} selected
							</span>
							<div className="flex items-center gap-2">
								{/* Mode toggle inline on mobile */}
								<button
									type="button"
									onClick={() => {
										const { setSwipeMode } = useAppStore.getState().uiActions;
										setSwipeMode(!isSwipeMode);
									}}
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/20 bg-foreground/5 text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
									aria-label={
										isSwipeMode ? "Switch to grid mode" : "Switch to swipe mode"
									}
								>
									{isSwipeMode ? "Swipe" : "Grid"}
								</button>
								<span className="tabular-nums font-mono">
									{selectedAvailableCount}/{availableNames.length}
								</span>
							</div>
						</div>
						<div className="w-full h-1.5 sm:h-2 bg-border/20 rounded-full overflow-hidden">
							<motion.div
								className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
								initial={{ width: 0 }}
								animate={{
									width: `${(selectedAvailableCount / Math.max(availableNames.length, 1)) * 100}%`,
								}}
								transition={{ duration: 0.5, ease: "easeOut" }}
							/>
						</div>
						{selectedHiddenCount > 0 && (
							<div className="mt-1.5 text-center">
								<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning/80 rounded-full text-[10px] font-medium">
									<EyeOff size={10} />
									{selectedHiddenCount} hidden selected
								</span>
							</div>
						)}
					</div>

					{/* Action Buttons - stacked on very small screens */}
					<div className="flex items-center justify-center">
						{isSwipeMode && swipeHistory.length > 0 ? (
							<div className="flex items-center gap-3">
								<Button
									onClick={handleUndo}
									variant="outline"
									size="small"
									className="gap-2 border-warning/20 text-warning hover:bg-warning/10 hover:border-warning"
								>
									<Undo2 size={14} />
									Undo ({swipeHistory.length})
								</Button>
							</div>
						) : (
							<div className="inline-flex flex-wrap items-center justify-center gap-1 sm:gap-0 p-1 bg-background/50 backdrop-blur-sm rounded-xl border border-border/20 shadow-sm">
								<Button
									variant="ghost"
									size="sm"
									onClick={handleSelectAllAvailable}
									disabled={!canSelectAllAvailable}
									className="gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 hover:bg-accent/50 transition-colors"
								>
									<CheckCircle size={14} />
									All
								</Button>
								<div className="hidden sm:block w-px h-4 bg-border/30" />
								<Button
									variant="ghost"
									size="sm"
									onClick={handleSelectRandomAvailable}
									className="gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm font-medium hover:bg-accent/50 transition-colors"
								>
									<Shuffle size={14} />
									Random
								</Button>
								<div className="hidden sm:block w-px h-4 bg-border/30" />
								<Button
									variant="ghost"
									size="sm"
									onClick={handleClearSelection}
									disabled={!hasAnySelection}
									className="gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs sm:text-sm font-medium disabled:opacity-50 hover:bg-accent/50 transition-colors"
								>
									<X size={14} />
									Clear
								</Button>
							</div>
						)}
					</div>
				</div>

				{isSwipeMode ? (
					<>
						<div
							className="relative w-full flex items-center justify-center"
							style={{ minHeight: "min(70dvh, 550px)" }}
						>
							<AnimatePresence mode="popLayout">
								{visibleCards.length > 0 ? (
									cardsToRender.map((nameItem, index) => {
										const catImage =
											catImageById.get(nameItem.id) ??
											getRandomCatImage(nameItem.id, CAT_IMAGES);
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
													className="w-full max-w-md"
													style={{ height: "min(65dvh, 500px)" }}
												>
													<Card
														className={`relative overflow-hidden group transition-all duration-200 h-full ${
															selectedNames.has(nameItem.id)
																? "shadow-[0_0_30px_hsl(var(--success)/0.3)]"
																: ""
														} ${
															index === 0
																? "cursor-grab active:cursor-grabbing shadow-2xl active:scale-95"
																: "pointer-events-none"
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
																		<X
																			size={24}
																			className="text-destructive-foreground"
																		/>
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
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		handleOpenLightbox(nameItem.id);
																	}}
																	className="absolute top-4 right-4 p-2.5 rounded-full bg-foreground/50 backdrop-blur-sm text-background opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none transition-opacity hover:bg-foreground/70 z-30"
																	aria-label="View full size"
																>
																	<ZoomIn size={18} />
																</button>
															)}

															{/* Name and Info Overlay */}
															<div className={getNameOverlayClasses("swipe")}>
																<div className="flex flex-col gap-1.5 max-w-full">
																	<NameContent
																		nameItem={nameItem}
																		variant="swipe"
																	/>
																</div>

																{isAdmin && (
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			requestAdminAction({
																				type: "toggle-hidden",
																				nameId: nameItem.id,
																				isCurrentlyEnabled:
																					isNameHidden(nameItem),
																			});
																		}}
																		disabled={togglingHidden.has(nameItem.id)}
																		className={`mt-4 flex items-center gap-2 pointer-events-auto w-fit text-sm font-bold tracking-wider uppercase transition-all ${
																			togglingHidden.has(nameItem.id)
																				? "text-muted-foreground cursor-not-allowed"
																				: "text-warning hover:text-warning/80 hover:scale-105 active:scale-95"
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
																	</button>
																)}

																{selectedNames.has(nameItem.id) && (
																	<div className="flex mt-4">
																		<div className="px-4 py-1.5 bg-success/30 backdrop-blur-md border border-success/40 rounded-full flex items-center gap-2 shadow-lg shadow-success/20">
																			<Check
																				size={16}
																				className="text-success"
																			/>
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
												transition={{
													delay: 0.2,
													type: "spring",
													stiffness: 400,
													damping: 25,
												}}
												className="mx-auto w-20 h-20 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center shadow-xl shadow-success/30"
											>
												<Check
													size={40}
													className="text-success-foreground"
													strokeWidth={3}
												/>
											</motion.div>
											<div className="space-y-3">
												<h2 className="text-3xl sm:text-4xl font-bold text-foreground">
													All done!
												</h2>
												<p className="text-muted-foreground text-lg leading-relaxed">
													You've reviewed all names. Ready to start the
													tournament?
												</p>
											</div>
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{ delay: 0.4 }}
												className="pt-4"
											>
												<Button
													onClick={() => {
														// Navigate to tournament or next step
														window.location.href = "/tournament";
													}}
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
										<span className="text-xs text-muted-foreground font-medium">
											Skip
										</span>
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
										<span className="text-xs text-muted-foreground font-medium">
											Select
										</span>
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
									<div className="grid grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
										{activeNames.map((nameItem) => {
											const isSelected = selectedNames.has(nameItem.id);
											const catImage =
												catImageById.get(nameItem.id) ??
												getRandomCatImage(nameItem.id, CAT_IMAGES);
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
													whileHover={{ scale: 1.03, y: -2 }}
													whileTap={{ scale: 0.97 }}
													transition={{
														type: "spring",
														stiffness: 400,
														damping: 25,
													}}
													className={getCardStyles(
														isSelected,
														isNameLocked(nameItem),
													)}
												>
													<div className="w-full relative aspect-[5/4] sm:aspect-[4/3] group/img">
														<CatImage
															src={catImage}
															alt={nameItem.name}
															objectFit="cover"
															containerClassName="w-full h-full"
															imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
														/>

														{/* Selection Badge */}
														{isSelected && <SelectionBadge />}

														{/* Enhanced Name Overlay */}
														<div className={getNameOverlayClasses("grid")}>
															<div className="flex flex-col gap-1.5 max-w-full">
																<NameContent
																	nameItem={nameItem}
																	variant="grid"
																/>
															</div>
														</div>

														{/* Enhanced Zoom Button */}
														<ZoomButton
															nameId={nameItem.id}
															onClick={handleOpenLightbox}
														/>
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
										<button
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
											className="w-full flex flex-wrap items-center justify-between gap-2 sm:gap-3"
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
												{hiddenPanel.isCollapsed
													? "Click to expand"
													: "Click to collapse"}
											</span>
										</button>

										{hiddenPanel.isCollapsed && (
											<div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
												{previewItems.map((n) => {
													const img =
														catImageById.get(n.id) ??
														getRandomCatImage(n.id, CAT_IMAGES);
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

									<CollapsibleContent
										id="hidden-names-panel"
										isCollapsed={hiddenPanel.isCollapsed}
									>
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
														<button
															type="button"
															onClick={() => {
																setHiddenQuery("");
																setHiddenRenderCount(24);
															}}
															className="px-3 py-2 border border-border/10 bg-foreground/5 text-xs text-foreground/80 hover:bg-foreground/10"
														>
															Clear search
														</button>
													)}
													<button
														type="button"
														onClick={() => setHiddenShowSelectedOnly((v) => !v)}
														className={`px-3 py-2 border text-xs font-medium ${
															hiddenShowSelectedOnly
																? "bg-primary/20 border-primary/40 text-foreground"
																: "bg-foreground/5 border-border/10 text-foreground/80"
														}`}
													>
														Selected only
													</button>
													<span className="text-xs text-muted-foreground">
														{hiddenFiltered.length} / {hiddenNamesAll.length}
													</span>
												</div>
											</div>

											<div className="grid grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-4 gap-3">
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
																					<Check
																						size={10}
																						className="text-primary-foreground"
																					/>
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

																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		handleOpenLightbox(nameItem.id);
																	}}
																	className="absolute top-1.5 right-1.5 p-1.5 sm:top-2 sm:right-2 sm:p-2 rounded-full bg-foreground/60 backdrop-blur-sm text-background opacity-100 md:opacity-0 md:group-hover/hidden:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:outline-none transition-opacity hover:bg-foreground/80 z-10"
																	aria-label="View full size"
																>
																	<ZoomIn size={14} />
																</button>
															</div>
															{isAdmin && (
																<div className="px-3 pb-3">
																	<button
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
																		className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-success hover:bg-success/80 text-success-foreground ${
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
																				<Eye
																					size={12}
																					className="mr-1 inline"
																				/>
																				Unhide
																			</>
																		)}
																	</button>
																</div>
															)}
														</div>
													);
												})}
											</div>
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
														size="small"
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
