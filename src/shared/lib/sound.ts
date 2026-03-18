/**
 * @module sound
 * @description Sound playback management
 */

import { getStorageString, isStorageAvailable } from "@/shared/lib/storage";

interface SoundConfig {
	volume?: number;
	preload?: boolean;
}

interface SynthNote {
	frequency: number;
	duration: number;
	gain?: number;
	wave?: OscillatorType;
}

class SoundManager {
	private audioCache: Map<string, HTMLAudioElement> = new Map();
	private backgroundMusic: HTMLAudioElement | null = null;
	private audioContext: AudioContext | null = null;
	private fallbackMusicTimeout: number | null = null;
	private fallbackMusicActive = false;
	private backgroundMusicRequested = false;
	private failedAssets: Set<string> = new Set();
	private defaultVolume = 0.3;
	private backgroundMusicVolume = 0.1;
	private currentTrackIndex = 0;
	private readonly isBrowser = isStorageAvailable();

	// Songs (large files, >1MB) - for background music
	private backgroundTracks = [
		"Main Menu 1 (Ruins)",
		"AdhesiveWombat - Night Shade",
		"Lemon Demon - The Ultimate Showdown (8-Bit Remix)",
		"what-is-love",
		"MiseryBusiness",
	];

	// Sound effects (small files, <200KB) - for actions/events
	private soundEffects = ["vote", "undo", "level-up", "wow", "surprise", "streak"];

	// Synth fallback patterns when files are missing or unavailable
	private fallbackMusicPatterns: SynthNote[][] = [
		[
			{ frequency: 261.63, duration: 0.18 },
			{ frequency: 329.63, duration: 0.18 },
			{ frequency: 392, duration: 0.18 },
			{ frequency: 523.25, duration: 0.18 },
			{ frequency: 392, duration: 0.18 },
			{ frequency: 329.63, duration: 0.18 },
			{ frequency: 293.66, duration: 0.18 },
			{ frequency: 349.23, duration: 0.18 },
		],
		[
			{ frequency: 220, duration: 0.18 },
			{ frequency: 293.66, duration: 0.18 },
			{ frequency: 329.63, duration: 0.18 },
			{ frequency: 440, duration: 0.18 },
			{ frequency: 392, duration: 0.18 },
			{ frequency: 329.63, duration: 0.18 },
			{ frequency: 293.66, duration: 0.18 },
			{ frequency: 261.63, duration: 0.18 },
		],
		[
			{ frequency: 174.61, duration: 0.18 },
			{ frequency: 220, duration: 0.18 },
			{ frequency: 261.63, duration: 0.18 },
			{ frequency: 349.23, duration: 0.18 },
			{ frequency: 392, duration: 0.18 },
			{ frequency: 349.23, duration: 0.18 },
			{ frequency: 261.63, duration: 0.18 },
			{ frequency: 220, duration: 0.18 },
		],
		[
			{ frequency: 196, duration: 0.18 },
			{ frequency: 246.94, duration: 0.18 },
			{ frequency: 293.66, duration: 0.18 },
			{ frequency: 392, duration: 0.18 },
			{ frequency: 329.63, duration: 0.18 },
			{ frequency: 293.66, duration: 0.18 },
			{ frequency: 246.94, duration: 0.18 },
			{ frequency: 220, duration: 0.18 },
		],
		[
			{ frequency: 233.08, duration: 0.18 },
			{ frequency: 293.66, duration: 0.18 },
			{ frequency: 349.23, duration: 0.18 },
			{ frequency: 466.16, duration: 0.18 },
			{ frequency: 392, duration: 0.18 },
			{ frequency: 349.23, duration: 0.18 },
			{ frequency: 293.66, duration: 0.18 },
			{ frequency: 261.63, duration: 0.18 },
		],
	];

	constructor() {
		if (!this.isBrowser) {
			return;
		}
		this.preloadSounds();
		this.preloadBackgroundMusic();
	}

	private createAudioElement(name: string): HTMLAudioElement | null {
		if (typeof Audio === "undefined") {
			return null;
		}

		const audio = new Audio(`/assets/sounds/${name}.mp3`);
		audio.preload = "auto";
		audio.addEventListener(
			"error",
			() => {
				this.failedAssets.add(name);
			},
			{ once: true },
		);
		return audio;
	}

