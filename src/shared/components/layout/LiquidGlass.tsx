/**
 * @module LiquidGlass
 * @description CSS-only glass surface wrapper.
 * Preserves the shared API while replacing runtime SVG displacement with CSS variables.
 */

import React from "react";
import { cn } from "@/shared/lib/basic";

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
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

const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
	(
		{
			children,
			className = "",
			width = DEFAULT_GLASS_CONFIG.width,
			height = DEFAULT_GLASS_CONFIG.height,
			radius = DEFAULT_GLASS_CONFIG.radius,
			scale = DEFAULT_GLASS_CONFIG.scale,
			saturation = DEFAULT_GLASS_CONFIG.saturation,
			frost = DEFAULT_GLASS_CONFIG.frost,
			alpha = 0.64,
			lightness = 48,
			inputBlur = DEFAULT_GLASS_CONFIG.inputBlur,
			outputBlur = DEFAULT_GLASS_CONFIG.outputBlur,
			border = 0.06,
			blend = "soft-light",
			id = "liquid-glass-filter",
			showCrosshair = false,
			style,
			...props
		},
		ref,
	) => {
		const resolvedWidth = style?.width ?? `${Math.max(1, width)}px`;
		const resolvedHeight = style?.height ?? `${Math.max(1, height)}px`;
		const glassStyle = {
			width: resolvedWidth,
			height: resolvedHeight,
			"--width": typeof width === "number" ? width : String(width),
			"--height": typeof height === "number" ? height : String(height),
			"--glass-radius": `${Math.max(0, radius)}px`,
			"--glass-blur": `${Math.max(8, inputBlur + outputBlur * 10)}px`,
			"--glass-saturation": saturation,
			"--glass-frost": frost,
			"--glass-alpha": alpha,
			"--glass-lightness": `${lightness}%`,
			"--glass-border-size": `${Math.max(1, Math.min(width, height) * border * 0.5)}px`,
			"--glass-edge-blend": blend,
			"--glass-depth": Math.abs(scale) / 110,
			...style,
		} as React.CSSProperties;

		return (
			<div
				ref={ref}
				data-glass-id={id}
				className={cn("liquid-glass glass-surface", className)}
				style={glassStyle}
				{...props}
			>
				{children}
				{showCrosshair && (
					<div className="liquid-glass-crosshair" aria-hidden="true">
						<div className="liquid-glass-crosshair__horizontal" />
						<div className="liquid-glass-crosshair__vertical" />
					</div>
				)}
			</div>
		);
	},
);

LiquidGlass.displayName = "LiquidGlass";

export default LiquidGlass;
