/**
 * @module LayoutEffects
 * @description Consolidated visual effect components for layout decorations and animations.
 * Combines: FloatingBubbles, BongoCat, CatBackground, LiquidGlass
 */

import { motion } from "framer-motion";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserBubbleProfile } from "@/shared/types";

/* ==========================================================================
   LIQUID GLASS COMPONENT
   ========================================================================== */

interface LiquidGlassProps {
	children: React.ReactNode;
	className?: string;
	width?: number;
	height?: number;
	radius?: number;
	scale?: number;
	saturation?: number;
	frost?: number;
	alpha?: number;
	lightness?: number;
	inputBlur?: number;
	outputBlur?: number;
	border?: number;
	blend?: string;
	xChannel?: string;
	yChannel?: string;
	chromaticR?: number;
	chromaticG?: number;
	chromaticB?: number;
	id?: string;
	showCrosshair?: boolean;
	style?: React.CSSProperties;
	[key: string]: unknown;
}

function LiquidGlass({
	children,
	className = "",
	width = 240,
	height = 110,
	radius = 42,
	scale = -110,
	saturation = 1.08,
	frost = 0.12,
	alpha = 0.64,
	lightness = 48,
	inputBlur = 14,
	outputBlur = 0.9,
	border = 0.06,
	blend = "soft-light",
	xChannel = "R",
	yChannel = "B",
	chromaticR = 4,
	chromaticG = 5,
	chromaticB = 6,
	id = "liquid-glass-filter",
	showCrosshair = false,
	style = {},
	...props
}: LiquidGlassProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const filterRef = useRef<SVGFilterElement | null>(null);
	const displacementImageRef = useRef<HTMLDivElement | null>(null);
	const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isInitialMountRef = useRef<boolean>(true);

	const validWidth = Math.max(1, width);
	const validHeight = Math.max(1, height);
	const validRadius = Math.max(0, radius);

	const redChannelId = `redchannel-${id}`;
	const greenChannelId = `greenchannel-${id}`;
	const blueChannelId = `bluechannel-${id}`;
	const feGaussianBlurId = `gaussianblur-${id}`;

	const supportsBackdropFilterUrl = useMemo(() => {
		if (typeof window === "undefined" || typeof document === "undefined") {
			return false;
		}
		try {
			const testEl = document.createElement("div");
			testEl.style.backdropFilter = "url(#test)";
			const hasUrl = testEl.style.backdropFilter.includes("url");
			testEl.remove();
			return hasUrl;
		} catch {
			return false;
		}
	}, []);

	const pillRadius = useMemo(
		() => Math.min(validRadius, validHeight * 0.5),
		[validRadius, validHeight],
	);

	const borderSize = useMemo(
		() => Math.min(validWidth, validHeight) * (border * 0.5),
		[validWidth, validHeight, border],
	);

	const buildDisplacementImage = useCallback(() => {
		if (!displacementImageRef.current || !filterRef.current) {
			return;
		}

		const svgContent = `
      <svg class="displacement-image" viewBox="0 0 ${validWidth} ${validHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="red-${id}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--color-neutral-900)"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="blue-${id}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-neutral-900)"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${validWidth}" height="${validHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${validWidth}" height="${validHeight}" rx="${pillRadius}" fill="url(#red-${id})" />
        <rect x="0" y="0" width="${validWidth}" height="${validHeight}" rx="${pillRadius}" fill="url(#blue-${id})" style="mix-blend-mode: ${blend}" />
        <rect x="${borderSize}" y="${borderSize}" width="${validWidth - borderSize * 2}" height="${validHeight - borderSize * 2}" rx="${pillRadius}" fill="hsl(0 0% ${lightness}% / ${alpha})" style="filter:blur(${inputBlur}px)" />
      </svg>
    `;

		try {
			if (!displacementImageRef.current || !filterRef.current) {
				return;
			}
			displacementImageRef.current.innerHTML = svgContent;
			const svgEl = displacementImageRef.current.querySelector(
				".displacement-image",
			) as SVGElement | null;
			if (svgEl) {
				const serialized = new XMLSerializer().serializeToString(svgEl);
				const encoded = encodeURIComponent(serialized);
				const dataUri = `data:image/svg+xml,${encoded}`;

				const feImage = filterRef.current.querySelector("feImage") as SVGFEImageElement | null;
				if (feImage) {
					feImage.setAttribute("href", dataUri);
				}

				const allDisplacementMaps = filterRef.current.querySelectorAll(
					"feDisplacementMap",
				) as NodeListOf<SVGFEDisplacementMapElement>;
				allDisplacementMaps.forEach((map) => {
					map.setAttribute("xChannelSelector", xChannel);
					map.setAttribute("yChannelSelector", yChannel);
				});
			}
		} catch (error) {
			console.warn("LiquidGlass: Failed to build displacement image", error);
		}
	}, [
		validWidth,
		validHeight,
		pillRadius,
		borderSize,
		blend,
		lightness,
		alpha,
		inputBlur,
		id,
		xChannel,
		yChannel,
	]);

	const supportsViewTransition = useMemo(() => {
		return typeof document !== "undefined" && "startViewTransition" in document;
	}, []);

	const updateFilter = useCallback(() => {
		if (!filterRef.current || !containerRef.current) {
			return;
		}

		buildDisplacementImage();

		if (containerRef.current) {
			containerRef.current.style.setProperty("--width", `${validWidth}`);
			containerRef.current.style.setProperty("--height", `${validHeight}`);
			containerRef.current.style.setProperty("--radius", `${pillRadius}`);
			containerRef.current.style.setProperty("--frost", `${frost}`);
			containerRef.current.style.setProperty("--output-blur", `${outputBlur}`);
			containerRef.current.style.setProperty("--saturation", `${saturation}`);
			containerRef.current.style.setProperty("--filter-id", `url(#${id})`);
		}

		if (containerRef.current) {
			const backdropFilterValue = supportsBackdropFilterUrl
				? `url(#${id}) saturate(${saturation})`
				: `blur(8px) saturate(${saturation})`;
			containerRef.current.style.setProperty("--backdrop-filter", backdropFilterValue);
			containerRef.current.style.backdropFilter = backdropFilterValue;
		}

		if (!filterRef.current) {
			return;
		}

		const allDisplacementMaps = filterRef.current.querySelectorAll(
			"feDisplacementMap",
		) as NodeListOf<SVGFEDisplacementMapElement>;
		allDisplacementMaps.forEach((map) => {
			map.setAttribute("scale", String(scale));
		});

		const channels = [
			{ id: redChannelId, scale: scale + chromaticR },
			{ id: greenChannelId, scale: scale + chromaticG },
			{ id: blueChannelId, scale: scale + chromaticB },
		];

		channels.forEach(({ id: channelId, scale: channelScale }) => {
			const channel = filterRef.current?.querySelector(
				`#${channelId}`,
			) as SVGFEDisplacementMapElement | null;
			if (channel) {
				channel.setAttribute("scale", String(channelScale));
			}
		});

		const feGaussianBlur = filterRef.current.querySelector(
			`#${feGaussianBlurId}`,
		) as SVGFEGaussianBlurElement | null;
		if (feGaussianBlur) {
			feGaussianBlur.setAttribute("stdDeviation", String(outputBlur));
		}
	}, [
		buildDisplacementImage,
		validWidth,
		validHeight,
		pillRadius,
		frost,
		outputBlur,
		saturation,
		id,
		supportsBackdropFilterUrl,
		redChannelId,
		greenChannelId,
		blueChannelId,
		feGaussianBlurId,
		scale,
		chromaticR,
		chromaticG,
		chromaticB,
	]);

	const updateFilterWithTransition = useCallback(() => {
		if (!supportsViewTransition) {
			updateFilter();
			return;
		}

		document.startViewTransition(() => {
			updateFilter();
		});
	}, [supportsViewTransition, updateFilter]);

	const updateFilterRef = useRef(updateFilter);
	const updateFilterWithTransitionRef = useRef(updateFilterWithTransition);

	useEffect(() => {
		updateFilterRef.current = updateFilter;
	}, [updateFilter]);

	useEffect(() => {
		updateFilterWithTransitionRef.current = updateFilterWithTransition;
	}, [updateFilterWithTransition]);

	useEffect(() => {
		if (!containerRef.current || !svgRef.current) {
			return;
		}

		const filterElement = svgRef.current.querySelector(`#${id}`) as SVGFilterElement | null;
		if (!filterElement) {
			return;
		}

		filterRef.current = filterElement;
		updateFilterRef.current();
		isInitialMountRef.current = false;

		const handleResize = () => {
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}
			resizeTimeoutRef.current = setTimeout(() => {
				updateFilterWithTransitionRef.current();
			}, 150);
		};

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}
		};
	}, [id]);

	useEffect(() => {
		if (isInitialMountRef.current || !filterRef.current) {
			return;
		}
		updateFilterWithTransition();
	}, [updateFilterWithTransition]);

	return (
		<div
			ref={containerRef}
			className={`liquid-glass ${className}`}
			style={
				{
					width: (style as { width?: string | number })?.width || `${validWidth}px`,
					height: (style as { height?: string | number })?.height || `${validHeight}px`,
					...(style as React.CSSProperties),
				} as React.CSSProperties
			}
			{...props}
		>
			{children}
			<svg ref={svgRef} className="liquid-glass-filter" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<filter id={id} colorInterpolationFilters="sRGB">
						<feImage x="0" y="0" width="100%" height="100%" result="map" />

						<feDisplacementMap
							in="SourceGraphic"
							in2="map"
							id={redChannelId}
							xChannelSelector={xChannel}
							yChannelSelector={yChannel}
							result="dispRed"
						/>
						<feColorMatrix
							in="dispRed"
							type="matrix"
							values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
							result="red"
						/>

						<feDisplacementMap
							in="SourceGraphic"
							in2="map"
							id={greenChannelId}
							xChannelSelector={xChannel}
							yChannelSelector={yChannel}
							result="dispGreen"
						/>
						<feColorMatrix
							in="dispGreen"
							type="matrix"
							values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
							result="green"
						/>

						<feDisplacementMap
							in="SourceGraphic"
							in2="map"
							id={blueChannelId}
							xChannelSelector={xChannel}
							yChannelSelector={yChannel}
							result="dispBlue"
						/>
						<feColorMatrix
							in="dispBlue"
							type="matrix"
							values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
							result="blue"
						/>

						<feBlend in="red" in2="green" mode="screen" result="rg" />
						<feBlend in="rg" in2="blue" mode="screen" result="output" />

						<feGaussianBlur id={feGaussianBlurId} in="output" stdDeviation={outputBlur} />
					</filter>
				</defs>
			</svg>
			<div ref={displacementImageRef} className="displacement-image-container" />
			{showCrosshair && (
				<div
					className="liquid-glass-crosshair"
					style={{
						position: "absolute",
						inset: 0,
						pointerEvents: "none",
						display: "grid",
						placeItems: "center",
					}}
				>
					<div
						style={{
							width: "40%",
							height: "2px",
							background: "rgba(255, 255, 255, 0.6)",
							borderRadius: "2px",
							position: "absolute",
						}}
					/>
					<div
						style={{
							width: "2px",
							height: "40%",
							background: "rgba(255, 255, 255, 0.6)",
							borderRadius: "2px",
							position: "absolute",
						}}
					/>
				</div>
			)}
		</div>
	);
}

