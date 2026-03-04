import { api } from "@/services/apiClient";
import { syncQueue } from "@/services/SyncQueue";
import { devLog } from "@/shared/lib/basic";
import type { NameItem } from "@/shared/types";

interface TournamentCreateResult {
	success: boolean;
	data?: {
		id: string;
		user_name: string;
		tournament_name: string;
		participant_names: NameItem[];
		status: string;
		created_at: string;
	};
	error?: string;
}

interface RatingSaveResult {
	success: boolean;
	savedCount?: number;
	offline?: boolean;
	error?: string;
}

export const tournamentsAPI = {
	async createTournament(
		userName: string,
		tournamentName: string,
		participantNames: NameItem[],
	): Promise<TournamentCreateResult> {
		try {
			await api.post("/users/create", { userName });
			return {
				success: true,
				data: {
					id: globalThis.crypto?.randomUUID?.() ?? `t_${Date.now()}`,
					user_name: userName,
					tournament_name: tournamentName,
					participant_names: participantNames,
					status: "in_progress",
					created_at: new Date().toISOString(),
				},
			};
		} catch (error: any) {
			return { success: false, error: error.message || "Failed to create tournament" };
		}
	},

	async saveTournamentRatings(
		userId: string,
		ratings: Array<{
			nameId: string | number;
			rating: number;
			wins?: number;
			losses?: number;
		}>,
		skipQueue = false,
	): Promise<RatingSaveResult> {
		if (!skipQueue && typeof navigator !== "undefined" && !navigator.onLine) {
			syncQueue.enqueue("SAVE_RATINGS", { userId, ratings });
			devLog("[TournamentAPI] Offline: queued ratings save");
			return { success: true, savedCount: ratings.length, offline: true };
		}

		try {
			if (!userId || !ratings?.length) {
				return { success: false, error: "Missing data" };
			}
			return await api.post<RatingSaveResult>(
				"/ratings",
				{
					userId,
					ratings,
				},
				{
					headers: { "x-user-id": userId },
				},
			);
		} catch (error: any) {
			return { success: false, error: error.message || "Failed to save ratings" };
		}
	},
};

export function calculateBracketRound(totalNames: number, currentMatch: number): number {
	if (totalNames <= 2) {
		return 1;
	}
	const matchesPerRound = Math.ceil(totalNames / 2);
	return Math.ceil(currentMatch / matchesPerRound);
}
