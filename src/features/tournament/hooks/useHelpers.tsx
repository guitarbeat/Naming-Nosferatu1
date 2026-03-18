/**
 * @module useHelpers
 * @description Consolidated tournament helper hooks
 * Combines: useAudioManager, useProfileNotifications
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "@/shared/lib/constants";
import { getStorageString, isStorageAvailable, setStorageString } from "@/shared/lib/storage";
import {
	getCurrentTrack,
	playBackgroundMusic,
	playLevelUpSound,
	playNextTrack,
	playPreviousTrack,
	playSound,
	playStreakSound as playStreakCue,
	playSurpriseSound,
	playWowSound,
	setBackgroundMusicVolume,
	stopBackgroundMusic,
} from "@/shared/lib/sound";

/* =========================================================================
   AUDIO MANAGER HOOK
   ========================================================================= */

interface UseAudioManagerResult {
	isMuted: boolean;
	handleToggleMute: () => void;
	playVoteSound: () => void;
	playUndoSound: () => void;
	playStreakSound: (streakSize?: number) => void;
	volume: number;
	handleVolumeChange: (_unused: unknown, v: number) => void;
	playAudioTrack: () => void;
	handleNextTrack: () => void;
	handlePreviousTrack: () => void;
	isShuffle: boolean;
	handleToggleShuffle: () => void;
	currentTrack: string;
	trackInfo: null;
	audioError: null;
	retryAudio: () => void;
	backgroundMusicEnabled: boolean;
	toggleBackgroundMusic: () => void;
	backgroundMusicVolume: number;
	handleBackgroundMusicVolumeChange: (volume: number) => void;
	playLevelUpSound: () => void;
	playWowSound: () => void;
	playSurpriseSound: () => void;
	primeAudioExperience: () => void;
}

const BACKGROUND_MUSIC_ENABLED_KEY = "tournamentBackgroundMusicEnabled";
const DEFAULT_EFFECTS_VOLUME = 0.3;
const DEFAULT_MUSIC_VOLUME = 0.1;

function readStoredNumber(key: string, fallback: number): number {
	if (!isStorageAvailable()) {
		return fallback;
	}

	const rawValue = getStorageString(key);
	const parsed = rawValue ? Number.parseFloat(rawValue) : Number.NaN;
	if (Number.isNaN(parsed)) {
		return fallback;
	}
	return Math.min(1, Math.max(0, parsed));
}

function readStoredBoolean(key: string): boolean | null {
	if (!isStorageAvailable()) {
		return null;
	}

	const rawValue = getStorageString(key);
	if (rawValue === null) {
		return null;
	}
	return rawValue !== "false";
}

function writeStorage(key: string, value: string) {
	setStorageString(key, value);
}

