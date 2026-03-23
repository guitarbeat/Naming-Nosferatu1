import {
	Camera,
	Color,
	Geometry,
	Mesh,
	type OGLRenderingContext,
	Program,
	Renderer,
	Vec2,
} from "ogl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/basic";
import RippleEffect from "./RippleEffect";

const CAMERA_BASE_Z = 50;
const CAMERA_SCROLL_RANGE = 1.5;
const CAMERA_LERP_FACTOR = 0.02;
const POINT_SCREEN_SIZE = 3;
const EFFECT_RESOLUTION = 384;
const IDLE_DROP_RADIUS = 0.035;
const IDLE_DROP_STRENGTH = 0.02;
const ACTIVE_DROP_RADIUS = 0.04;
const ACTIVE_DROP_STRENGTH = 0.03;
const RESIZE_DEBOUNCE_MS = 150;

interface MagicMoireProps {
	theme?: string;
	onError?: () => void;
}

export function supportsWebGL(): boolean {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return false;
	}

	try {
		const canvas = document.createElement("canvas");
		return Boolean(
			canvas.getContext("webgl2") ||
				canvas.getContext("webgl") ||
				canvas.getContext("experimental-webgl"),
		);
	} catch {
		return false;
	}
}

function getScrollProgress() {
	const scrollTop = window.scrollY || document.documentElement.scrollTop;
	const maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;

	if (maxScroll <= 0) {
		return 0;
	}

	return Math.min(Math.max(scrollTop / maxScroll, 0), 1);
}

function readColorToken(variableName: string, fallback: string): [number, number, number] {
	if (typeof document === "undefined") {
		return hexToNormalizedRgb(fallback);
	}

	const token = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
	return parseCssColor(token || fallback, fallback);
}

function parseCssColor(value: string, fallback: string): [number, number, number] {
	if (typeof document === "undefined") {
		return hexToNormalizedRgb(fallback);
	}

	const probe = document.createElement("span");
	probe.style.color = value;
	probe.style.display = "none";
	document.body.appendChild(probe);
	const computedColor = getComputedStyle(probe).color;
	probe.remove();

	const channels = computedColor.match(/[\d.]+/g);
	if (!channels || channels.length < 3) {
		return hexToNormalizedRgb(fallback);
	}

	return [Number(channels[0]) / 255, Number(channels[1]) / 255, Number(channels[2]) / 255];
}

function hexToNormalizedRgb(value: string): [number, number, number] {
	const normalized = value.replace("#", "");
	const hex =
		normalized.length === 3 ? normalized.replace(/./g, (char) => `${char}${char}`) : normalized;

	return [
		Number.parseInt(hex.slice(0, 2), 16) / 255,
		Number.parseInt(hex.slice(2, 4), 16) / 255,
		Number.parseInt(hex.slice(4, 6), 16) / 255,
	];
}

function getEventPosition(event: MouseEvent | TouchEvent) {
	if ("changedTouches" in event && event.changedTouches.length > 0) {
		const touch = event.changedTouches[0];
		return { x: touch.pageX, y: touch.pageY };
	}

	return {
		x: event.pageX,
		y: event.pageY,
	};
}

function getWorldWidth(camera: Camera) {
	const verticalFov = (camera.fov * Math.PI) / 180;
	const height = 2 * Math.tan(verticalFov / 2) * Math.abs(camera.position.z);
	return height * camera.aspect;
}

