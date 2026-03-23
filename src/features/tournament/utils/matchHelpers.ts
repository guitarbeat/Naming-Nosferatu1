/**
 * @module matchHelpers
 * @description Helpers for extracting match side data
 */

import type { Match, NameItem } from "@/shared/types";

export function getMatchSideId(match: Match, side: "left" | "right"): string {
	const participant = match[side];
	return typeof participant === "object" ? String(participant.id) : String(participant);
}

export function getMatchSideName(match: Match, side: "left" | "right"): string {
	if (match.mode === "2v2") {
		const team = side === "left" ? match.left : match.right;
		return team.memberNames.join(" + ");
	}
	const participant = match[side];
	return typeof participant === "object" ? participant.name : String(participant);
}

export interface MatchSideData {
	leftId: string;
	rightId: string;
	leftName: string;
	rightName: string;
	leftMembers: string[];
	rightMembers: string[];
	leftIsTeam: boolean;
	rightIsTeam: boolean;
	leftDescription?: string;
	rightDescription?: string;
	leftPronunciation?: string;
	rightPronunciation?: string;
}

export function extractMatchData(match: Match): MatchSideData {
	if (match.mode === "2v2") {
		const leftMembers = match.left.memberNames;
		const rightMembers = match.right.memberNames;
		return {
			leftId: match.left.id,
			rightId: match.right.id,
			leftName: leftMembers.join(" + "),
			rightName: rightMembers.join(" + "),
			leftMembers,
			rightMembers,
			leftIsTeam: true,
			rightIsTeam: true,
		};
	}

	const extractSide = (participant: Match["left"] | Match["right"]) => {
		if (typeof participant === "object") {
			return {
				id: String(participant.id),
				name: participant.name,
				members: [participant.name],
				description: participant.description,
				pronunciation: (participant as NameItem).pronunciation,
			};
		}
		return {
			id: String(participant),
			name: String(participant),
			members: [String(participant)],
			description: undefined,
			pronunciation: undefined,
		};
	};

	const left = extractSide(match.left);
	const right = extractSide(match.right);

	return {
		leftId: left.id,
		rightId: right.id,
		leftName: left.name,
		rightName: right.name,
		leftMembers: left.members,
		rightMembers: right.members,
		leftIsTeam: false,
		rightIsTeam: false,
		leftDescription: left.description,
		rightDescription: right.description,
		leftPronunciation: left.pronunciation,
		rightPronunciation: right.pronunciation,
	};
}
