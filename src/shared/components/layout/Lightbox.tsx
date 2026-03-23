/**
 * @module Lightbox
 * @description Image lightbox component for viewing images in fullscreen
 */

import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomOut } from "@/shared/lib/icons";
import { LightboxImage } from "./LightboxImage";

interface LightboxProps {
	images: string[];
	currentIndex: number;
	onClose: () => void;
	onNavigate: (index: number) => void;
}

export function Lightbox({ images, currentIndex, onClose, onNavigate }: LightboxProps) {
	const lightboxRef = useRef<HTMLDivElement>(null);
	const [isZoomed, setIsZoomed] = useState(false);
	const [scale, setScale] = useState(1);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

	// Preload adjacent images for better performance with cleanup
	useEffect(() => {
		const preloadAdjacent = () => {
			const indices = [
				(currentIndex - 1 + images.length) % images.length,
				(currentIndex + 1) % images.length,
			];

			indices.forEach((index) => {
				const img = images[index];
				if (img && !preloadedImages.has(img)) {
					const preloadImg = new Image();
					preloadImg.src = img;
					// Add onload event to ensure image is actually loaded before adding to set
					preloadImg.onload = () => {
						setPreloadedImages((prev) => new Set([...prev, img]));
					};
				}
			});
		};

		preloadAdjacent();
	}, [currentIndex, images, preloadedImages]);

	// Cleanup preloaded images when component unmounts or images change
	// biome-ignore lint/correctness/useExhaustiveDependencies: images change triggers cleanup
	useEffect(() => {
		return () => {
			setPreloadedImages(new Set());
		};
	}, [images]);

	const resetZoom = useCallback(() => {
		setScale(1);
		setPosition({ x: 0, y: 0 });
		setIsZoomed(false);
	}, []);

	// Handle zoom reset when navigating
	// biome-ignore lint/correctness/useExhaustiveDependencies: resetZoom is stable
	useEffect(() => {
		resetZoom();
	}, [currentIndex, resetZoom]);

	const handleZoomIn = useCallback(() => {
		setScale((prev) => Math.min(prev + 0.5, 3));
		setIsZoomed(true);
	}, []);

	const handleZoomOut = useCallback(() => {
		if (scale <= 1.5) {
			resetZoom();
		} else {
			setScale((prev) => Math.max(prev - 0.5, 1));
		}
	}, [scale, resetZoom]);

	const handleImageClick = useCallback(() => {
		if (isZoomed) {
			resetZoom();
		} else {
			handleZoomIn();
		}
	}, [isZoomed, handleZoomIn, resetZoom]);

	const handlePan = useCallback(
		(info: PanInfo) => {
			if (isZoomed) {
				setPosition((prev) => ({
					x: prev.x + info.delta.x,
					y: prev.y + info.delta.y,
				}));
			}
		},
		[isZoomed],
	);

	const handlePrevious = useCallback(() => {
		onNavigate(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
	}, [currentIndex, images.length, onNavigate]);

	const handleNext = useCallback(() => {
		onNavigate(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
	}, [currentIndex, images.length, onNavigate]);

	const handleSwipe = useCallback(
		(offset: number, velocity: number) => {
			const threshold = 50;
			const velocityThreshold = 500;

			if (!isZoomed) {
				if (Math.abs(offset) > threshold || Math.abs(velocity) > velocityThreshold) {
					if (offset > 0 || velocity > 0) {
						handlePrevious();
					} else {
						handleNext();
					}
				}
			}
		},
		[isZoomed, handlePrevious, handleNext],
	);

	// Trap focus within lightbox when open with improved accessibility
	useEffect(() => {
		const lightboxElement = lightboxRef.current;
		if (!lightboxElement) {
			return;
		}
		const previouslyFocusedElement =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;

		const getFocusableElements = () =>
			Array.from(
				lightboxElement.querySelectorAll<HTMLElement>(
					'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
				),
			);

		const focusFirstElement = () => {
			const [firstElement] = getFocusableElements();
			if (firstElement) {
				firstElement.focus();
				return;
			}
			lightboxElement.focus();
		};

		const handleTabKey = (e: KeyboardEvent) => {
			if (e.key !== "Tab") {
				return;
			}
			const focusableElements = getFocusableElements();
			if (focusableElements.length === 0) {
				e.preventDefault();
				lightboxElement.focus();
				return;
			}

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (e.shiftKey) {
				if (document.activeElement === firstElement || document.activeElement === lightboxElement) {
					e.preventDefault();
					lastElement?.focus();
				}
				return;
			}

			if (document.activeElement === lastElement) {
				e.preventDefault();
				firstElement?.focus();
			}
		};

		// Add event listener and set initial focus
		document.addEventListener("keydown", handleTabKey);
		// Use setTimeout to ensure focus is set after animation
		const focusTimeout = setTimeout(() => {
			focusFirstElement();
		}, 100);

		return () => {
			document.removeEventListener("keydown", handleTabKey);
			clearTimeout(focusTimeout);
			if (previouslyFocusedElement?.isConnected) {
				previouslyFocusedElement.focus();
			}
		};
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Prevent event propagation to avoid conflicts with other keyboard handlers
			e.stopPropagation();

			switch (e.key) {
				case "Escape":
					e.preventDefault();
					onClose();
					break;
				case "ArrowLeft":
				case "a":
				case "A":
					e.preventDefault();
					if (!isZoomed) {
						handlePrevious();
					}
					break;
				case "ArrowRight":
				case "d":
				case "D":
					e.preventDefault();
					if (!isZoomed) {
						handleNext();
					}
					break;
				case " ":
				case "Enter":
					e.preventDefault();
					if (isZoomed) {
						resetZoom();
					} else {
						onClose();
					}
					break;
				case "+":
				case "=":
					e.preventDefault();
					handleZoomIn();
					break;
				case "-":
				case "_":
					e.preventDefault();
					handleZoomOut();
					break;
				case "0":
					e.preventDefault();
					resetZoom();
					break;
				case "Home":
					e.preventDefault();
					onNavigate(0);
					break;
				case "End":
					e.preventDefault();
					onNavigate(images.length - 1);
					break;
				// Number keys for direct navigation (1-9)
				case "1":
				case "2":
				case "3":
				case "4":
				case "5":
				case "6":
				case "7":
				case "8":
				case "9": {
					e.preventDefault();
					const targetIndex = Number.parseInt(e.key, 10) - 1;
					if (targetIndex < images.length) {
						onNavigate(targetIndex);
					}
					break;
				}
				// Additional shortcuts
				case "r":
				case "R":
					e.preventDefault();
					resetZoom();
					break;
				case "f":
				case "F":
					e.preventDefault();
					// Toggle fullscreen (if supported)
					if (document.fullscreenElement) {
						document.exitFullscreen();
					} else {
						lightboxRef.current?.requestFullscreen?.();
					}
					break;
				case "?":
				case "/":
					e.preventDefault();
					// Help could be expanded to show a help modal
					break;
				default:
					break;
			}
		};

		// Use capture phase to ensure this runs before other handlers
		window.addEventListener("keydown", handleKeyDown, true);
		return () => window.removeEventListener("keydown", handleKeyDown, true);
	}, [
		onClose,
		handlePrevious,
		handleNext,
		onNavigate,
		images.length,
		isZoomed,
		resetZoom,
		handleZoomIn,
		handleZoomOut,
	]);

	return (
		<AnimatePresence>
			<motion.div
				ref={lightboxRef}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
				onClick={onClose}
				role="dialog"
				tabIndex={-1}
				aria-modal="true"
				aria-labelledby={`lightbox-title-${currentIndex}`}
				aria-describedby={`lightbox-description-${currentIndex}`}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
					aria-label="Close lightbox and return to gallery"
					title="Close (Escape)"
				>
					<X size={24} />
				</button>

				{isZoomed && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleZoomOut();
						}}
						className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
						aria-label="Zoom out image"
						title="Zoom out (-)"
					>
						<ZoomOut size={24} />
					</button>
				)}

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						handlePrevious();
					}}
					className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
					aria-label="View previous image"
					title="Previous (Left Arrow)"
				>
					<ChevronLeft size={24} />
				</button>

				<motion.div
					className="relative max-w-[90vw] max-h-[90vh] cursor-pointer"
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.9, opacity: 0 }}
					transition={{ type: "spring", stiffness: 300, damping: 30 }}
					whileTap={{ scale: 0.98 }}
					drag={isZoomed}
					dragMomentum={false}
					dragElastic={0}
					onDrag={(_, info) => handlePan(info)}
					onDragEnd={(_, info) => {
						if (!isZoomed) {
							handleSwipe(info.offset.x, info.velocity.x);
						}
					}}
					onClick={(e) => {
						e.stopPropagation();
						handleImageClick();
					}}
					style={{
						scale,
						x: position.x,
						y: position.y,
						transition: "transform 0.3s ease",
					}}
					role="img"
					aria-label={`Image ${currentIndex + 1} of ${images.length} - ${isZoomed ? "Zoomed in" : "Click to zoom"}`}
				>
					<LightboxImage
						src={images[currentIndex] || ""}
						alt={`Cat image ${currentIndex + 1} of ${images.length}`}
						className="max-w-[90vw] max-h-[90vh] object-contain select-none"
					/>
					{!isZoomed && (
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							<div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm opacity-0 hover:opacity-100 transition-opacity">
								Click to zoom
							</div>
						</div>
					)}
				</motion.div>

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						handleNext();
					}}
					className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
					aria-label="View next image"
					title="Next (Right Arrow)"
				>
					<ChevronRight size={24} />
				</button>

				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
					<span id={`lightbox-description-${currentIndex}`} className="font-medium">
						Image {currentIndex + 1} of {images.length}
					</span>
					{isZoomed && (
						<span className="ml-2 text-xs text-white/70">({Math.round(scale * 100)}%)</span>
					)}
				</div>

				{/* Keyboard shortcuts help */}
				<div className="absolute bottom-4 right-4 text-white/60 text-xs bg-black/30 px-2 py-1 rounded">
					<span className="hidden sm:inline">
						← → Navigate • Space Close • +/- Zoom • 1-9 Jump • R Reset • F Fullscreen
					</span>
					<span className="sm:hidden">Swipe to navigate • Tap to zoom</span>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