export const DEFAULT_GLASS_CONFIG = {
	width: 240,
	height: 110,
	radius: 42,
	scale: -110,
	saturation: 1.08,
	frost: 0.12,
	inputBlur: 14,
	outputBlur: 0.9,
};

export function resolveGlassConfig(
	liquidGlass: boolean | Record<string, unknown> | undefined,
	defaultConfig: Record<string, unknown>,
): Record<string, unknown> {
	if (typeof liquidGlass === "boolean") {
		return defaultConfig;
	}
	if (typeof liquidGlass === "object" && liquidGlass !== null) {
		return { ...defaultConfig, ...liquidGlass };
	}
	return defaultConfig;
}

/* ==========================================================================
   BONGO CAT COMPONENT
   ========================================================================== */

interface BongoCatProps {
	text?: string;
	size?: "small" | "medium" | "large";
	className?: string;
}

const sizeClasses = {
	small: "w-24 h-24 text-xs",
	medium: "w-48 h-48 text-sm",
	large: "w-64 h-64 text-base",
};

export const BongoCat = memo(function BongoCat({
	text,
	size = "medium",
	className = "",
}: BongoCatProps) {
	return (
		<div
			className={`flex flex-col items-center justify-center gap-2 ${sizeClasses[size]} ${className}`}
			role="status"
			aria-label="Loading"
		>
			<svg
				className="w-full h-full drop-shadow-xl"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 787.3 433.8"
			>
				<defs>
					<symbol id="bongo-eye" viewBox="0 0 19.2 18.7">
						<circle cx="9.4" cy="9.1" r="8" fill="none" stroke="#000" strokeWidth="2" />
						<circle cx="9.4" cy="9.1" r="3" fill="#000" />
					</symbol>
					<symbol id="bongo-paw-pads" viewBox="0 0 31.4 33.9">
						<path
							d="M6.8,16a3.7,3.7,0,0,1,1.1,2.8,3.2,3.2,0,0,1-1.6,2.6L5,21.8H4.4a2.8,2.8,0,0,1-1.8.3A4.2,4.2,0,0,1,.2,19.1,7.7,7.7,0,0,1,0,17.6a2.8,2.8,0,0,1,.6-2,3.2,3.2,0,0,1,2.1-.8H4A5,5,0,0,1,6.8,16Zm7.3-4.8a1.8,1.8,0,0,0,.7-.5l.7-.4a3.5,3.5,0,0,0,1.1-1,3.2,3.2,0,0,0,.3-1.4,1.4,1.4,0,0,0-.2-.6,3.4,3.4,0,0,0-.3-2.4,3.2,3.2,0,0,0-2.1-1.5H13.1a4.7,4.7,0,0,0-1.6.4,2,2,0,0,0-.9.9l-.4.6v.4a6.1,6.1,0,0,0-.5,1.2,4.3,4.3,0,0,0,0,1.6,3.5,3.5,0,0,0,.5,2l.7.6a3.3,3.3,0,0,0,1.7.7A3,3,0,0,0,14.1,11.2ZM22.7,7l.6.2h.3A2.3,2.3,0,0,0,25,6.8l.4-.3.6-.3a7.5,7.5,0,0,0,1.5-.9,4.2,4.2,0,0,0,.8-1.2,1.9,1.9,0,0,0,.1-1.5A2.6,2.6,0,0,0,27.5,1,3.5,3.5,0,0,0,23.6.3a3.8,3.8,0,0,0-2,1.5,4.8,4.8,0,0,0-.7,2,3.6,3.6,0,0,0,.9,2.6ZM31,24.1a13.5,13.5,0,0,0-2.2-4.7,36.6,36.6,0,0,0-3.2-3.9,5.3,5.3,0,0,0-5-1.9,10.5,10.5,0,0,0-4.5,2.2A5.6,5.6,0,0,0,13.5,20a15.1,15.1,0,0,0,1.2,6.3c.8,2,1.7,4,2.6,5.9a1.6,1.6,0,0,0,1.5.8,1.7,1.7,0,0,0,1.9.9,17.1,17.1,0,0,0,8.7-4.8,8.2,8.2,0,0,0,1.7-2C31.6,26.3,31.3,25,31,24.1Z"
							fill="#ef97b0"
						/>
					</symbol>
				</defs>

				<g id="bongo-head">
					<path
						d="M295,229.2c-18.2-78.5,35.1-156.4,119-174s166.4,35.3,184.6,113.8-35.1,156.4-119,174S313.2,307.7,295,229.2Z"
						fill="#fff"
						stroke="#000"
						strokeWidth="5"
					/>
					<path
						d="M294.4,145.3c-10.8-47.7-44.9-88.5-44.9-88.5s23.1,62.1,33.8,109.8"
						fill="#fff"
						stroke="#000"
						strokeWidth="5"
						strokeLinecap="round"
					/>
					<path
						d="M559.1,82.2c-10.8-47.7-44.9-88.5-44.9-88.5s70.9,17.7,81.7,65.4"
						fill="#fff"
						stroke="#000"
						strokeWidth="5"
						strokeLinecap="round"
					/>
					<path
						d="M280.8,110.2c-5.4-23.8-22.5-44.2-22.5-44.2s11.5,31.1,16.9,54.9"
						fill="#ffd4df"
						stroke="none"
					/>
					<path
						d="M537.9,52.5c-5.4-23.8-22.5-44.2-22.5-44.2s35.5,8.8,40.9,32.7"
						fill="#ffd4df"
						stroke="none"
					/>
					<g id="bongo-face">
						<use href="#bongo-eye" x="340" y="180" width="40" height="40" />
						<use href="#bongo-eye" x="460" y="160" width="40" height="40" />
						<ellipse cx="420" cy="240" rx="8" ry="6" fill="#ffa0b4" />
						<path
							d="M420,246c0,0-15,20-30,15"
							fill="none"
							stroke="#000"
							strokeWidth="3"
							strokeLinecap="round"
						/>
						<path
							d="M420,246c0,0,15,20,30,15"
							fill="none"
							stroke="#000"
							strokeWidth="3"
							strokeLinecap="round"
						/>
						<g>
							<line x1="300" y1="230" x2="350" y2="240" stroke="#000" strokeWidth="2" />
							<line x1="295" y1="250" x2="348" y2="255" stroke="#000" strokeWidth="2" />
							<line x1="300" y1="270" x2="350" y2="265" stroke="#000" strokeWidth="2" />
							<line x1="490" y1="220" x2="540" y2="210" stroke="#000" strokeWidth="2" />
							<line x1="492" y1="240" x2="545" y2="235" stroke="#000" strokeWidth="2" />
							<line x1="490" y1="260" x2="540" y2="255" stroke="#000" strokeWidth="2" />
						</g>
					</g>
				</g>

				<g id="bongo-table">
					<rect x="50" y="380" width="700" height="50" fill="#8b7355" rx="5" />
					<rect x="50" y="375" width="700" height="10" fill="#a08060" rx="3" />
				</g>

				<g id="bongo-laptop">
					<rect
						x="180"
						y="280"
						width="200"
						height="100"
						fill="#2d2d2d"
						stroke="#1a1a1a"
						strokeWidth="4"
						rx="5"
					/>
					<g>
						{[
							{ d: "M195,300 L330,300", color: "#3de0e8" },
							{ d: "M195,315 L290,315", color: "#3de0e8" },
							{ d: "M195,330 L360,330", color: "#3de0e8" },
							{ d: "M195,345 L270,345", color: "#f97583" },
							{ d: "M195,360 L320,360", color: "#b392f0" },
						].map((line, i) => (
							<motion.path
								key={i}
								d={line.d}
								stroke={line.color}
								strokeWidth="4"
								strokeLinecap="round"
								initial={{ opacity: 0.3 }}
								animate={{ opacity: [0.3, 1, 0.3] }}
								transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
							/>
						))}
					</g>
					<path
						d="M160,380 L220,380 L200,390 L180,390 Z"
						fill="#c0c0c0"
						stroke="#a0a0a0"
						strokeWidth="2"
					/>
					<path
						d="M340,380 L400,380 L380,390 L360,390 Z"
						fill="#c0c0c0"
						stroke="#a0a0a0"
						strokeWidth="2"
					/>
					<rect x="170" y="375" width="240" height="8" fill="#e0e0e0" rx="2" />
					<rect x="185" y="368" width="210" height="12" fill="#d0d0d0" rx="2" />
				</g>

				<motion.g
					animate={{ y: [0, 20, 0] }}
					transition={{
						duration: 0.2,
						repeat: Infinity,
						repeatType: "reverse",
					}}
				>
					<ellipse cx="230" cy="320" rx="35" ry="25" fill="#fff" stroke="#000" strokeWidth="3" />
					<use href="#bongo-paw-pads" x="210" y="305" width="40" height="35" />
				</motion.g>

				<motion.g
					animate={{ y: [20, 0, 20] }}
					transition={{
						duration: 0.2,
						repeat: Infinity,
						repeatType: "reverse",
					}}
				>
					<ellipse cx="350" cy="320" rx="35" ry="25" fill="#fff" stroke="#000" strokeWidth="3" />
					<use href="#bongo-paw-pads" x="330" y="305" width="40" height="35" />
				</motion.g>
			</svg>
			{text && <p className="font-mono text-white/70 animate-pulse">{text}</p>}
		</div>
	);
});