	private isAutoplayError(error: unknown): boolean {
		const maybeError = error as { name?: string } | null;
		return maybeError?.name === "NotAllowedError" || maybeError?.name === "AbortError";
	}

	private getAudioContext(): AudioContext | null {
		if (!this.isBrowser) {
			return null;
		}

		const browserGlobal = globalThis as typeof globalThis & {
			AudioContext?: typeof AudioContext;
			webkitAudioContext?: typeof AudioContext;
		};
		const AudioContextConstructor = browserGlobal.AudioContext || browserGlobal.webkitAudioContext;
		if (!AudioContextConstructor) {
			return null;
		}

		if (!this.audioContext) {
			this.audioContext = new AudioContextConstructor();
		}

		const context = this.audioContext;
		if (!context) {
			return null;
		}

		if (context.state === "suspended") {
			context.resume().catch(() => {
				/* ignore browser policy errors */
			});
		}

		return context;
	}

	private scheduleSynthNote(
		context: AudioContext,
		note: SynthNote,
		startAt: number,
		volume: number,
	) {
		if (note.frequency <= 0) {
			return;
		}

		const oscillator = context.createOscillator();
		const gainNode = context.createGain();
		const noteVolume = Math.max(0.001, Math.min(1, volume * (note.gain ?? 1)));
		const attack = Math.min(0.02, note.duration * 0.2);
		const release = Math.min(0.08, note.duration * 0.45);
		const releaseStart = Math.max(startAt + attack + 0.01, startAt + note.duration - release);

		oscillator.type = note.wave ?? "triangle";
		oscillator.frequency.setValueAtTime(note.frequency, startAt);

		gainNode.gain.setValueAtTime(0.0001, startAt);
		gainNode.gain.exponentialRampToValueAtTime(noteVolume, startAt + attack);
		gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseStart);

