/**
 * @module NameSelector
 * @description Name selection component with grid and swipe modes, showing cat images from Supabase
 */

import { motion, type PanInfo } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/providers/Providers";
import { NameSelectorGridSection } from "@/features/tournament/components/NameSelectorGridSection";
import { NameSelectorSwipeSection } from "@/features/tournament/components/NameSelectorSwipeSection";
import { useNameSelectorAdminActions } from "@/features/tournament/hooks/useNameSelectorAdminActions";
import { coreAPI } from "@/services/supabase/api";
import Button from "@/shared/components/layout/Button";
import { Card } from "@/shared/components/layout/Card";
import { ConfirmDialog } from "@/shared/components/layout/ConfirmDialog";
import { Loading } from "@/shared/components/layout/Feedback/Loading";
import { Lightbox } from "@/shared/components/layout/Lightbox";
import { useCollapsible, useNamesCache } from "@/shared/hooks";
import { getRandomCatImage } from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import { Shuffle } from "@/shared/lib/icons";
import type { IdType, NameItem } from "@/shared/types";
import useAppStore from "@/store/appStore";

const SWIPE_OFFSET_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;
const isLockedName = (name: NameItem) => Boolean(name.lockedIn || name.locked_in);
const isHiddenName = (name: NameItem) => Boolean(name.isHidden);

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

		if (spaceAbove < 0 && spaceBelow > -spaceAbove) {
			setTooltipPosition("bottom");
			return;
		}
		setTooltipPosition("top");
	}, []);

	return { tooltipRef, tooltipPosition, measureTooltip };
}

interface LockedNamesBannerProps {
	names: NameItem[];
}