export function useAudioManager(): UseAudioManagerResult {
	const [isMuted, setIsMuted] = useState(() => {
		const storedEnabled = readStoredBoolean(STORAGE_KEYS.SOUND_ENABLED);
		if (storedEnabled === null) {
			return false;
		}
		return !storedEnabled;
	});
	const [volume, setVolume] = useState(() =>
		readStoredNumber(STORAGE_KEYS.EFFECTS_VOLUME, DEFAULT_EFFECTS_VOLUME),
	);
	const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(() => {
		const stored = readStoredBoolean(BACKGROUND_MUSIC_ENABLED_KEY);
		return stored ?? false;
	});
	const [backgroundMusicVolume, setBackgroundMusicVolumeState] = useState(() =>
		readStoredNumber(STORAGE_KEYS.MUSIC_VOLUME, DEFAULT_MUSIC_VOLUME),
	);
	const audioPrimedRef = useRef(false);

	useEffect(() => {
		setBackgroundMusicVolume(backgroundMusicVolume);
	}, [backgroundMusicVolume]);

	const playVoteSound = useCallback(() => {
		if (!isMuted) {
			playSound("vote", { volume });
		}
	}, [isMuted, volume]);

	const playUndoSound = useCallback(() => {
		if (!isMuted) {
			playSound("undo", { volume });
		}
	}, [isMuted, volume]);

	const playStreakSound = useCallback(
		(streakSize = 2) => {
			if (isMuted) {
				return;
			}

			const streakBoost = Math.min(0.28, Math.max(0, streakSize - 1) * 0.04);
			playStreakCue({ volume: Math.min(1, volume + streakBoost) });
		},
		[isMuted, volume],
	);

	const playLevelUpEffect = useCallback(() => {
		if (!isMuted) {
			playLevelUpSound({ volume });
		}
	}, [isMuted, volume]);

	const playWowEffect = useCallback(() => {
		if (!isMuted) {
			playWowSound({ volume });
		}
	}, [isMuted, volume]);

	const playSurpriseEffect = useCallback(() => {
		if (!isMuted) {
			playSurpriseSound({ volume });
		}
	}, [isMuted, volume]);

	const handleVolumeChange = useCallback((_unused: unknown, v: number) => {
		const newVolume = Math.min(1, Math.max(0, v));
		setVolume(newVolume);
		writeStorage(STORAGE_KEYS.EFFECTS_VOLUME, String(newVolume));
	}, []);

	const handleToggleMute = useCallback(() => {
		setIsMuted((previous) => {
			const nextMuted = !previous;
			writeStorage(STORAGE_KEYS.SOUND_ENABLED, String(!nextMuted));

			if (nextMuted) {
				stopBackgroundMusic();
				setBackgroundMusicEnabled(false);
				writeStorage(BACKGROUND_MUSIC_ENABLED_KEY, "false");
			}
			return nextMuted;
		});
	}, []);

	const toggleBackgroundMusic = useCallback(() => {
		setBackgroundMusicEnabled((previous) => {
			if (isMuted) {
				stopBackgroundMusic();
				writeStorage(BACKGROUND_MUSIC_ENABLED_KEY, "false");
				return false;
			}

			const nextEnabled = !previous;
			if (nextEnabled) {
				playBackgroundMusic();
			} else {
				stopBackgroundMusic();
			}
			writeStorage(BACKGROUND_MUSIC_ENABLED_KEY, String(nextEnabled));
			return nextEnabled;
		});
	}, [isMuted]);

	const primeAudioExperience = useCallback(() => {
		if (audioPrimedRef.current || isMuted) {
			return;
		}

		audioPrimedRef.current = true;
		setBackgroundMusicEnabled((previous) => {
			if (previous) {
				playBackgroundMusic();
				return previous;
			}
			playBackgroundMusic();
			writeStorage(BACKGROUND_MUSIC_ENABLED_KEY, "true");
			return true;
		});
	}, [isMuted]);

	const handleBackgroundMusicVolumeChange = useCallback((nextVolume: number) => {
		const newVolume = Math.min(1, Math.max(0, nextVolume));
		setBackgroundMusicVolumeState(newVolume);
		setBackgroundMusicVolume(newVolume);
		writeStorage(STORAGE_KEYS.MUSIC_VOLUME, String(newVolume));
	}, []);

	const handleNextTrack = useCallback(() => {
		playNextTrack();
	}, []);

	const handlePreviousTrack = useCallback(() => {
		playPreviousTrack();
	}, []);

	return {
		playAudioTrack: () => {
			/* No-op: handled by external audio services if available */
		},
		isMuted,
		handleToggleMute,
		handleNextTrack,
		handlePreviousTrack,
		isShuffle: false,
		handleToggleShuffle: () => {
			/* No-op: logic not implemented for simple tournaments */
		},
		currentTrack: getCurrentTrack(),
		trackInfo: null,
		audioError: null,
		retryAudio: () => {
			/* No-op: handled by external audio services if available */
		},
		volume,
		handleVolumeChange,
		playVoteSound,
		playUndoSound,
		playStreakSound,
		backgroundMusicEnabled,
		toggleBackgroundMusic,
		backgroundMusicVolume,
		handleBackgroundMusicVolumeChange,
		playLevelUpSound: playLevelUpEffect,
		playWowSound: playWowEffect,
		playSurpriseSound: playSurpriseEffect,
		primeAudioExperience,
	};
}
