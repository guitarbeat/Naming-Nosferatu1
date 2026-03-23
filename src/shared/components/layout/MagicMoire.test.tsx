import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MagicMoire } from "./MagicMoire";

let mockCanvas: HTMLCanvasElement;

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
		gpgpu = { read: { texture: {} } };
		update = vi.fn();
		addDrop = vi.fn();
	},
}));

describe("MagicMoire", () => {
	let rafQueue: FrameRequestCallback[] = [];

	beforeEach(() => {
		mockCanvas = document.createElement("canvas");
		rafQueue = [];

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
			{
				passive: true,
			},
		);
		expect(
			(
				document.body.addEventListener as ReturnType<typeof vi.fn>
			).mock.calls.some(([eventName]) =>
				["mousemove", "touchstart"].includes(String(eventName)),
			),
		).toBe(true);

		act(() => {
			rafQueue.at(-1)?.(0);
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
			).mock.calls.some(([eventName]) =>
				["mousemove", "touchstart"].includes(String(eventName)),
			),
		).toBe(true);
		expect(mockCanvas.parentNode).toBeNull();
	});
});