function LockedNamesBanner({ names }: LockedNamesBannerProps) {
	const { tooltipRef, tooltipPosition, measureTooltip } = useSmartTooltip();
	const lockedInNames = names.filter(isLockedName);

	if (lockedInNames.length === 0) {
		return null;
	}

	return (
		<div className="text-center space-y-4">
			<h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter">
				My cat&apos;s name is
			</h3>
			<div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 w-full px-2 relative z-[60]">
				{lockedInNames.map((nameItem) => (
					<motion.div
						key={nameItem.id}
						whileHover={{ y: -4, scale: 1.02 }}
						className="group relative shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 border-[1px] md:border-2 border-amber-500/30 bg-amber-500/10 ring-1 md:ring-2 ring-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] rounded-sm"
					>
						<div className="text-foreground font-bold text-xs sm:text-sm md:text-base lg:text-lg">
							{nameItem.name}
						</div>

						{(nameItem.description || nameItem.pronunciation) && (
							<div
								ref={tooltipRef}
								onMouseEnter={measureTooltip}
								className={`name-lock-tooltip ${
									tooltipPosition === "top" ? "name-lock-tooltip--top" : "name-lock-tooltip--bottom"
								}`}
							>
								{nameItem.pronunciation && (
									<div className="name-lock-tooltip__header">
										<div className="name-lock-tooltip__label">Pronunciation</div>
										<div className="name-lock-tooltip__pronunciation">{nameItem.pronunciation}</div>
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
}

interface NameSelectorTopControlsProps {
	isSwipeMode: boolean;
	selectedAvailableCount: number;
	availableCount: number;
	selectedHiddenCount: number;
	swipeHistoryLength: number;
	onUndo: () => void;
	onSelectAllVisible: () => void;
	onPickRandom: () => void;
	onClearSelection: () => void;
	canSelectAllAvailable: boolean;
	hasAnySelection: boolean;
}

function NameSelectorTopControls({
	isSwipeMode,
	selectedAvailableCount,
	availableCount,
	selectedHiddenCount,
	swipeHistoryLength,
	onUndo,
	onSelectAllVisible,
	onPickRandom,
	onClearSelection,
	canSelectAllAvailable,
	hasAnySelection,
}: NameSelectorTopControlsProps) {
	return (
		<div className="text-center space-y-3">
			<h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter leading-tight">
				Choose Your Contenders
			</h2>
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
					Selected: {selectedAvailableCount} / {availableCount}
				</span>
				{selectedHiddenCount > 0 && <span>Hidden selected: {selectedHiddenCount}</span>}
				{isSwipeMode && swipeHistoryLength > 0 && (
					<Button onClick={onUndo} variant="glass" size="small" className="px-3 py-1 text-xs">
						Undo Last ({swipeHistoryLength})
					</Button>
				)}
			</div>
			{!isSwipeMode && (
				<div className="flex flex-wrap items-center justify-center gap-2">
					<Button
						variant="glass"
						size="small"
						onClick={onSelectAllVisible}
						disabled={!canSelectAllAvailable}
					>
						Select all visible
					</Button>
					<Button variant="glass" size="small" onClick={onPickRandom}>
						<Shuffle size={14} />
						Pick 8 random
					</Button>
					<Button
						variant="glass"
						size="small"
						onClick={onClearSelection}
						disabled={!hasAnySelection}
					>
						Clear selection
					</Button>
				</div>
			)}
		</div>
	);
}

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

	const updateSelection = useCallback(
		(updater: (draft: Set<IdType>) => void) => {
			setSelectedNames((prev) => {
				const next = new Set(prev);
				updater(next);
				syncSelectionToStore(next);
				return next;
			});
		},
		[syncSelectionToStore],
	);

	const toggleName = useCallback(
		(nameId: IdType) => {
			updateSelection((next) => {
				if (next.has(nameId)) {
					next.delete(nameId);
					return;
				}
				next.add(nameId);
			});
		},
		[updateSelection],
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
				updateSelection((next) => {
					next.add(nameId);
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
		[markSwiped, triggerHaptic, updateSelection],
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
			updateSelection((next) => {
				next.delete(lastSwipe.id);
			});
		}

		triggerHaptic();
	}, [swipeHistory, triggerHaptic, updateSelection]);

	const visibleCards = names.filter((name) => !swipedIds.has(name.id) && !isLockedName(name));
	const cardsToRender = visibleCards.slice(0, 3);

	const availableNames = useMemo(
		() => names.filter((name) => !isLockedName(name) && !isHiddenName(name)),
		[names],
	);
	const hiddenNamesAll = useMemo(() => names.filter(isHiddenName), [names]);
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
			if (selectedNames.has(name.id)) {
				count += 1;
			}
		});
		return count;
	}, [hiddenNamesAll, selectedNames]);
	const canSelectAllAvailable = useMemo(
		() => availableNames.some((name) => !selectedNames.has(name.id)),
		[availableNames, selectedNames],
	);
	const hasAnySelection = selectedNames.size > 0;

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
		updateSelection((next) => {
			availableNames.forEach((name) => {
				next.add(name.id);
			});
		});
		triggerHaptic();
	}, [availableNames, triggerHaptic, updateSelection]);

	const handleClearSelection = useCallback(() => {
		const lockedIds = names.filter(isLockedName).map((name) => name.id);
		updateSelection((next) => {
			next.clear();
			lockedIds.forEach((id) => {
				next.add(id);
			});
		});
		triggerHaptic();
	}, [names, triggerHaptic, updateSelection]);

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

		const randomIds = pool.slice(0, targetCount).map((name) => name.id);
		updateSelection((next) => {
			randomIds.forEach((id) => {
				next.add(id);
			});
		});
		triggerHaptic();
		toast.showSuccess(`Added ${targetCount} random names.`);
	}, [availableNames, toast, triggerHaptic, updateSelection]);

	if (isLoading) {
		return (
			<Card
				padding="small"
				shadow="xl"
				className="max-w-full mx-auto flex items-center justify-center py-20"
			>
				<Loading variant="spinner" text="Loading cat names..." />
			</Card>
		);
	}

	if (error) {
		return (
			<Card
				padding="small"
				shadow="xl"
				className="max-w-full mx-auto flex flex-col items-center justify-center py-20 space-y-4"
			>
				<div className="text-destructive text-center">
					<p className="text-lg font-medium">Failed to load names</p>
					<p className="text-sm opacity-75 mt-1">{error}</p>
				</div>
				<Button onClick={() => setRetryCount((prev) => prev + 1)} variant="glass" size="small">
					Try Again
				</Button>
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
