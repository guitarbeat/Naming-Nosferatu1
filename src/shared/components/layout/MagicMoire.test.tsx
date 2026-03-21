import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MagicMoire } from "./MagicMoire";

let mockCanvas: HTMLCanvasElement;

type RippleEffectMock = {
	gpgpu: { read: { texture: Record<string, never> } };
	update: ReturnType<typeof vi.fn>;
	addDrop: ReturnType<typeof vi.fn>;
};

let rippleEffectMock: RippleEffectMock;

function createRippleEffectMock(): RippleEffectMock {
	return {
		gpgpu: { read: { texture: {} } },
		update: vi.fn(),
		addDrop: vi.fn(),
	};
}

vi.mock("ogl", () => ({
	Renderer: class {
		gl = {
			canvas: mockCanvas,
			clearColor: vi.fn(),
			renderer: {
				extensions: { OES_texture_half_float: { HALF_FLOAT_OES: 1 } },
				isWebgl2: false,
			},
			POINTS: 0,
			HALF_FLOAT: 1,
			FLOAT: 2,
			UNSIGNED_BYTE: 3,
			RGBA: 4,
		};
		setSize = vi.fn();
		render = vi.fn();
		constructor() {
			this.gl.renderer.render = this.render;
		}
	},
	Camera: class {
		fov = 45;
		aspect = 1;
		position = {
			z: 50,
			set: vi.fn((_x: number, _y: number, z: number) => {
				this.position.z = z;
			}),
		};
		perspective = vi.fn(({ aspect }: { aspect: number }) => {
			this.aspect = aspect;
			return this;
		});
	},
	Geometry: class {
		remove = vi.fn();
	},
	Program: class {
		uniforms;
		constructor(_gl: unknown, options: { uniforms?: Record<string, unknown> }) {
			this.uniforms = options.uniforms ?? {};
		}
	},
	Mesh: class {
		geometry;
		program;
		constructor(
			_gl: unknown,
			options: { geometry?: unknown; program?: unknown },
		) {
			this.geometry = options.geometry;
			this.program = options.program;
		}
	},
	Color: class extends Array<number> {
		constructor(color = [0, 0, 0]) {
			super(...(Array.isArray(color) ? color : [0, 0, 0]));
		}
	},
	Vec2: class extends Array<number> {
		x = 0;
		y = 0;
		constructor(x = 0, y = 0) {
			super(x, y);
			this.x = x;
			this.y = y;
		}
		set(x: number, y: number) {
			this.x = x;
			this.y = y;
			return this;
		}
	},
}));

vi.mock("./RippleEffect", () => ({
	default: class {
		gpgpu;
		update;
		addDrop;
		constructor() {
			rippleEffectMock = createRippleEffectMock();
			this.gpgpu = rippleEffectMock.gpgpu;
			this.update = rippleEffectMock.update;
			this.addDrop = rippleEffectMock.addDrop;
		}
	},
}));