		oscillator.connect(gainNode);
		gainNode.connect(context.destination);
		oscillator.start(startAt);
		oscillator.stop(startAt + note.duration + 0.03);
	}

	private playSynthSequence(notes: SynthNote[], volume: number): number {
		const context = this.getAudioContext();
		if (!context) {
			return 0;
		}

		const startTime = context.currentTime + 0.01;
		let cursor = 0;
		for (const note of notes) {
			this.scheduleSynthNote(context, note, startTime + cursor, volume);
			cursor += note.duration;
		}
		return cursor;
	}

	private getFallbackEffectPattern(soundName: string): SynthNote[] | null {
		switch (soundName) {
			case "vote":
				return [
					{ frequency: 523.25, duration: 0.05 },
					{ frequency: 659.25, duration: 0.08 },
				];
			case "undo":
				return [
					{ frequency: 659.25, duration: 0.06 },
					{ frequency: 523.25, duration: 0.08 },
				];
			case "level-up":
				return [
					{ frequency: 392, duration: 0.08 },
					{ frequency: 523.25, duration: 0.08 },
					{ frequency: 659.25, duration: 0.08 },
					{ frequency: 783.99, duration: 0.12 },
				];
			case "wow":
				return [
					{ frequency: 440, duration: 0.09, wave: "sawtooth" },
					{ frequency: 554.37, duration: 0.09, wave: "triangle" },
					{ frequency: 659.25, duration: 0.18, wave: "triangle" },
				];
			case "surprise":
				return [
					{ frequency: 220, duration: 0.06, wave: "sine" },
					{ frequency: 440, duration: 0.06, wave: "square" },
					{ frequency: 880, duration: 0.12, wave: "triangle" },
				];
			case "streak":
				return [
					{ frequency: 587.33, duration: 0.06 },
					{ frequency: 739.99, duration: 0.06 },
					{ frequency: 880, duration: 0.08 },
				];
			default:
				return null;
		}
	}

	private playFallbackEffect(soundName: string, volume: number) {
		const pattern = this.getFallbackEffectPattern(soundName);
		if (!pattern) {
			return;
		}
		this.playSynthSequence(pattern, volume);
	}

	private stopFallbackMusic() {
		this.fallbackMusicActive = false;
		if (this.fallbackMusicTimeout !== null) {
			window.clearTimeout(this.fallbackMusicTimeout);
			this.fallbackMusicTimeout = null;
		}
	}

	private startFallbackMusic() {
		if (!this.isBrowser || !this.canPlaySounds()) {
			return;
		}

		this.stopFallbackMusic();
		this.fallbackMusicActive = true;

		const playLoop = () => {
			if (!this.fallbackMusicActive || !this.backgroundMusicRequested) {
				return;
			}

			const pattern =
				this.fallbackMusicPatterns[this.currentTrackIndex % this.fallbackMusicPatterns.length] ??
				this.fallbackMusicPatterns[0];
			if (!pattern) {
				return;
			}
			const leadDuration = this.playSynthSequence(
				pattern,
				Math.max(0.04, this.backgroundMusicVolume * 0.7),
			);

			// Add a low bass pulse every other beat to keep loop energy up.
			const bassPattern = pattern
				.filter((_, index) => index % 2 === 0)
				.map((note) => ({
					frequency: note.frequency / 2,
					duration: note.duration * 2,
					gain: 0.5,
					wave: "sine" as OscillatorType,
				}));
			const bassDuration = this.playSynthSequence(
				bassPattern,
				Math.max(0.03, this.backgroundMusicVolume * 0.5),
			);

			const loopDurationMs = Math.max(
				650,
				Math.round(Math.max(leadDuration, bassDuration, 1.35) * 1000),
			);
			this.fallbackMusicTimeout = window.setTimeout(playLoop, loopDurationMs - 35);
		};

		playLoop();
	}

	private preloadSounds() {
		// Preload only sound effects (small files)
		this.soundEffects.forEach((soundName) => {
			const audio = this.createAudioElement(soundName);
			if (!audio) {
				return;
			}
			audio.volume = this.defaultVolume;
			this.audioCache.set(soundName, audio);
		});
	}

	private preloadBackgroundMusic() {
		this.loadBackgroundTrack(this.backgroundTracks[this.currentTrackIndex] ?? "");
	}

	playNextTrack() {
		this.currentTrackIndex = (this.currentTrackIndex + 1) % this.backgroundTracks.length;
		const nextTrack = this.backgroundTracks[this.currentTrackIndex];
		if (nextTrack) {
			this.loadBackgroundTrack(nextTrack);
			if (this.backgroundMusicRequested) {
				this.playBackgroundMusic();
			}
		}
	}

	playPreviousTrack() {
		this.currentTrackIndex =
			(this.currentTrackIndex - 1 + this.backgroundTracks.length) % this.backgroundTracks.length;
		const prevTrack = this.backgroundTracks[this.currentTrackIndex];
		if (prevTrack) {
			this.loadBackgroundTrack(prevTrack);
			if (this.backgroundMusicRequested) {
				this.playBackgroundMusic();
			}
		}
	}

	private loadBackgroundTrack(trackName: string) {
		if (this.backgroundMusic) {
			this.backgroundMusic.pause();
		}

		const audio = this.createAudioElement(trackName);
		if (!audio) {
			this.backgroundMusic = null;
			return;
		}

		this.backgroundMusic = audio;
		this.backgroundMusic.loop = true;
		this.backgroundMusic.volume = this.backgroundMusicVolume;
	}

	getCurrentTrack(): string {
		return this.backgroundTracks[this.currentTrackIndex] || "Unknown Track";
	}

	getAvailableSongs(): string[] {
		return [...this.backgroundTracks];
	}

	getAvailableSoundEffects(): string[] {
		return [...this.soundEffects];
	}

	isSong(soundName: string): boolean {
		return this.backgroundTracks.includes(soundName);
	}

	isSoundEffect(soundName: string): boolean {
		return this.soundEffects.includes(soundName);
	}

	play(soundName: string, config: SoundConfig = {}) {
		if (!this.canPlaySounds()) {
			return;
		}

		try {
			const volume = config.volume ?? this.defaultVolume;

			if (this.failedAssets.has(soundName)) {
				this.playFallbackEffect(soundName, volume);
				return;
			}

			// Try to get from cache first
			let audio: HTMLAudioElement | null = this.audioCache.get(soundName) ?? null;

			// If not in cache, try to create it on-demand
			if (!audio) {
				audio = this.createAudioElement(soundName);
			}

			if (!audio) {
				this.failedAssets.add(soundName);
				this.playFallbackEffect(soundName, volume);
				return;
			}

			audio.volume = volume;
			this.audioCache.set(soundName, audio);

			const soundInstance = audio.cloneNode() as HTMLAudioElement;
			soundInstance.volume = volume;
			soundInstance.currentTime = 0;
			soundInstance.addEventListener(
				"error",
				() => {
					this.failedAssets.add(soundName);
					this.playFallbackEffect(soundName, volume);
				},
				{ once: true },
			);

			const playPromise = soundInstance.play();

			if (playPromise !== undefined) {
				playPromise.catch((error) => {
					if (this.isAutoplayError(error)) {
						console.debug("Sound playback blocked by browser policy:", error);
						return;
					}

					this.failedAssets.add(soundName);
					this.playFallbackEffect(soundName, volume);
				});
			}
		} catch (error) {
			console.warn(`Error playing sound "${soundName}":`, error);
			this.playFallbackEffect(soundName, config.volume ?? this.defaultVolume);
		}
	}

	setDefaultVolume(volume: number) {
		this.defaultVolume = Math.max(0, Math.min(1, volume));
	}

	playBackgroundMusic() {
		this.backgroundMusicRequested = true;
		if (!this.canPlaySounds()) {
			return;
		}

		const trackName = this.backgroundTracks[this.currentTrackIndex];
		if (!trackName || this.failedAssets.has(trackName) || !this.backgroundMusic) {
			this.startFallbackMusic();
			return;
		}

		this.stopFallbackMusic();
		this.backgroundMusic.currentTime = 0;
		this.backgroundMusic.play().catch((error) => {
			if (this.isAutoplayError(error)) {
				console.debug("Background music playback blocked:", error);
				return;
			}

			this.failedAssets.add(trackName);
			this.startFallbackMusic();
		});
	}

	private stopNativeBackgroundMusic() {
		if (this.backgroundMusic) {
			this.backgroundMusic.pause();
			this.backgroundMusic.currentTime = 0;
		}
	}

	stopBackgroundMusic() {
		this.backgroundMusicRequested = false;
		this.stopNativeBackgroundMusic();
		this.stopFallbackMusic();
	}

	setBackgroundMusicVolume(volume: number) {
		this.backgroundMusicVolume = Math.max(0, Math.min(1, volume));
		if (this.backgroundMusic) {
			this.backgroundMusic.volume = this.backgroundMusicVolume;
		}
	}

	canPlaySounds(): boolean {
		if (!this.isBrowser) {
			return false;
		}

		// Support both historical and current key names.
		const soundEnabled = getStorageString("soundEnabled") ?? getStorageString("sound-enabled");
		return soundEnabled !== "false";
	}
}

const soundManager = new SoundManager();

/**
 * Play a sound if audio is enabled
 */
export const playSound = (soundName: string, config?: SoundConfig) => {
	if (soundManager.canPlaySounds()) {
		soundManager.play(soundName, config);
	}
};

/**
 * Background music controls
 */
export const playBackgroundMusic = () => soundManager.playBackgroundMusic();
export const stopBackgroundMusic = () => soundManager.stopBackgroundMusic();
export const setBackgroundMusicVolume = (volume: number) =>
	soundManager.setBackgroundMusicVolume(volume);
export const playNextTrack = () => soundManager.playNextTrack();
export const playPreviousTrack = () => soundManager.playPreviousTrack();
export const getCurrentTrack = () => soundManager.getCurrentTrack();

/**
 * Audio organization helpers
 */

/**
 * Additional sound effects
 */
export const playLevelUpSound = (config?: SoundConfig) => playSound("level-up", config);
export const playWowSound = (config?: SoundConfig) => playSound("wow", config);
export const playSurpriseSound = (config?: SoundConfig) => playSound("surprise", config);
export const playStreakSound = (config?: SoundConfig) => playSound("streak", config);
