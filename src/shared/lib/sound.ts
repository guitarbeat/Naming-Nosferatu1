/**
 * @module sound
 * @description Sound playback management
 */

interface SoundConfig {
	volume?: number;
	preload?: boolean;
}

class SoundManager {
	private audioCache: Map<string, HTMLAudioElement> = new Map();
	private backgroundMusic: HTMLAudioElement | null = null;
	private defaultVolume = 0.3;
	private backgroundMusicVolume = 0.1;
	private currentTrackIndex = 0;

	// Songs (large files, >1MB) - for background music
	private backgroundTracks = [
		"Main Menu 1 (Ruins)",
		"AdhesiveWombat - Night Shade",
		"Lemon Demon - The Ultimate Showdown (8-Bit Remix)",
		"what-is-love",
		"MiseryBusiness",
	];

	// Sound effects (small files, <200KB) - for actions/events
	private soundEffects = ["vote", "undo", "level-up", "wow", "surprise"];

	constructor() {
		this.preloadSounds();
		this.preloadBackgroundMusic();
	}

	private preloadSounds() {
		// Preload only sound effects (small files)
		this.soundEffects.forEach((soundName) => {
			const audio = new Audio(`/assets/sounds/${soundName}.mp3`);
			audio.preload = "auto";
			audio.volume = this.defaultVolume;
			this.audioCache.set(soundName, audio);
		});
	}

	private preloadBackgroundMusic() {
		// Preload first track as background music
		const firstTrack = this.backgroundTracks[this.currentTrackIndex];
		this.backgroundMusic = new Audio(`/assets/sounds/${firstTrack}.mp3`);
		this.backgroundMusic.loop = true;
		this.backgroundMusic.volume = this.backgroundMusicVolume;
		this.backgroundMusic.preload = "auto";
	}

	playNextTrack() {
		this.currentTrackIndex = (this.currentTrackIndex + 1) % this.backgroundTracks.length;
		const nextTrack = this.backgroundTracks[this.currentTrackIndex];
		if (nextTrack) {
			this.loadBackgroundTrack(nextTrack);
			if (this.backgroundMusic && this.canPlaySounds()) {
				this.backgroundMusic.play().catch((error) => {
					console.debug("Background music playback blocked:", error);
				});
			}
		}
	}

	playPreviousTrack() {
		this.currentTrackIndex =
			(this.currentTrackIndex - 1 + this.backgroundTracks.length) % this.backgroundTracks.length;
		const prevTrack = this.backgroundTracks[this.currentTrackIndex];
		if (prevTrack) {
			this.loadBackgroundTrack(prevTrack);
			if (this.backgroundMusic && this.canPlaySounds()) {
				this.backgroundMusic.play().catch((error) => {
					console.debug("Background music playback blocked:", error);
				});
			}
		}
	}

	private loadBackgroundTrack(trackName: string) {
		const wasPlaying = this.backgroundMusic && !this.backgroundMusic.paused;
		this.backgroundMusic = new Audio(`/assets/sounds/${trackName}.mp3`);
		this.backgroundMusic.loop = true;
		this.backgroundMusic.volume = this.backgroundMusicVolume;
		this.backgroundMusic.preload = "auto";
		if (wasPlaying) {
			this.backgroundMusic.play().catch(() => {
				/* ignore */
			});
		}
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
		try {
			// Try to get from cache first
			let audio = this.audioCache.get(soundName);

			// If not in cache, try to create it on-demand
			if (!audio) {
				try {
					audio = new Audio(`/assets/sounds/${soundName}.mp3`);
					audio.volume = config.volume ?? this.defaultVolume;
					this.audioCache.set(soundName, audio);
				} catch (error) {
					console.warn(`Failed to load sound "${soundName}":`, error);
					// Fallback to console log for now
					if (soundName === "vote") {
						console.log("🔊 Vote sound (audio file not found)");
					} else if (soundName === "undo") {
						console.log("🔊 Undo sound (audio file not found)");
					}
					return;
				}
			}

			const soundInstance = audio.cloneNode() as HTMLAudioElement;
			soundInstance.volume = config.volume ?? this.defaultVolume;
			soundInstance.currentTime = 0;

			const playPromise = soundInstance.play();

			if (playPromise !== undefined) {
				playPromise.catch((error) => {
					console.debug("Sound playback blocked by browser policy:", error);
				});
			}
		} catch (error) {
			console.warn("Error playing sound:", error);
		}
	}

	setDefaultVolume(volume: number) {
		this.defaultVolume = Math.max(0, Math.min(1, volume));
	}

	playBackgroundMusic() {
		if (this.backgroundMusic && this.canPlaySounds()) {
			this.backgroundMusic.play().catch((error) => {
				console.debug("Background music playback blocked:", error);
			});
		}
	}

	stopBackgroundMusic() {
		if (this.backgroundMusic) {
			this.backgroundMusic.pause();
			this.backgroundMusic.currentTime = 0;
		}
	}

	setBackgroundMusicVolume(volume: number) {
		this.backgroundMusicVolume = Math.max(0, Math.min(1, volume));
		if (this.backgroundMusic) {
			this.backgroundMusic.volume = this.backgroundMusicVolume;
		}
	}

	canPlaySounds(): boolean {
		// Support both historical and current key names.
		const soundEnabled =
			localStorage.getItem("soundEnabled") ?? localStorage.getItem("sound-enabled");
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