export function MagicMoire({ theme, onError }: MagicMoireProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		setIsVisible(false);
		void theme;

		const container = containerRef.current;
		if (!container) {
			return;
		}

		let animationFrameId = 0;
		let revealFrameId = 0;
		let resizeTimeout = 0;
		let scrollFrameId = 0;
		let disposed = false;

		let renderer: Renderer | null = null;
		let gl: OGLRenderingContext | null = null;
		let camera: Camera | null = null;
		let ripple: RippleEffect | null = null;
		let points: Mesh<Geometry, Program> | null = null;
		let width = 0;
		let height = 0;
		let worldWidth = 0;
		let gridRatio = 1;
		let cameraTargetZ = CAMERA_BASE_Z;
		let mouseOver = false;
		let pendingMouseDrop = false;
		const mouse = new Vec2();

		const primaryColor = new Color(readColorToken("--color-neon-cyan", "#2ff3e0"));
		const secondaryColor = new Color(readColorToken("--color-hot-pink", "#ff5aa5"));

		const cleanupCanvas = () => {
			if (gl?.canvas?.parentNode === container) {
				container.removeChild(gl.canvas);
			}
		};

		const initializePointsMesh = () => {
			if (!gl || !camera || !ripple || width <= 0 || height <= 0) {
				return;
			}

			const worldPointSize = (POINT_SCREEN_SIZE * worldWidth) / width;
			const columns = Math.floor(width / POINT_SCREEN_SIZE) + 1;
			const rows = Math.floor(height / POINT_SCREEN_SIZE) + 1;
			const pointCount = columns * rows;
			const originX = -worldPointSize * (columns / 2 - 0.5);
			const originY = -worldPointSize * (rows / 2 - 0.5);
			const positions = new Float32Array(pointCount * 3);
			const uvs = new Float32Array(pointCount * 2);
			const sizes = new Float32Array(pointCount);

			gridRatio = width / height;

			const uvStartX = gridRatio >= 1 ? 0 : (1 - gridRatio) / 2;
			const uvStepX = gridRatio >= 1 ? 1 / columns : gridRatio / columns;
			const uvStartY = gridRatio >= 1 ? (1 - 1 / gridRatio) / 2 : 0;
			const uvStepY = gridRatio >= 1 ? 1 / rows / gridRatio : 1 / rows;

			for (let column = 0; column < columns; column += 1) {
				const x = originX + column * worldPointSize;

				for (let row = 0; row < rows; row += 1) {
					const pointIndex = column * rows + row;
					const positionOffset = pointIndex * 3;
					const uvOffset = pointIndex * 2;

					positions.set([x, originY + row * worldPointSize, 0], positionOffset);
					uvs.set([uvStartX + column * uvStepX, uvStartY + row * uvStepY], uvOffset);
					sizes[pointIndex] = POINT_SCREEN_SIZE / 2;
				}
			}

			const geometry = new Geometry(gl, {
				position: { size: 3, data: positions },
				uv: { size: 2, data: uvs },
				size: { size: 1, data: sizes },
			});

			if (points) {
				points.geometry.remove();
				points.geometry = geometry;
				return;
			}

			const program = new Program(gl, {
				vertex: `
					precision highp float;

					const float PI = 3.1415926535897932384626433832795;

					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;
					uniform sampler2D hmap;
					uniform vec3 color1;
					uniform vec3 color2;

					attribute vec2 uv;
					attribute vec3 position;
					attribute float size;

					varying vec4 vColor;

					void main() {
						vec3 pos = position.xyz;
						vec4 htex = texture2D(hmap, uv);
						pos.z = 9.0 * htex.r;

						vec3 mixPct = vec3(0.0);
						mixPct.r = smoothstep(0.0, 0.5, htex.r);
						mixPct.g = sin(htex.r * PI);
						mixPct.b = pow(htex.r, 0.5);
						vColor = vec4(mix(color1, color2, mixPct), 1.0);

						gl_PointSize = size;
						gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
					}
				`,
				fragment: `
					precision highp float;

					varying vec4 vColor;

					void main() {
						gl_FragColor = vColor;
					}
				`,
				uniforms: {
					hmap: { value: ripple.gpgpu.read.texture },
					color1: { value: primaryColor },
					color2: { value: secondaryColor },
				},
			});

			points = new Mesh(gl, {
				geometry,
				program,
				mode: gl.POINTS,
			});
		};

		const resize = () => {
			if (!renderer || !camera) {
				return;
			}

			width = window.innerWidth;
			height = window.innerHeight;
			renderer.setSize(width, height);
			camera.perspective({ aspect: width / Math.max(height, 1) });
			worldWidth = getWorldWidth(camera);
			initializePointsMesh();
		};

		const scheduleResize = () => {
			window.clearTimeout(resizeTimeout);
			resizeTimeout = window.setTimeout(resize, RESIZE_DEBOUNCE_MS);
		};

		const updateMousePosition = (event: MouseEvent | TouchEvent) => {
			if (!gl || width <= 0 || height <= 0) {
				return;
			}

			mouseOver = true;
			const { x, y } = getEventPosition(event);

			mouse.set((x / width) * 2 - 1, (1 - y / height) * 2 - 1);

			if (gridRatio >= 1) {
				mouse.y /= gridRatio;
			} else {
				mouse.x /= gridRatio;
			}

			pendingMouseDrop = true;
		};

		const handlePointerLeave = () => {
			mouseOver = false;
		};

		const handleScroll = () => {
			if (scrollFrameId) {
				return;
			}

			scrollFrameId = window.requestAnimationFrame(() => {
				scrollFrameId = 0;
				cameraTargetZ = CAMERA_BASE_Z - getScrollProgress() * CAMERA_SCROLL_RANGE;
			});
		};

		const animate = () => {
			if (!renderer || !camera || !ripple || !points) {
				return;
			}

			animationFrameId = window.requestAnimationFrame(animate);
			camera.position.z += (cameraTargetZ - camera.position.z) * CAMERA_LERP_FACTOR;

			if (pendingMouseDrop) {
				ripple.addDrop(mouse.x, mouse.y, ACTIVE_DROP_RADIUS, ACTIVE_DROP_STRENGTH);
				pendingMouseDrop = false;
			} else if (!mouseOver) {
				const time = Date.now() * 0.00065;
				ripple.addDrop(
					Math.cos(time) * 0.16,
					Math.sin(time * 1.1) * 0.16,
					IDLE_DROP_RADIUS,
					IDLE_DROP_STRENGTH,
				);
			}

			ripple.update();
			renderer.render({ scene: points, camera });
		};

		const removeListeners = () => {
			window.removeEventListener("resize", scheduleResize);
			window.removeEventListener("scroll", handleScroll);

			if ("ontouchstart" in window) {
				document.body.removeEventListener("touchstart", updateMousePosition);
				document.body.removeEventListener("touchmove", updateMousePosition);
				document.body.removeEventListener("touchend", handlePointerLeave);
				return;
			}

			document.body.removeEventListener("mousemove", updateMousePosition);
			document.body.removeEventListener("mouseleave", handlePointerLeave);
		};

		try {
			renderer = new Renderer({
				dpr: 1,
				alpha: true,
				antialias: false,
				depth: false,
			});
			gl = renderer.gl;
			gl.clearColor(0, 0, 0, 0);
			gl.canvas.setAttribute("aria-hidden", "true");
			gl.canvas.style.display = "block";
			gl.canvas.style.width = "100%";
			gl.canvas.style.height = "100%";
			container.appendChild(gl.canvas);

			camera = new Camera(gl, { fov: 45 });
			camera.position.set(0, 0, CAMERA_BASE_Z);

			ripple = new RippleEffect(renderer, EFFECT_RESOLUTION);

			resize();
			handleScroll();
			animate();

			window.addEventListener("resize", scheduleResize);
			window.addEventListener("scroll", handleScroll, { passive: true });

			if ("ontouchstart" in window) {
				document.body.addEventListener("touchstart", updateMousePosition, {
					passive: true,
				});
				document.body.addEventListener("touchmove", updateMousePosition, {
					passive: true,
				});
				document.body.addEventListener("touchend", handlePointerLeave);
			} else {
				document.body.addEventListener("mousemove", updateMousePosition);
				document.body.addEventListener("mouseleave", handlePointerLeave);
			}

			revealFrameId = window.requestAnimationFrame(() => {
				if (!disposed) {
					setIsVisible(true);
				}
			});
		} catch (error) {
			console.warn("[MagicMoire] Unable to initialize interactive moire effect.", error);
			removeListeners();
			cleanupCanvas();
			onError?.();
			return;
		}

		return () => {
			disposed = true;
			setIsVisible(false);
			window.cancelAnimationFrame(animationFrameId);
			window.cancelAnimationFrame(revealFrameId);
			window.cancelAnimationFrame(scrollFrameId);
			window.clearTimeout(resizeTimeout);
			removeListeners();
			if (points) {
				points.geometry.remove();
			}
			cleanupCanvas();
		};
	}, [onError, theme]);

	return (
		<div
			id="magicContainer"
			ref={containerRef}
			data-testid="magic-container"
			className={cn("magic-container", isVisible && "magic-container--visible")}
		/>
	);
}

export default MagicMoire;
