/**
 * @module CatImage
 * @description Cat image component with smart focal detection and fallback support
 */

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CAT_IMAGES } from "@/shared/lib/constants";

function analyseImage(imgEl: HTMLImageElement): {
	focal?: number;
	accent?: string;
	orientation?: "landscape" | "portrait" | "square";
} {
	try {
		const naturalW = imgEl.naturalWidth || imgEl.width;
		const naturalH = imgEl.naturalHeight || imgEl.height;
		if (!naturalW || !naturalH) {
			return {};
		}

		const targetW = 144;
		const scale = targetW / naturalW;
		const w = Math.max(16, Math.min(targetW, naturalW));
		const h = Math.max(16, Math.floor(naturalH * scale));

		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) {
			return {};
		}

		ctx.drawImage(imgEl, 0, 0, w, h);
		const { data } = ctx.getImageData(0, 0, w, h);

		const rowEnergy = Array(Number(h)).fill(0);
		const toGray = (r: number, g: number, b: number) => r * 0.299 + g * 0.587 + b * 0.114;
		const idx = (x: number, y: number) => (y * w + x) * 4;

		let totalR = 0,
			totalG = 0,
			totalB = 0;

		for (let y = 0; y < h; y += 1) {
			let sum = 0;
			for (let x = 0; x < w; x += 1) {
				const base = idx(x, y);
				const r = data[base] ?? 0,
					g = data[base + 1] ?? 0,
					b = data[base + 2] ?? 0;
				totalR += r;
				totalG += g;
				totalB += b;

				if (y > 0 && y < h - 1) {
					const i1 = idx(x, y - 1),
						i2 = idx(x, y + 1);
					const g1 = toGray(data[i1] ?? 0, data[i1 + 1] ?? 0, data[i1 + 2] ?? 0);
					const g2 = toGray(data[i2] ?? 0, data[i2 + 1] ?? 0, data[i2 + 2] ?? 0);
					sum += Math.abs(g2 - g1);
				}
			}
			if (y > 0 && y < h - 1) {
				rowEnergy[y] = sum / w;
			}
		}

		const start = Math.floor(h * 0.08),
			end = Math.floor(h * 0.7);
		let bestY = start,
			bestVal = -Infinity;

		for (let y = start; y < end; y += 1) {
			const e = (rowEnergy[y - 1] || 0) + rowEnergy[y] + (rowEnergy[y + 1] || 0);
			if (e > bestVal) {
				bestVal = e;
				bestY = y;
			}
		}

		const pct = Math.min(60, Math.max(10, Math.round((bestY / h) * 100)));
		const pixelCount = w * h;
		const accent = pixelCount
			? `${Math.round(totalR / pixelCount)} ${Math.round(totalG / pixelCount)} ${Math.round(totalB / pixelCount)}`
			: undefined;

		const orientation = (() => {
			const ratio = naturalW / naturalH;
			if (ratio >= 1.45) {
				return "landscape" as const;
			}
			if (ratio <= 0.75) {
				return "portrait" as const;
			}
			return "square" as const;
		})();

		return { focal: pct, accent, orientation };
	} catch (error) {
		console.error("Failed to analyse cat image metadata", error);
		return {};
	}
}

