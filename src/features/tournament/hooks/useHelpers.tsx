/**
 * @module useHelpers
 * @description Consolidated tournament helper hooks
 * Combines: useAudioManager, useTournamentSelectionSaver, useProfileNotifications
 */

import { useCallback, useRef, useState } from "react";
import { useToast } from "@/app/providers/Providers";
import { Toast } from "@/shared/components/layout";
import { devError, devLog } from "@/shared/lib/basic";
import { NOTIFICATION } from "@/shared/lib/constants";
import {
	getCurrentTrack,
	playBackgroundMusic,
	playLevelUpSound,
	playNextTrack,
	playPreviousTrack,
	playSound,
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
}

export function useAudioManager(): UseAudioManagerResult {
	const [isMuted, setIsMuted] = useState(false);
	const [volume, setVolume] = useState(0.3);
	const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState(false);
	const [backgroundMusicVolume, setBackgroundMusicVolumeState] = useState(0.1);

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
	}, []);

	const toggleBackgroundMusic = useCallback(() => {
		if (backgroundMusicEnabled) {
			stopBackgroundMusic();
		} else {
			playBackgroundMusic();
		}
		setBackgroundMusicEnabled(!backgroundMusicEnabled);
	}, [backgroundMusicEnabled]);

	const handleBackgroundMusicVolumeChange = useCallback((volume: number) => {
		const newVolume = Math.min(1, Math.max(0, volume));
		setBackgroundMusicVolumeState(newVolume);
		setBackgroundMusicVolume(newVolume);
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
		handleToggleMute: () => setIsMuted((p) => !p),
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
		backgroundMusicEnabled,
		toggleBackgroundMusic,
		backgroundMusicVolume,
		handleBackgroundMusicVolumeChange,
		playLevelUpSound: playLevelUpEffect,
		playWowSound: playWowEffect,
		playSurpriseSound: playSurpriseEffect,
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
