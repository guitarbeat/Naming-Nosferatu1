/**
 * @module NameSelector
 * @description Name selection component with grid and swipe modes, showing cat images from Supabase
 */

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeList as List } from "react-window";
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
        X,
        ZoomIn,
} from "@/shared/lib/icons";
import { api } from "@/shared/services/apiClient";
import { coreAPI, hiddenNamesAPI, isUsingFallbackData } from "@/shared/services/supabase/api";
import { resolveSupabaseClient } from "@/shared/services/supabase/client";
import { withSupabase } from "@/shared/services/supabase/runtime";
import type { IdType, NameItem } from "@/shared/types";
import useAppStore from "@/store/appStore";

const SWIPE_OFFSET_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;

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

// Virtualized row renderer for name cards
const VirtualizedNameRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
	const nameItem = cardsToRender[index];
	if (!nameItem) return null;
	
	const catImage = catImageById.get(nameItem.id) ?? getRandomCatImage(nameItem.id, CAT_IMAGES);
	const isSelected = selectedNames.has(nameItem.id);
	
	return (
		<div style={style}>
			<motion.div
				key={nameItem.id}
				layout={true}
				layoutId={String(nameItem.id)}
				className="relative flex items-center justify-center"
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
						y: 0,
					}}
					transition={SMOOTH_SPRING_CONFIG}
					whileDrag={{
						scale: 1.02,
						transition: { duration: 0.15 },
					}}
					className="w-full max-w-md"
				>
					<Card
						name={nameItem}
						catImage={catImage}
						isSelected={isSelected}
						isLocked={isNameLocked(nameItem)}
						isHidden={isNameHidden(nameItem)}
						rating={nameItem.avgRating}
						// Swipe-specific props only for first card
						isFirstCard={index === 0}
						onSelect={() => handleNameSelect(nameItem.id)}
						onQuickAction={(action) => handleQuickAction(nameItem.id, action)}
						onImageClick={() => handleImageClick(catImage)}
					/>
				</motion.div>
			</motion.div>
		</div>
	);
};

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