interface CatImageProps {
	src?: string;
	alt?: string;
	containerClassName?: string;
	imageClassName?: string;
	loading?: "lazy" | "eager";
	decoding?: "async" | "auto" | "sync";
	containerStyle?: React.CSSProperties;
	objectFit?: React.CSSProperties["objectFit"];
	onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
	onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

function CatImage({
	src,
	alt = "Cat picture",
	containerClassName = "",
	imageClassName = "",
	loading = "lazy",
	decoding = "async",
	containerStyle,
	objectFit,
	onLoad,
	onError,
}: CatImageProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const [hasError, setHasError] = useState(false);

	const fallbackUrl =
		CAT_IMAGES && CAT_IMAGES.length > 0 ? (CAT_IMAGES[0] as string) : "/assets/images/bby-cat.GIF";

	// Reset error state when src changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: src changes should reset local error state
	useEffect(() => {
		setHasError(false);
	}, [src]);

	const applyImageEnhancements = useCallback(
		(imgEl: HTMLImageElement | null) => {
			if (!imgEl) {
				return;
			}
			const container = containerRef.current;
			if (!container) {
				return;
			}

			const { focal, accent, orientation } = analyseImage(imgEl);
			if (focal != null) {
				container.style.setProperty("--image-pos-y", `${focal}%`);
			}
			if (accent) {
				container.style.setProperty("--cat-image-accent-rgb", accent);
			}
			if (orientation) {
				container.dataset.orientation = orientation;
			}

			if (imgEl.naturalWidth && imgEl.naturalHeight && imgEl.naturalHeight > 0) {
				const ratio = imgEl.naturalWidth / imgEl.naturalHeight;
				container.style.setProperty("--cat-image-fit", "cover");
				container.style.setProperty("--cat-image-ratio", ratio.toFixed(3));
			}
			container.dataset.loaded = "true";
		},
		[objectFit],
	);

	const handleLoad = useCallback(
		(event: React.SyntheticEvent<HTMLImageElement, Event>) => {
			const imgEl = event.currentTarget;
			// Defer focal analysis to idle time
			const cb = () => applyImageEnhancements(imgEl);
			if ("requestIdleCallback" in window) {
				window.requestIdleCallback(cb);
			} else {
				setTimeout(cb, 50);
			}
			onLoad?.(event);
		},
		[applyImageEnhancements, onLoad],
	);

	const handleError = useCallback(
		(event: React.SyntheticEvent<HTMLImageElement, Event>) => {
			console.error("Image failed to load:", event.currentTarget.src);
			setHasError(true);
			onError?.(event);
		},
		[onError],
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}
		container.dataset.loaded = "false";
		delete container.dataset.orientation;
		container.style.removeProperty("--image-pos-y");
		container.style.removeProperty("--cat-image-accent-rgb");

		const imgEl = imageRef.current;
		if (imgEl?.complete) {
			applyImageEnhancements(imgEl);
		}
	}, [applyImageEnhancements]);

	if (!src && !hasError) {
		return null;
	}

	const currentSrc = hasError ? fallbackUrl : src;
	const containerClasses = [containerClassName].filter(Boolean).join(" ");
	const mergedStyle = {
		...containerStyle,
		...(currentSrc ? { "--bg-image": `url(${currentSrc})` } : {}),
	} as React.CSSProperties;

	const renderImage = () => {
		const imageStyle: React.CSSProperties = {
			objectPosition: "center var(--image-pos-y, 50%)",
			objectFit: "var(--cat-image-fit, cover)" as React.CSSProperties["objectFit"],
		};

		const commonProps = {
			ref: imageRef,
			src: currentSrc || fallbackUrl,
			alt: hasError ? "Fallback cat picture" : alt,
			className: imageClassName,
			style: imageStyle,
			loading,
			decoding,
			onLoad: handleLoad,
			onError: handleError,
			crossOrigin: "anonymous" as const,
		};

		if (currentSrc && typeof currentSrc === "string" && currentSrc.startsWith("/assets/images/")) {
			const extension = currentSrc.split(".").pop()?.toLowerCase();
			if (!extension || extension === "gif" || extension === "avif" || extension === "webp") {
				return <img {...commonProps} />;
			}
			const base = currentSrc.replace(/\.[^.]+$/, "");
			return (
				<picture>
					<source type="image/avif" srcSet={`${base}.avif`} />
					<source type="image/webp" srcSet={`${base}.webp`} />
					<img {...commonProps} />
				</picture>
			);
		}
		return <img {...commonProps} />;
	};

	return (
		<div ref={containerRef} className={containerClasses} style={mergedStyle}>
			{renderImage()}
		</div>
	);
}

export default CatImage;
