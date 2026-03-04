/**
 * @module useHelpers
 * @description Consolidated tournament helper hooks
 * Combines: useAudioManager, useTournamentSelectionSaver, useProfileNotifications
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/app/providers/Providers";
import { Toast } from "@/shared/components/layout";
import { devError, devLog } from "@/shared/lib/basic";
import { NOTIFICATION, STORAGE_KEYS } from "@/shared/lib/constants";
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
import type { NameItem } from "@/shared/types";

/* =========================================================================
   AUDIO MANAGER HOOK
   ========================================================================= */

export interface UseAudioManagerResult {
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

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function readStoredNumber(key: string, fallback: number): number {
	if (!isBrowser()) {
		return fallback;
	}

	try {
		const rawValue = localStorage.getItem(key);
		const parsed = rawValue ? Number.parseFloat(rawValue) : Number.NaN;
		if (Number.isNaN(parsed)) {
			return fallback;
		}
		return Math.min(1, Math.max(0, parsed));
	} catch {
		return fallback;
	}
}

function readStoredBoolean(key: string): boolean | null {
	if (!isBrowser()) {
		return null;
	}

	try {
		const rawValue = localStorage.getItem(key);
		if (rawValue === null) {
			return null;
		}
		return rawValue !== "false";
	} catch {
		return null;
	}
}

function writeStorage(key: string, value: string) {
	if (!isBrowser()) {
		return;
	}
	try {
		localStorage.setItem(key, value);
	} catch {
		/* ignore storage quota/private-mode errors */
	}
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

/* =========================================================================
   TOURNAMENT SELECTION SAVER HOOK
   ========================================================================= */

interface UseTournamentSelectionSaverProps {
	userName: string | null;
	enableAutoSave?: boolean;
}

/**
 * Hook for auto-saving tournament selections
 * Debounces save operations to avoid excessive API calls
 */
export function useTournamentSelectionSaver({
	userName,
	enableAutoSave = true,
}: UseTournamentSelectionSaverProps) {
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastSavedRef = useRef<string>("");

	const scheduleSave = useCallback(
		(selectedNames: NameItem[]) => {
			if (!userName || !enableAutoSave) {
				return;
			}

			// Clear any pending save
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			// Create a hash of the current selection to detect changes
			const selectionHash = selectedNames
				.map((n) => n.id)
				.sort()
				.join(",");
			if (selectionHash === lastSavedRef.current) {
				return;
			}

			// Debounce the save operation
			saveTimeoutRef.current = setTimeout(async () => {
				try {
					// Save to localStorage as a simple persistence mechanism
					localStorage.setItem(
						`tournament_selection_${userName}`,
						JSON.stringify(selectedNames.map((n) => n.id)),
					);
					lastSavedRef.current = selectionHash;
				} catch (error) {
					console.error("Failed to save tournament selection:", error);
				}
			}, 1000);
		},
		[userName, enableAutoSave],
	);

	const loadSavedSelection = useCallback(() => {
		if (!userName) {
			return [];
		}
		try {
			const saved = localStorage.getItem(`tournament_selection_${userName}`);
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	}, [userName]);

	return {
		scheduleSave,
		loadSavedSelection,
	};
}

/* =========================================================================
   PROFILE NOTIFICATIONS HOOK
   ========================================================================= */

/**
 * Hook for profile notification functions with toast UI
 * @returns {Object} Notification functions and Toast component
 */
export function useProfileNotifications() {
	const {
		toasts,
		showSuccess: showSuccessToast,
		showError: showErrorToast,
		showToast: showToastMessage,
		hideToast,
	} = useToast();

	const showSuccess = useCallback(
		(message: string) => {
			devLog("✅", message);
			showSuccessToast(message, { duration: 5000 });
		},
		[showSuccessToast],
	);

	const showError = useCallback(
		(message: string) => {
			devError("❌", message);
			showErrorToast(message, { duration: NOTIFICATION.ERROR_DURATION_MS });
		},
		[showErrorToast],
	);

	const showToast = useCallback(
		(message: string, type: "success" | "error" | "info" | "warning" = "info") => {
			devLog(`📢 [${type}]`, message);
			showToastMessage(message, type, {
				duration: type === "error" ? 7000 : 5000,
			});
		},
		[showToastMessage],
	);

	const ToastContainer = useCallback(() => {
		return (
			<Toast
				variant="container"
				toasts={toasts}
				removeToast={hideToast}
				position="top-right"
				maxToasts={NOTIFICATION.MAX_TOASTS}
				onDismiss={() => {
					// Intentional no-op: dismiss handled by component
				}}
				message=""
			/>
		);
	}, [toasts, hideToast]);

	return {
		showSuccess,
		showError,
		showToast,
		ToastContainer,
	};
}
