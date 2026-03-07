/**
 * @module NameSelector
 * @description Name selection component with grid and swipe modes, showing cat images from Supabase
 */

import { type PanInfo } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/providers/Providers";
import { NameSelectorGridSection } from "@/features/tournament/components/NameSelectorGridSection";
import {
	LockedNamesBanner,
	NameSelectorTopControls,
} from "@/features/tournament/components/NameSelectorHeader";
import { NameSelectorSwipeSection } from "@/features/tournament/components/NameSelectorSwipeSection";
import { useNameSelectorAdminActions } from "@/features/tournament/hooks/useNameSelectorAdminActions";
import { coreAPI } from "@/services/supabase/api";
import Button from "@/shared/components/layout/Button";
import { Card } from "@/shared/components/layout/Card";
import { ConfirmDialog } from "@/shared/components/layout/ConfirmDialog";
import { Loading } from "@/shared/components/layout/Feedback";
import { Lightbox } from "@/shared/components/layout/Lightbox";
import { useCollapsible, useNamesCache } from "@/shared/hooks";
import { getRandomCatImage } from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import type { IdType, NameItem } from "@/shared/types";
import useAppStore from "@/store/appStore";

const SWIPE_OFFSET_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;

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
	const {
		togglingHidden,
		togglingLocked,
		pendingAdminAction,
		setPendingAdminAction,
		requestAdminAction,
		confirmActionName,
		isPendingAdminActionBusy,
		handleConfirmAdminAction,
	} = useNameSelectorAdminActions({
		isAdmin,
		userName,
		toast,
		names,
		setNames,
	});

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

	// Auto-select locked-in names when names are loaded
	useEffect(() => {
		if (names.length > 0) {
			const lockedInIds = new Set(
				names.filter((name) => name.lockedIn || name.locked_in).map((name) => name.id),
			);

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

	const visibleCards = names.filter(
		(name) => !swipedIds.has(name.id) && !(name.lockedIn || name.locked_in),
	);
	const cardsToRender = visibleCards.slice(0, 3);

	const availableNames = useMemo(
		() => names.filter((name) => !(name.lockedIn || name.locked_in) && !name.isHidden),
		[names],
	);
	const hiddenNamesAll = useMemo(() => names.filter((name) => name.isHidden), [names]);
	const hiddenFiltered = useMemo(() => {
		const q = hiddenQuery.trim().toLowerCase();
		return hiddenNamesAll.filter((name) => {
			if (hiddenShowSelectedOnly && !selectedNames.has(name.id)) {
				return false;
			}
			if (!q) {
				return true;
			}
			return (
				name.name.toLowerCase().includes(q) || (name.description ?? "").toLowerCase().includes(q)
			);
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
		const lockedIds = new Set(
			names.filter((name) => name.lockedIn || name.locked_in).map((name) => name.id),
		);
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
			<Card padding="small" shadow="xl" className="max-w-full mx-auto ">
				<div className="flex items-center justify-center py-20">
					<Loading variant="spinner" text="Loading cat names..." />
				</div>
			</Card>
		);
	}

	if (error) {
		return (
			<Card padding="small" shadow="xl" className="max-w-full mx-auto ">
				<div className="flex flex-col items-center justify-center py-20 space-y-4">
					<div className="text-destructive text-center">
						<p className="text-lg font-medium">Failed to load names</p>
						<p className="text-sm opacity-75 mt-1">{error}</p>
					</div>
					<Button onClick={() => setRetryCount((prev) => prev + 1)} variant="glass" size="small">
						Try Again
					</Button>
				</div>
			</Card>
		);
	}

	return (
		<Card padding="small" shadow="xl" className="max-w-full mx-auto ">
			<div className="space-y-6 mobile-nav-safe-bottom">
				<LockedNamesBanner names={names} />
				<NameSelectorTopControls
					isSwipeMode={isSwipeMode}
					selectedAvailableCount={selectedAvailableCount}
					availableCount={availableNames.length}
					selectedHiddenCount={selectedHiddenCount}
					swipeHistoryLength={swipeHistory.length}
					onUndo={handleUndo}
					onSelectAllVisible={handleSelectAllAvailable}
					onPickRandom={handleSelectRandomAvailable}
					onClearSelection={handleClearSelection}
					canSelectAllAvailable={canSelectAllAvailable}
					hasAnySelection={hasAnySelection}
				/>

				{isSwipeMode ? (
					<NameSelectorSwipeSection
						visibleCards={visibleCards}
						cardsToRender={cardsToRender}
						dragDirection={dragDirection}
						dragOffset={dragOffset}
						selectedNames={selectedNames}
						catImageById={catImageById}
						isAdmin={isAdmin}
						togglingHidden={togglingHidden}
						requestAdminAction={requestAdminAction}
						handleOpenLightbox={handleOpenLightbox}
						updateDragState={updateDragState}
						handleDragEnd={handleDragEnd}
						handleSwipe={handleSwipe}
					/>
				) : (
					<NameSelectorGridSection
						names={names}
						selectedNames={selectedNames}
						isSwipeMode={isSwipeMode}
						isAdmin={isAdmin}
						hiddenPanel={hiddenPanel}
						hiddenQuery={hiddenQuery}
						setHiddenQuery={setHiddenQuery}
						hiddenShowSelectedOnly={hiddenShowSelectedOnly}
						setHiddenShowSelectedOnly={setHiddenShowSelectedOnly}
						hiddenRenderCount={hiddenRenderCount}
						setHiddenRenderCount={setHiddenRenderCount}
						hiddenNamesAll={hiddenNamesAll}
						hiddenFiltered={hiddenFiltered}
						previewItems={previewItems}
						renderItems={renderItems}
						catImageById={catImageById}
						togglingHidden={togglingHidden}
						togglingLocked={togglingLocked}
						handleToggleName={handleToggleName}
						handleOpenLightbox={handleOpenLightbox}
						requestAdminAction={requestAdminAction}
					/>
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
				loading={isPendingAdminActionBusy}
				onCancel={() => setPendingAdminAction(null)}
				onConfirm={handleConfirmAdminAction}
			/>
		</Card>
	);
}