describe("MagicMoire", () => {
	let rafQueue: FrameRequestCallback[] = [];

	const flushAnimationFrameQueue = () => {
		const scheduledFrames = [...rafQueue];
		rafQueue = [];

		for (const callback of scheduledFrames) {
			callback(16);
		}
	};

	const getBodyListener = (eventName: string) => {
		const addEventListenerMock =
			document.body.addEventListener as unknown as ReturnType<typeof vi.fn>;
		const call = addEventListenerMock.mock.calls.find(
			([registeredEventName]) => registeredEventName === eventName,
		);
		expect(call).toBeDefined();
		return call?.[1] as EventListener;
	};

	const expectLatestActiveDrop = (expectedX: number, expectedY: number) => {
		expect(rippleEffectMock.addDrop).toHaveBeenCalled();
		const lastCall = rippleEffectMock.addDrop.mock.calls.at(-1);
		expect(lastCall).toBeDefined();
		expect(lastCall?.[0]).toBeCloseTo(expectedX);
		expect(lastCall?.[1]).toBeCloseTo(expectedY);
		expect(lastCall?.[2]).toBe(0.04);
		expect(lastCall?.[3]).toBe(0.03);
	};

	beforeEach(() => {
		mockCanvas = document.createElement("canvas");
		rafQueue = [];
		rippleEffectMock = createRippleEffectMock();
		delete (window as Window & { ontouchstart?: unknown }).ontouchstart;
		Object.defineProperty(window, "innerWidth", {
			value: 400,
			configurable: true,
			writable: true,
		});
		Object.defineProperty(window, "innerHeight", {
			value: 300,
			configurable: true,
			writable: true,
		});
		vi.spyOn(mockCanvas, "getBoundingClientRect").mockReturnValue({
			x: 80,
			y: 40,
			left: 80,
			top: 40,
			width: 400,
			height: 300,
			right: 480,
			bottom: 340,
			toJSON: () => ({}),
		} as DOMRect);

		vi.stubGlobal(
			"requestAnimationFrame",
			vi.fn((callback: FrameRequestCallback) => {
				rafQueue.push(callback);
				return rafQueue.length;
			}),
		);
		vi.stubGlobal("cancelAnimationFrame", vi.fn());
		vi.spyOn(window, "addEventListener");
		vi.spyOn(window, "removeEventListener");
		vi.spyOn(document.body, "addEventListener");
		vi.spyOn(document.body, "removeEventListener");
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("mounts, fades in, and cleans up listeners on unmount", () => {
		const { unmount } = render(<MagicMoire theme="dark" />);

		expect(screen.getByTestId("magic-container")).toBeInTheDocument();
		expect(screen.getByTestId("magic-container").querySelector("canvas")).toBe(
			mockCanvas,
		);
		expect(window.addEventListener).toHaveBeenCalledWith(
			"resize",
			expect.any(Function),
		);
		expect(window.addEventListener).toHaveBeenCalledWith(
			"scroll",
			expect.any(Function),
			{ passive: true },
		);
		expect(
			(document.body.addEventListener as ReturnType<typeof vi.fn>).mock.calls.some(
				([eventName]) => eventName === "mousemove",
			),
		).toBe(true);

		act(() => {
			flushAnimationFrameQueue();
		});

		expect(screen.getByTestId("magic-container")).toHaveClass(
			"magic-container--visible",
		);

		unmount();

		expect(window.removeEventListener).toHaveBeenCalledWith(
			"resize",
			expect.any(Function),
		);
		expect(window.removeEventListener).toHaveBeenCalledWith(
			"scroll",
			expect.any(Function),
		);
		expect(
			(
				document.body.removeEventListener as ReturnType<typeof vi.fn>
			).mock.calls.some(([eventName]) => eventName === "mousemove"),
		).toBe(true);
		expect(mockCanvas.parentNode).toBeNull();
	});

	it("uses mouse client coordinates relative to the canvas bounds", () => {
		render(<MagicMoire theme="dark" />);
		rippleEffectMock.addDrop.mockClear();

		const handleMouseMove = getBodyListener("mousemove");

		act(() => {
			handleMouseMove({
				clientX: 180,
				clientY: 100,
				pageX: 980,
				pageY: 900,
			} as unknown as Event);
			flushAnimationFrameQueue();
		});

		expectLatestActiveDrop(-0.5, 0.45);
	});

	it("uses touch client coordinates relative to the canvas bounds", () => {
		Object.defineProperty(window, "ontouchstart", {
			value: null,
			configurable: true,
		});

		render(<MagicMoire theme="dark" />);
		rippleEffectMock.addDrop.mockClear();

		const handleTouchMove = getBodyListener("touchmove");

		act(() => {
			handleTouchMove({
				changedTouches: [
					{
						clientX: 260,
						clientY: 130,
						pageX: 860,
						pageY: 930,
					},
				],
			} as unknown as Event);
			flushAnimationFrameQueue();
		});

		expectLatestActiveDrop(-0.1, 0.3);
	});
});