BongoCat.displayName = "BongoCat";

/* ==========================================================================
   CAT BACKGROUND COMPONENT
   ========================================================================== */

const DEFAULT_STAR_COUNT = 60;
const MOBILE_STAR_REDUCTION = 0.3;
const MOBILE_MAX_WIDTH = 600;
const STAR_GLYPH = "✦";

const TWINKLE_DURATION_MIN = 2.6;
const TWINKLE_DURATION_MAX = 4.8;
const TWINKLE_DELAY_MIN = -4;
const TWINKLE_DELAY_MAX = 0;
const TWINKLE_SCALE_MIN = 0.9;
const TWINKLE_SCALE_MAX = 1.8;
const TWINKLE_ALPHA_MIN = 0.45;
const TWINKLE_ALPHA_MAX = 0.95;
const TWINKLE_BLUR_MIN = 0;
const TWINKLE_BLUR_MAX = 1.2;

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

function CatBackground() {
	const skyRef = useRef<HTMLDivElement>(null);
	const idleCallbackRef = useRef<number | null>(null);

	const generateStars = useCallback((skyElement: HTMLElement) => {
		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		if (prefersReducedMotion) {
			skyElement.innerHTML = "";
			return;
		}

		let starCount = Number.parseInt(skyElement.dataset.stars ?? `${DEFAULT_STAR_COUNT}`, 10);

		if (Number.isNaN(starCount)) {
			starCount = DEFAULT_STAR_COUNT;
		}

		if (window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches) {
			starCount = Math.round(starCount * MOBILE_STAR_REDUCTION);
		}

		skyElement.innerHTML = "";

		const fragment = document.createDocumentFragment();

		for (let i = 0; i < starCount; i += 1) {
			const el = document.createElement("div");
			el.className = "cat-background__star";
			el.textContent = STAR_GLYPH;
			el.style.left = `${Math.random() * 100}vw`;
			el.style.top = `${Math.random() * 100}vh`;

			const size = randomBetween(6, 16);
			el.style.fontSize = `${size.toFixed(2)}px`;
			el.style.setProperty(
				"--twinkle-duration",
				`${randomBetween(TWINKLE_DURATION_MIN, TWINKLE_DURATION_MAX).toFixed(2)}s`,
			);
			el.style.setProperty(
				"--twinkle-delay",
				`${randomBetween(TWINKLE_DELAY_MIN, TWINKLE_DELAY_MAX).toFixed(2)}s`,
			);
			el.style.setProperty(
				"--twinkle-scale",
				`${randomBetween(TWINKLE_SCALE_MIN, TWINKLE_SCALE_MAX).toFixed(2)}`,
			);
			el.style.setProperty(
				"--twinkle-alpha",
				`${randomBetween(TWINKLE_ALPHA_MIN, TWINKLE_ALPHA_MAX).toFixed(2)}`,
			);
			el.style.setProperty(
				"--twinkle-blur",
				`${randomBetween(TWINKLE_BLUR_MIN, TWINKLE_BLUR_MAX).toFixed(2)}px`,
			);

			fragment.appendChild(el);
		}

		skyElement.appendChild(fragment);
	}, []);

	useEffect(() => {
		const skyElement = skyRef.current;
		if (!skyElement) {
			return undefined;
		}

		if (typeof window !== "undefined" && "requestIdleCallback" in window) {
			idleCallbackRef.current = window.requestIdleCallback(() => {
				generateStars(skyElement);
			});
		} else {
			generateStars(skyElement);
		}

		return () => {
			if (idleCallbackRef.current) {
				window.cancelIdleCallback(idleCallbackRef.current);
			}
			skyElement.innerHTML = "";
		};
	}, [generateStars]);

	return (
		<div className="cat-background" aria-hidden="true">
			<div className="cat-background__gradient" />
			<div id="sky" ref={skyRef} data-stars={DEFAULT_STAR_COUNT} className="cat-background__sky" />
		</div>
	);
}

