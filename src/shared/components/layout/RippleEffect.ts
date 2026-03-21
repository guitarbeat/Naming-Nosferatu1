import {
	Mesh,
	type OGLRenderingContext,
	Program,
	type Renderer,
	RenderTarget,
	Triangle,
	Vec2,
} from "ogl";

const FULLSCREEN_VERTEX_SHADER =
	"attribute vec2 uv, position; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }";

const createRenderTargetOptions = (
	gl: OGLRenderingContext,
	width: number,
	height: number,
	type?: number,
) => {
	const halfFloatExtension = gl.renderer.extensions.OES_texture_half_float;
	const resolvedType =
		type ?? gl.HALF_FLOAT ?? halfFloatExtension?.HALF_FLOAT_OES ?? gl.UNSIGNED_BYTE;
	const internalFormat = gl.renderer.isWebgl2
		? resolvedType === gl.FLOAT
			? (gl as WebGL2RenderingContext).RGBA32F
			: (gl as WebGL2RenderingContext).RGBA16F
		: gl.RGBA;

	return {
		width,
		height,
		type: resolvedType,
		internalFormat,
		depth: false,
		unpackAlignment: 1,
	};
};

class GpgpuSurface {
	gl: OGLRenderingContext;
	read: RenderTarget;
	write: RenderTarget;
	mesh: Mesh;

	constructor(gl: OGLRenderingContext, width: number, height: number, type?: number) {
		this.gl = gl;
		this.read = new RenderTarget(gl, createRenderTargetOptions(gl, width, height, type));
		this.write = new RenderTarget(gl, createRenderTargetOptions(gl, width, height, type));
		this.mesh = new Mesh(gl, { geometry: new Triangle(gl) });
	}

	renderProgram(program: Program) {
		this.mesh.program = program;
		this.gl.renderer.render({
			scene: this.mesh,
			target: this.write,
			clear: false,
		});
		this.swap();
	}

	swap() {
		[this.read, this.write] = [this.write, this.read];
	}
}

class RippleEffect {
	gl: OGLRenderingContext;
	delta: Vec2;
	gpgpu: GpgpuSurface;
	updateProgram: Program;
	dropProgram: Program;

	constructor(renderer: Renderer, resolution = 384) {
		this.gl = renderer.gl;
		this.delta = new Vec2(1 / resolution, 1 / resolution);
		this.gpgpu = new GpgpuSurface(renderer.gl, resolution, resolution);
		this.updateProgram = new Program(this.gl, {
			vertex: FULLSCREEN_VERTEX_SHADER,
			fragment: `
				precision highp float;

				uniform sampler2D tDiffuse;
				uniform vec2 uDelta;

				varying vec2 vUv;

				void main() {
					vec4 texel = texture2D(tDiffuse, vUv);
					vec2 dx = vec2(uDelta.x, 0.0);
					vec2 dy = vec2(0.0, uDelta.y);

					float average = (
						texture2D(tDiffuse, vUv - dx).r +
						texture2D(tDiffuse, vUv - dy).r +
						texture2D(tDiffuse, vUv + dx).r +
						texture2D(tDiffuse, vUv + dy).r
					) * 0.25;

					texel.g += (average - texel.r) * 2.0;
					texel.g *= 0.8;
					texel.r += texel.g;

					gl_FragColor = texel;
				}
			`,
			uniforms: {
				tDiffuse: { value: null },
				uDelta: { value: this.delta },
			},
		});
		this.dropProgram = new Program(this.gl, {
			vertex: FULLSCREEN_VERTEX_SHADER,
			fragment: `
				precision highp float;

				const float PI = 3.1415926535897932384626433832795;

				uniform sampler2D tDiffuse;
				uniform vec2 uCenter;
				uniform float uRadius;
				uniform float uStrength;

				varying vec2 vUv;

				void main() {
					vec4 texel = texture2D(tDiffuse, vUv);
					float drop = max(0.0, 1.0 - length(uCenter * 0.5 + 0.5 - vUv) / uRadius);
					drop = 0.5 - cos(drop * PI) * 0.5;
					texel.r += drop * uStrength;
					gl_FragColor = texel;
				}
			`,
			uniforms: {
				tDiffuse: { value: null },
				uCenter: { value: new Vec2() },
				uRadius: { value: 0.04 },
				uStrength: { value: 0.03 },
			},
		});
	}

	update() {
		this.updateProgram.uniforms.tDiffuse.value = this.gpgpu.read.texture;
		this.gpgpu.renderProgram(this.updateProgram);
	}

	addDrop(x: number, y: number, radius: number, strength: number) {
		this.dropProgram.uniforms.tDiffuse.value = this.gpgpu.read.texture;
		this.dropProgram.uniforms.uCenter.value.set(x, y);
		this.dropProgram.uniforms.uRadius.value = radius;
		this.dropProgram.uniforms.uStrength.value = strength;
		this.gpgpu.renderProgram(this.dropProgram);
	}
}

export default RippleEffect;