export function NameSelector() {
        const toast = useToast();
        const [selectedNames, setSelectedNames] = useState<Set<IdType>>(new Set());
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

                                                console.warn("Backend probe failed but Supabase fallback is configured:", probeError);
                                        }
                                }
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
                        toast.showWarning("Using demo data - database connection unavailable. Your votes won't be saved to the global leaderboard.");
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
                                        syncSelectionToStore(next);
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
                [markSwiped, syncSelectionToStore, triggerHaptic],
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
                                syncSelectionToStore(next);
                                return next;
                        });
                }

                triggerHaptic();
        }, [swipeHistory, syncSelectionToStore, triggerHaptic]);

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
                                                        await client.rpc("set_user_context", { user_name_param: userName.trim() });
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
                                const result = await withSupabase(async (client) => {
                                        try {
                                                await client.rpc("set_user_context", { user_name_param: userName.trim() });
                                        } catch {
                                                /* ignore */
                                        }

                                        const canonicalArgs = {
                                                p_name_id: String(nameId),
                                                p_locked_in: !isCurrentlyLocked,
                                        };
                                        let rpcResult = await client.rpc("toggle_name_locked_in", canonicalArgs);

                                        if (rpcResult.error && isRpcSignatureError(rpcResult.error.message || "")) {
                                                rpcResult = await client.rpc("toggle_name_locked_in", {
                                                        ...canonicalArgs,
                                                        p_user_name: userName.trim(),
                                                });
                                        }

                                        if (rpcResult.error) {
                                                throw new Error(rpcResult.error.message || "Failed to toggle locked status");
                                        }
                                        if (rpcResult.data !== true) {
                                                throw new Error("Failed to toggle locked status");
                                        }
                                        return rpcResult.data;
                                }, null);

                                if (result) {
                                        const fetchedNames = await coreAPI.getTrendingNames(true);
                                        setNames(fetchedNames);
                                        toast.showSuccess(isCurrentlyLocked ? "Name unlocked." : "Name locked in.");
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
                        syncSelectionToStore(next);
                        return next;
                });
                triggerHaptic();
        }, [availableNames, syncSelectionToStore, triggerHaptic]);

        const handleClearSelection = useCallback(() => {
                const lockedIds = new Set(getLockedNames(names).map((name) => name.id));
                setSelectedNames(lockedIds);
                syncSelectionToStore(lockedIds);
                triggerHaptic();
        }, [names, syncSelectionToStore, triggerHaptic]);

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
                        syncSelectionToStore(next);
                        return next;
                });
                triggerHaptic();
                toast.showSuccess(`Added ${targetCount} random names.`);
        }, [availableNames, syncSelectionToStore, toast, triggerHaptic]);

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
                                        <Button onClick={() => setRetryCount((prev) => prev + 1)} variant="glass" size="small">
                                                Try Again
                                        </Button>
                                </div>
                        </div>
                );
        }

        return (
                <div className="mx-auto w-full">
                        <div className="space-y-6 mobile-nav-safe-bottom">
                                {(() => {
                                        const lockedInNames = getLockedNames(names);
                                        if (lockedInNames.length === 0) {
                                                return null;
                                        }
                                        return (
                                                <div className="text-center space-y-4">
                                                        <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter">
                                                                My cat's name is
                                                        </h3>
                                                        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 w-full px-2 relative z-[60]">
                                                                {lockedInNames.map((nameItem) => (
                                                                        <motion.div
                                                                                key={nameItem.id}
                                                                                whileHover={{ y: -4, scale: 1.02 }}
                                                                                className="group relative shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 border-[1px] md:border-2 border-warning/30 bg-warning/10 ring-1 md:ring-2 ring-warning/40 shadow-[0_0_15px_hsl(var(--warning)/0.15)] rounded-sm"
                                                                        >
                                                                                <div className="text-foreground font-bold text-xs sm:text-sm md:text-base lg:text-lg">
                                                                                        {nameItem.name}
                                                                                </div>

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
                                        );
                                })()}

                                <div className="text-center space-y-4 mt-2">
                                        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                                                {isSwipeMode
                                                        ? "Swipe right to select, left to skip. You can also use arrow keys (or A/D) and Ctrl+Z to undo."
                                                        : "Click to select names • Select at least 2 names • 2v2 auto-enables when selected count is divisible by 4 (and >=4), otherwise 1v1"}
                                        </p>
                                        <div
                                                className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground"
                                                aria-live="polite"
                                        >
                                                <span>
                                                        Selected: {selectedAvailableCount} / {availableNames.length}
                                                </span>
                                                {selectedHiddenCount > 0 && <span>Hidden selected: {selectedHiddenCount}</span>}
                                                {isSwipeMode && swipeHistory.length > 0 && (
                                                        <Button
                                                                onClick={handleUndo}
                                                                variant="glass"
                                                                size="small"
                                                                className="px-3 py-1 text-xs"
                                                        >
                                                                Undo Last ({swipeHistory.length})
                                                        </Button>
                                                )}
                                        </div>
                                        {!isSwipeMode && (
                                                <div className="mx-auto flex w-full max-w-sm flex-col items-stretch gap-2 min-[420px]:max-w-xl min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:justify-center">
                                                        <Button
                                                                variant="glass"
                                                                size="small"
                                                                onClick={handleSelectAllAvailable}
                                                                disabled={!canSelectAllAvailable}
                                                                className="w-full min-[420px]:w-auto"
                                                        >
                                                                Select all visible
                                                        </Button>
                                                        <Button
                                                                variant="glass"
                                                                size="small"
                                                                onClick={handleSelectRandomAvailable}
                                                                className="w-full min-[420px]:w-auto"
                                                        >
                                                                <Shuffle size={14} />
                                                                Pick 8 random
                                                        </Button>
                                                        <Button
                                                                variant="glass"
                                                                size="small"
                                                                onClick={handleClearSelection}
                                                                disabled={!hasAnySelection}
                                                                className="w-full min-[420px]:w-auto"
                                                        >
                                                                Clear selection
                                                        </Button>
                                                </div>
                                        )}
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
                                                                                                        className="w-full max-w-md h-[550px]"
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
                                                                                                                                        <div className="flex items-center gap-2 px-6 py-3 bg-red-500/90 backdrop-blur-md rounded-full border-2 border-red-500 shadow-lg rotate-[-20deg]">
                                                                                                                                                <X size={24} className="text-white" />
                                                                                                                                                <span className="text-white font-black text-lg uppercase">
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
                                                                                                                                        <div className="flex items-center gap-2 px-6 py-3 bg-green-500/90 backdrop-blur-md rounded-full border-2 border-green-500 shadow-lg rotate-[20deg]">
                                                                                                                                                <Heart size={24} className="text-white fill-white" />
                                                                                                                                                <span className="text-white font-black text-lg uppercase">
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
                                                                                                                                        className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none transition-opacity hover:bg-black/70 z-30"
                                                                                                                                        aria-label="View full size"
                                                                                                                                >
                                                                                                                                        <ZoomIn size={18} />
                                                                                                                                </button>
                                                                                                                        )}

                                                                                                                        {/* Name and Info Overlay */}
                                                                                                                        <div className="relative z-10 p-8 bg-gradient-to-t from-background/95 via-background/40 to-transparent flex flex-col justify-end pointer-events-none">
                                                                                                                                <h3 className="font-whimsical text-4xl lg:text-5xl text-foreground tracking-wide drop-shadow-2xl break-words w-full">
                                                                                                                                        {nameItem.name}
                                                                                                                                        {nameItem.pronunciation && (
                                                                                                                                                <span className="ml-3 text-amber-400 text-2xl lg:text-3xl font-bold italic opacity-90">
                                                                                                                                                        [{nameItem.pronunciation}]
                                                                                                                                                </span>
                                                                                                                                        )}
                                                                                                                                </h3>
                                                                                                                                {nameItem.description && (
                                                                                                                                        <p className="text-foreground/90 text-sm md:text-base leading-relaxed max-w-md mt-3 drop-shadow-sm line-clamp-3">
                                                                                                                                                {nameItem.description}
                                                                                                                                        </p>
                                                                                                                                )}

                                                                                                                                {isAdmin && (
                                                                                                                                        <button
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
                                                                                                                                                className={`mt-4 flex items-center gap-2 pointer-events-auto w-fit text-sm font-bold tracking-wider uppercase transition-all ${
                                                                                                                                                        togglingHidden.has(nameItem.id)
                                                                                                                                                                ? "text-slate-500 cursor-not-allowed"
                                                                                                                                                                : "text-amber-400 hover:text-amber-300 hover:scale-105 active:scale-95"
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
                                                                                                                                                <div className="px-4 py-1.5 bg-green-500/30 backdrop-blur-md border border-green-500/40 rounded-full flex items-center gap-2 shadow-lg shadow-green-500/20">
                                                                                                                                                        <Check size={16} className="text-green-400" />
                                                                                                                                                        <span className="text-green-400 font-black text-xs tracking-[0.2em] uppercase">
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
                                                                                <div className="text-center space-y-4">
                                                                                        <p className="text-2xl font-bold text-foreground">All done!</p>
                                                                                        <p className="text-muted-foreground">
                                                                                                You've reviewed all names. Ready to start?
                                                                                        </p>
                                                                                </div>
                                                                        </div>
                                                                )}
                                                        </AnimatePresence>
                                                </div>

                                                {visibleCards.length > 0 && (
                                                        <div className="flex items-center justify-center gap-8 mt-8 pb-4">
                                                                <Button
                                                                        variant="outline"
                                                                        iconOnly={true}
                                                                        className="h-16 w-16 rounded-full border-2 border-red-500/20 hover:bg-red-500/10 hover:border-red-500 text-red-500 transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-110 active:scale-95"
                                                                        onClick={() => {
                                                                                const currentCard = visibleCards[0];
                                                                                if (currentCard) {
                                                                                        handleSwipe(currentCard.id, "left");
                                                                                }
                                                                        }}
                                                                        aria-label="Skip (Left Arrow)"
                                                                        title="Skip (Left Arrow)"
                                                                >
                                                                        <X size={32} />
                                                                </Button>

                                                                <Button
                                                                        variant="outline"
                                                                        iconOnly={true}
                                                                        className="h-16 w-16 rounded-full border-2 border-green-500/20 hover:bg-green-500/10 hover:border-green-500 text-green-500 transition-all duration-300 shadow-lg hover:shadow-green-500/25 hover:scale-110 active:scale-95"
                                                                        onClick={() => {
                                                                                const currentCard = visibleCards[0];
                                                                                if (currentCard) {
                                                                                        handleSwipe(currentCard.id, "right");
                                                                                }
                                                                        }}
                                                                        aria-label="Select (Right Arrow)"
                                                                        title="Select (Right Arrow)"
                                                                >
                                                                        <Heart size={32} />
                                                                </Button>
                                                        </div>
                                                )}
                                        </>
                                ) : (
                                        <div className="space-y-8">
                                                {(() => {
                                                        const activeNames = getActiveNames(names);
                                                        return (
                                                                activeNames.length > 0 && (
                                                                        <div className="grid grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
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
                                                                                                        whileHover={{ scale: 1.02 }}
                                                                                                        whileTap={{ scale: 0.98 }}
                                                                                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                                                                        className={`mobile-readable-card relative rounded-lg sm:rounded-xl border-2 overflow-hidden cursor-pointer ${
                                                                                                                isSelected
                                                                                                                        ? "border-primary bg-primary/20 shadow-lg shadow-primary/20 ring-2 ring-primary/50"
                                                                                                                        : "border-border/10 bg-foreground/5 hover:border-border/20 hover:bg-foreground/10 hover:shadow-lg"
                                                                                                        } ${isNameLocked(nameItem) ? "opacity-75" : ""}`}
                                                                                                >
                                                                                                        <div className="w-full relative aspect-[5/4] sm:aspect-[4/3] group/img">
                                                                                                                <CatImage
                                                                                                                        src={catImage}
                                                                                                                        alt={nameItem.name}
                                                                                                                        objectFit="cover"
                                                                                                                        containerClassName="w-full h-full"
                                                                                                                        imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                                                                />

                                                                                                                {/* Grid Name Overlay */}
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
                                                                                                                                                        className="shrink-0 size-5 bg-primary rounded-full flex items-center justify-center shadow-lg"
                                                                                                                                                >
                                                                                                                                                        <Check size={12} className="text-white" />
                                                                                                                                                </motion.div>
                                                                                                                                        )}
                                                                                                                                </div>
                                                                                                                                {nameItem.pronunciation && (
                                                                                                                                        <span className="mobile-readable-meta text-amber-300 text-[11px] sm:text-sm leading-tight font-bold italic opacity-95 drop-shadow-md truncate">
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
                                                                                                                        className="absolute top-1.5 right-1.5 p-1.5 sm:top-2 sm:right-2 sm:p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-100 md:opacity-0 md:group-hover/img:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none transition-opacity hover:bg-black/80 z-10"
                                                                                                                        aria-label="View full size"
                                                                                                                >
                                                                                                                        <ZoomIn size={14} />
                                                                                                                </button>
                                                                                                        </div>
                                                                                                        {isAdmin && !isSwipeMode && (
                                                                                                                <motion.div
                                                                                                                        initial={{ opacity: 0, y: 10 }}
                                                                                                                        animate={{ opacity: 1, y: 0 }}
                                                                                                                        transition={{ delay: 0.1 }}
                                                                                                                        className="px-3 pb-3 flex gap-2"
                                                                                                                >
                                                                                                                        {/* Hide/Unhide Button */}
                                                                                                                        <motion.button
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
                                                                                                                                whileHover={{ scale: 1.05 }}
                                                                                                                                whileTap={{ scale: 0.95 }}
                                                                                                                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                                                                                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                                                                                                                                        isNameHidden(nameItem)
                                                                                                                                                ? "bg-green-600 hover:bg-green-700 text-white shadow-green-500/25"
                                                                                                                                                : "bg-red-600 hover:bg-red-700 text-white shadow-red-500/25"
                                                                                                                                } ${togglingHidden.has(nameItem.id) ? "opacity-50 cursor-not-allowed" : ""} shadow-lg`}
                                                                                                                        >
                                                                                                                                {togglingHidden.has(nameItem.id) ? (
                                                                                                                                        <div className="flex items-center justify-center gap-1">
                                                                                                                                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                                                                                                                <span>Processing...</span>
                                                                                                                                        </div>
                                                                                                                                ) : isNameHidden(nameItem) ? (
                                                                                                                                        <>
                                                                                                                                                <Eye size={12} className="mr-1" />
                                                                                                                                                Unhide
                                                                                                                                        </>
                                                                                                                                ) : (
                                                                                                                                        <>
                                                                                                                                                <EyeOff size={12} className="mr-1" />
                                                                                                                                                Hide
                                                                                                                                        </>
                                                                                                                                )}
                                                                                                                        </motion.button>

                                                                                                                        {/* Lock/Unlock Button */}
                                                                                                                        <motion.button
                                                                                                                                type="button"
                                                                                                                                onClick={(e) => {
                                                                                                                                        e.stopPropagation();
                                                                                                                                        requestAdminAction({
                                                                                                                                                type: "toggle-locked",
                                                                                                                                                nameId: nameItem.id,
                                                                                                                                                isCurrentlyEnabled: isNameLocked(nameItem),
                                                                                                                                        });
                                                                                                                                }}
                                                                                                                                disabled={togglingLocked.has(nameItem.id)}
                                                                                                                                whileHover={{ scale: 1.05 }}
                                                                                                                                whileTap={{ scale: 0.95 }}
                                                                                                                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                                                                                                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                                                                                                                                        isNameLocked(nameItem)
                                                                                                                                                ? "bg-gray-600 hover:bg-gray-700 text-white shadow-gray-500/25"
                                                                                                                                                : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25"
                                                                                                                                } ${togglingLocked.has(nameItem.id) ? "opacity-50 cursor-not-allowed" : ""} shadow-lg`}
                                                                                                                        >
                                                                                                                                {togglingLocked.has(nameItem.id) ? (
                                                                                                                                        <div className="flex items-center justify-center gap-1">
                                                                                                                                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                                                                                                                <span>Processing...</span>
                                                                                                                                        </div>
                                                                                                                                ) : isNameLocked(nameItem) ? (
                                                                                                                                        <>
                                                                                                                                                <CheckCircle size={12} className="mr-1" />
                                                                                                                                                Unlock
                                                                                                                                        </>
                                                                                                                                ) : (
                                                                                                                                        <>
                                                                                                                                                <CheckCircle size={12} className="mr-1" />
                                                                                                                                                Lock
                                                                                                                                        </>
                                                                                                                                )}
                                                                                                                        </motion.button>
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
                                                                                                {hiddenPanel.isCollapsed ? "Click to expand" : "Click to collapse"}
                                                                                        </span>
                                                                                </button>

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
                                                                                                                                                                        <Check size={10} className="text-white" />
                                                                                                                                                                </motion.div>
                                                                                                                                                        )}
                                                                                                                                                </div>
                                                                                                                                                {nameItem.pronunciation && (
                                                                                                                                                        <span className="mobile-readable-meta text-amber-300 text-[11px] sm:text-sm leading-tight font-bold italic opacity-95 drop-shadow-md truncate">
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
                                                                                                                                        className="absolute top-1.5 right-1.5 p-1.5 sm:top-2 sm:right-2 sm:p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-100 md:opacity-0 md:group-hover/hidden:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none transition-opacity hover:bg-black/80 z-10"
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
                                                                                                                                                className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-green-600 hover:bg-green-700 text-white ${
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