export default CatBackground;

/* ==========================================================================
   FLOATING BUBBLES COMPONENT
   ========================================================================== */

interface BubbleState {
	x: number;
	y: number;
	radius: number;
	vx: number;
	vy: number;
	isHovered: boolean;
}

interface FloatingBubbleProps {
	bubble: BubbleState;
	profile: UserBubbleProfile;
	onAutofill: (username: string) => void;
	onClick?: (() => void) | undefined;
	isHighlighted?: boolean;
}

const FloatingBubble: React.FC<FloatingBubbleProps> = ({
	bubble,
	profile,
	onAutofill,
	onClick,
	isHighlighted = false,
}) => {
	const [isPoppingOut, setIsPoppingOut] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);

	const handleImageLoad = useCallback(() => setImageLoaded(true), []);
	const handleImageError = useCallback(() => setImageError(true), []);

	const handleClick = () => {
		setIsPoppingOut(true);
		setTimeout(() => {
			if (onClick) {
				onClick();
			} else {
				onAutofill(profile.username);
			}
		}, 150);
	};

	const scale = isPoppingOut ? 1.3 : bubble.isHovered ? 1.15 : isHighlighted ? 1.1 : 1;
	const opacity = isPoppingOut ? 0 : bubble.isHovered ? 1 : 0.92;
	const displayName = profile.display_name || profile.username;

	const touchPadding = 16;

	const velocityMagnitude = Math.sqrt(bubble.vx ** 2 + bubble.vy ** 2);
	const motionBlurX = bubble.vx * 2;
	const motionBlurY = bubble.vy * 2;
	const showMotionBlur = velocityMagnitude > 0.5;

	return (
		<button
			type="button"
			className="absolute pointer-events-auto select-none bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coral rounded-full"
			style={{
				transform: `translate3d(${bubble.x - bubble.radius - touchPadding}px, ${bubble.y - bubble.radius - touchPadding}px, 0) scale(${scale})`,
				width: `${bubble.radius * 2 + touchPadding * 2}px`,
				height: `${bubble.radius * 2 + touchPadding * 2}px`,
				padding: `${touchPadding}px`,
				opacity,
				willChange: "transform, opacity",
				transition: isPoppingOut
					? "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 150ms ease-out"
					: "transform 150ms ease-out, opacity 200ms ease",
			}}
			onClick={handleClick}
			aria-label={`Select ${displayName}`}
		>
			<div className="relative w-full h-full">
				{isHighlighted && !isPoppingOut && (
					<div
						className="absolute inset-0 rounded-full ring-4 ring-green-400/60 animate-pulse"
						style={{ margin: "-4px" }}
					/>
				)}

				{showMotionBlur && (
					<div
						className="absolute inset-0 rounded-full bg-gradient-to-br from-coral/20 via-rose-pink/15 to-lavender/20 blur-md"
						style={{
							transform: `translate(${-motionBlurX}px, ${-motionBlurY}px)`,
							opacity: Math.min(velocityMagnitude * 0.3, 0.5),
						}}
					/>
				)}

				<div
					className={`absolute inset-0 rounded-full blur-sm ${
						isHighlighted
							? "bg-gradient-to-br from-green-400/50 via-green-300/40 to-green-400/50"
							: "bg-gradient-to-br from-coral/40 via-rose-pink/30 to-lavender/40"
					}`}
					style={{
						transform: bubble.isHovered || isHighlighted ? "scale(1.25)" : "scale(1)",
						transition: "transform 0.3s ease",
					}}
				/>

				<div
					className={`relative w-full h-full rounded-full overflow-hidden bg-white/90 backdrop-blur-sm border-2 shadow-lg ${
						isHighlighted ? "border-green-400/70" : "border-white/50"
					}`}
				>
					{profile.avatar_url && !imageError ? (
						<>
							<div
								className={`absolute inset-0 flex items-center justify-center font-bold text-lg transition-opacity duration-300 ${
									isHighlighted
										? "bg-gradient-to-br from-green-100 via-green-50 to-green-100 text-green-600"
										: "bg-gradient-to-br from-coral/20 via-rose-pink/20 to-lavender/20 text-coral"
								}`}
								style={{ opacity: imageLoaded ? 0 : 1 }}
							>
								{profile.display_name?.[0]?.toUpperCase() || profile.username[0]?.toUpperCase()}
							</div>
							<img
								src={profile.avatar_url}
								alt=""
								className="w-full h-full object-cover transition-opacity duration-300"
								style={{ opacity: imageLoaded ? 1 : 0 }}
								loading="lazy"
								decoding="async"
								onLoad={handleImageLoad}
								onError={handleImageError}
							/>
						</>
					) : (
						<div
							className={`w-full h-full flex items-center justify-center font-bold text-lg ${
								isHighlighted
									? "bg-gradient-to-br from-green-100 via-green-50 to-green-100 text-green-600"
									: "bg-gradient-to-br from-coral/20 via-rose-pink/20 to-lavender/20 text-coral"
							}`}
						>
							{profile.display_name?.[0]?.toUpperCase() || profile.username[0]?.toUpperCase()}
						</div>
					)}
				</div>

				{isPoppingOut && (
					<div className="absolute inset-0 rounded-full border-2 border-coral/50 animate-ping" />
				)}
			</div>
		</button>
	);
};

