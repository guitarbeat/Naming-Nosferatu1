/**
 * @module NavbarFxCanvas
 * @description Lightweight 2D canvas dot-wave strip used as a nav background effect.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/shared/lib/basic";

const BASE_DOT_COUNT = 700;
const BASE_COLS = 70;
const TAU = Math.PI * 2;

function roundedSquareWave(t: number, delta: number, amplitude: number, frequency: number) {
	return ((2 * amplitude) / Math.PI) * Math.atan(Math.sin(TAU * t * frequency) / delta);
}

type DotPoint = {
	x: number;
	y: number;
	distance: number;
};

function buildDotField(width: number, height: number): DotPoint[] {
	const countScale = Math.min(1.4, Math.max(0.7, width / 720));
	const dotCount = Math.floor(BASE_DOT_COUNT * countScale);
	const cols = Math.max(32, Math.floor(BASE_COLS * countScale));
	const rows = Math.ceil(dotCount / cols);
	const centerX = width / 2;
	const centerY = height / 2;
	const dots: DotPoint[] = [];

	for (let index = 0; index < dotCount; index += 1) {
		const col = index % cols;
		const row = Math.floor(index / cols);
		const x = (col / (cols - 1) - 0.5) * width * 0.95 + centerX;
		const y = (row / Math.max(1, rows - 1) - 0.5) * height * 0.68 + centerY + (col % 2) * 0.8;
		const jitterX = (Math.random() - 0.5) * 2.4;
		const jitterY = (Math.random() - 0.5) * 2;
		const px = x + jitterX;
		const py = y + jitterY;
		const dx = px - centerX;
		const dy = py - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy) + Math.cos(Math.atan2(dy, dx) * 8) * 5.5;
		dots.push({ x: px, y: py, distance });
	}

	return dots;
}

export function NavbarFxCanvas({ className }: { className?: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
		if (!context) {
			return;
		}

		let rafId = 0;
		const start = performance.now();
		let dots: DotPoint[] = [];
		let cssWidth = 0;
		let cssHeight = 0;
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

		const resize = () => {
			const bounds = canvas.getBoundingClientRect();
			cssWidth = Math.max(1, Math.floor(bounds.width));
			cssHeight = Math.max(1, Math.floor(bounds.height));
			canvas.width = Math.floor(cssWidth * pixelRatio);
			canvas.height = Math.floor(cssHeight * pixelRatio);
			context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
			dots = buildDotField(cssWidth, cssHeight);
		};

		const draw = () => {
			const elapsed = (performance.now() - start) / 1000;
			context.clearRect(0, 0, cssWidth, cssHeight);
			context.globalCompositeOperation = "lighter";

			for (let i = 0; i < dots.length; i += 1) {
				const dot = dots[i];
				const wave = roundedSquareWave(
					elapsed - dot.distance / 180,
					0.17 + (0.16 * dot.distance) / 760,
					0.35,
					0.23,
				);
				const scale = 1.07 + wave;
				const x = (dot.x - cssWidth / 2) * scale + cssWidth / 2;
				const y = (dot.y - cssHeight / 2) * scale + cssHeight / 2;
				const radius = 0.75 + Math.max(0, wave) * 1.5;
				const alpha = 0.14 + Math.max(0, wave) * 0.34;

				context.beginPath();
				context.fillStyle = `rgba(214, 242, 255, ${alpha.toFixed(3)})`;
				context.arc(x, y, radius, 0, TAU);
				context.fill();
			}

			rafId = window.requestAnimationFrame(draw);
		};

		const resizeObserver = new ResizeObserver(() => resize());
		resizeObserver.observe(canvas);
		resize();
		draw();

		return () => {
			window.cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 z-0", className)}>
			<canvas ref={canvasRef} className="h-full w-full" />
		</div>
	);
}