interface BubbleData {
	id: string;
	label: string;
	value: number;
}

interface FloatingBubblesContainerProps {
	data: BubbleData[];
	width?: number;
	height?: number;
}

export const FloatingBubblesContainer: React.FC<FloatingBubblesContainerProps> = ({
	data,
	width = 800,
	height = 400,
}) => {
	const [bubbles, setBubbles] = useState<BubbleState[]>([]);
	const [profiles, setProfiles] = useState<Record<string, UserBubbleProfile>>({});
	const requestRef = useRef<number | null>(null);

	useEffect(() => {
		const newProfiles: Record<string, UserBubbleProfile> = {};
		const initialBubbles: BubbleState[] = data.map((item) => {
			newProfiles[item.id] = {
				username: item.label,
				display_name: item.label,
				avatar_url: "",
			};

			const minVal = Math.min(...data.map((d) => d.value));
			const maxVal = Math.max(...data.map((d) => d.value));
			const range = maxVal - minVal || 1;
			const radius = 30 + ((item.value - minVal) / range) * 40;

			return {
				x: Math.random() * (width - 2 * radius) + radius,
				y: Math.random() * (height - 2 * radius) + radius,
				vx: (Math.random() - 0.5) * 2,
				vy: (Math.random() - 0.5) * 2,
				radius,
				isHovered: false,
			};
		});

		setProfiles(newProfiles);
		setBubbles(initialBubbles);
	}, [data, width, height]);

	const updatePhysics = useCallback(() => {
		setBubbles((prevBubbles) => {
			return prevBubbles.map((bubble, i) => {
				let { x, y, vx, vy, radius } = bubble;

				x += vx;
				y += vy;

				if (x - radius < 0) {
					x = radius;
					vx *= -0.8;
				} else if (x + radius > width) {
					x = width - radius;
					vx *= -0.8;
				}

				if (y - radius < 0) {
					y = radius;
					vy *= -0.8;
				} else if (y + radius > height) {
					y = height - radius;
					vy *= -0.8;
				}

				vx *= 0.99;
				vy *= 0.99;

				if (Math.abs(vx) < 0.1) {
					vx += (Math.random() - 0.5) * 0.5;
				}
				if (Math.abs(vy) < 0.1) {
					vy += (Math.random() - 0.5) * 0.5;
				}

				for (let j = 0; j < prevBubbles.length; j++) {
					if (i === j) {
						continue;
					}
					const other = prevBubbles[j];
					if (!other) {
						continue;
					}
					const dx = other.x - x;
					const dy = other.y - y;
					const distance = Math.sqrt(dx * dx + dy * dy);
					const minDistance = radius + other.radius;

					if (distance < minDistance) {
						const angle = Math.atan2(dy, dx);
						const targetX = x + Math.cos(angle) * minDistance;
						const targetY = y + Math.sin(angle) * minDistance;
						vx -= (targetX - other.x) * 0.05;
						vy -= (targetY - other.y) * 0.05;
					}
				}

				return { ...bubble, x, y, vx, vy };
			});
		});
		requestRef.current = requestAnimationFrame(updatePhysics);
	}, [width, height]);

	useEffect(() => {
		requestRef.current = requestAnimationFrame(updatePhysics);
		return () => {
			if (requestRef.current) {
				cancelAnimationFrame(requestRef.current);
			}
		};
	}, [updatePhysics]);

	return (
		<div
			className="relative overflow-hidden bg-black/20 rounded-2xl border border-white/5 backdrop-blur-sm"
			style={{ width: "100%", height: `${height}px` }}
		>
			{bubbles.map((bubble, i) => {
				const item = data[i];
				if (!item) {
					return null;
				}
				const id = item.id;
				const profile = profiles[id];
				if (!profile) {
					return null;
				}

				return (
					<FloatingBubble
						key={id}
						bubble={bubble}
						profile={profile}
						onAutofill={() => {
							/* Intentional no-op for visualization only */
						}}
						isHighlighted={false}
					/>
				);
			})}
		</div>
	);
};

export { LiquidGlass };
