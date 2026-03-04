import { describe, expect, it } from "vitest";
import { ELO_RATING } from "@/shared/lib/constants";
import {
	applyTeamMatchElo,
	buildTeamMatches,
	EloRating,
	generateRandomTeams,
	getBracketStageLabel,
	resolveTournamentMode,
} from "./tournament";

describe("EloRating", () => {
	describe("constructor", () => {
		it("should initialize with default values", () => {
			const elo = new EloRating();
			expect(elo.defaultRating).toBe(ELO_RATING.DEFAULT_RATING);
			expect(elo.kFactor).toBe(ELO_RATING.DEFAULT_K_FACTOR);
		});

		it("should initialize with custom values", () => {
			const elo = new EloRating(1200, 20);
			expect(elo.defaultRating).toBe(1200);
			expect(elo.kFactor).toBe(20);
		});
	});

	describe("getExpectedScore", () => {
		it("should return 0.5 when ratings are equal", () => {
			const elo = new EloRating();
			const score = elo.getExpectedScore(1500, 1500);
			expect(score).toBe(0.5);
		});

		it("should return > 0.5 for a higher rated player against a lower rated player", () => {
			const elo = new EloRating();
			const score = elo.getExpectedScore(1900, 1500);
			expect(score).toBeGreaterThan(0.5);
		});

		it("should return < 0.5 for a lower rated player against a higher rated player", () => {
			const elo = new EloRating();
			const score = elo.getExpectedScore(1100, 1500);
			expect(score).toBeLessThan(0.5);
		});

		it("should return specific known values based on difference of 400", () => {
			const elo = new EloRating();
			// A difference of 400 points means the expected score of the higher rated player is 10/11 (~0.909)
			// and the expected score of the lower rated player is 1/11 (~0.091)
			const expectedHigher = 1 / (1 + 10 ** (-400 / ELO_RATING.RATING_DIVISOR)); // = 10/11
			const expectedLower = 1 / (1 + 10 ** (400 / ELO_RATING.RATING_DIVISOR)); // = 1/11

			expect(elo.getExpectedScore(1900, 1500)).toBeCloseTo(expectedHigher, 5);
			expect(elo.getExpectedScore(1500, 1900)).toBeCloseTo(expectedLower, 5);
		});
	});

	describe("updateRating", () => {
		it("should double the kFactor for a new player (games < NEW_PLAYER_GAME_THRESHOLD)", () => {
			const elo = new EloRating();
			const rating = 1500;
			const exp = 0.5;
			const act = 1; // Win
			const games = ELO_RATING.NEW_PLAYER_GAME_THRESHOLD - 1; // Still a new player

			// Expected change: kFactor * 2 * (1 - 0.5)
			// Default kFactor is 40 -> 80 * 0.5 = +40 points
			const newRating = elo.updateRating(rating, exp, act, games);
			expect(newRating).toBe(Math.round(1500 + ELO_RATING.DEFAULT_K_FACTOR * 2 * 0.5));
		});

		it("should use standard kFactor for an experienced player (games >= NEW_PLAYER_GAME_THRESHOLD)", () => {
			const elo = new EloRating();
			const rating = 1500;
			const exp = 0.5;
			const act = 1; // Win
			const games = ELO_RATING.NEW_PLAYER_GAME_THRESHOLD; // Experienced player

			// Expected change: kFactor * (1 - 0.5)
			// Default kFactor is 40 -> 40 * 0.5 = +20 points
			const newRating = elo.updateRating(rating, exp, act, games);
			expect(newRating).toBe(Math.round(1500 + ELO_RATING.DEFAULT_K_FACTOR * 0.5));
		});

		it("should treat a player as new when games argument is not provided", () => {
			const elo = new EloRating();
			const rating = 1500;
			const exp = 0.5;
			const act = 1; // Win

			// Expected change: kFactor * 2 * (1 - 0.5)
			const newRating = elo.updateRating(rating, exp, act);
			expect(newRating).toBe(Math.round(1500 + ELO_RATING.DEFAULT_K_FACTOR * 2 * 0.5));
		});

		it("should decrease rating when actual outcome is lower than expected", () => {
			const elo = new EloRating();
			const rating = 1500;
			const exp = 0.5;
			const act = 0; // Loss
			const games = ELO_RATING.NEW_PLAYER_GAME_THRESHOLD;

			// Expected change: 40 * (0 - 0.5) = -20 points
			const newRating = elo.updateRating(rating, exp, act, games);
			expect(newRating).toBe(Math.round(1500 + ELO_RATING.DEFAULT_K_FACTOR * -0.5));
		});

		it("should bound the maximum rating to ELO_RATING.MAX_RATING", () => {
			const elo = new EloRating();
			const rating = ELO_RATING.MAX_RATING - 5;
			const exp = 0.1; // Expected to lose
			const act = 1; // But wins!

			// Should gain heavily, passing MAX_RATING
			const newRating = elo.updateRating(rating, exp, act, 0);
			expect(newRating).toBe(ELO_RATING.MAX_RATING);
		});

		it("should bound the minimum rating to ELO_RATING.MIN_RATING", () => {
			const elo = new EloRating();
			const rating = ELO_RATING.MIN_RATING + 5;
			const exp = 0.9; // Expected to win
			const act = 0; // But loses!

			// Should lose heavily, passing MIN_RATING
			const newRating = elo.updateRating(rating, exp, act, 0);
			expect(newRating).toBe(ELO_RATING.MIN_RATING);
		});
	});

	describe("calculateNewRatings", () => {
		it('should correctly calculate ratings and stats when outcome is "left"', () => {
			const elo = new EloRating();
			const result = elo.calculateNewRatings(1500, 1500, "left", {
				winsA: 5,
				lossesA: 2,
				winsB: 3,
				lossesB: 4,
			});

			// Expected outcome:
			// A wins (1), expected 0.5 -> new rating A increases
			// B loses (0), expected 0.5 -> new rating B decreases
			// default kFactor * 2 for both (games argument implicitly 0 in updateRating call)
			// A wins + 1, losses unch; B losses + 1, wins unch
			const k = ELO_RATING.DEFAULT_K_FACTOR * 2;
			const expChangeA = Math.round(k * (1 - 0.5));
			const expChangeB = Math.round(k * (0 - 0.5));

			expect(result.newRatingA).toBe(1500 + expChangeA);
			expect(result.newRatingB).toBe(1500 + expChangeB);
			expect(result.winsA).toBe(6);
			expect(result.lossesA).toBe(2);
			expect(result.winsB).toBe(3);
			expect(result.lossesB).toBe(5);
		});

		it('should correctly calculate ratings and stats when outcome is "right"', () => {
			const elo = new EloRating();
			const result = elo.calculateNewRatings(1500, 1500, "right", {
				winsA: 5,
				lossesA: 2,
				winsB: 3,
				lossesB: 4,
			});

			// A loses (0), B wins (1)
			const k = ELO_RATING.DEFAULT_K_FACTOR * 2;
			const expChangeA = Math.round(k * (0 - 0.5));
			const expChangeB = Math.round(k * (1 - 0.5));

			expect(result.newRatingA).toBe(1500 + expChangeA);
			expect(result.newRatingB).toBe(1500 + expChangeB);
			expect(result.winsA).toBe(5);
			expect(result.lossesA).toBe(3);
			expect(result.winsB).toBe(4);
			expect(result.lossesB).toBe(4);
		});

		it('should correctly handle a tie when outcome is neither "left" nor "right"', () => {
			const elo = new EloRating();
			const result = elo.calculateNewRatings(1600, 1500, "tie", {
				winsA: 0,
				lossesA: 0,
				winsB: 0,
				lossesB: 0,
			});

			// In tie: actA = 0.5, actB = 0.5
			// expA > 0.5, expB < 0.5 (A is expected to win slightly more)
			const expA = elo.getExpectedScore(1600, 1500);
			const expB = elo.getExpectedScore(1500, 1600);

			const k = ELO_RATING.DEFAULT_K_FACTOR * 2;
			const expChangeA = Math.round(k * (0.5 - expA)); // should be negative
			const expChangeB = Math.round(k * (0.5 - expB)); // should be positive

			expect(result.newRatingA).toBe(1600 + expChangeA);
			expect(result.newRatingB).toBe(1500 + expChangeB);

			// Neither player gets a win or loss
			expect(result.winsA).toBe(0);
			expect(result.lossesA).toBe(0);
			expect(result.winsB).toBe(0);
			expect(result.lossesB).toBe(0);
		});

		it("should handle undefined stats correctly", () => {
			const elo = new EloRating();
			const result = elo.calculateNewRatings(1500, 1500, "left");

			expect(result.winsA).toBe(1);
			expect(result.lossesA).toBe(0);
			expect(result.winsB).toBe(0);
			expect(result.lossesB).toBe(1);
		});
	});
});

describe("resolveTournamentMode", () => {
	it("returns 1v1 for counts that do not satisfy auto-2v2 rules", () => {
		expect(resolveTournamentMode(2)).toBe("1v1");
		expect(resolveTournamentMode(3)).toBe("1v1");
		expect(resolveTournamentMode(6)).toBe("1v1");
	});

	it("returns 2v2 for counts >= 4 divisible by 4", () => {
		expect(resolveTournamentMode(4)).toBe("2v2");
		expect(resolveTournamentMode(8)).toBe("2v2");
	});
});

describe("team utilities", () => {
	it("generateRandomTeams creates teams of two without duplicates", () => {
		const participants = [
			{ id: "1", name: "A" },
			{ id: "2", name: "B" },
			{ id: "3", name: "C" },
			{ id: "4", name: "D" },
			{ id: "5", name: "E" },
			{ id: "6", name: "F" },
			{ id: "7", name: "G" },
			{ id: "8", name: "H" },
		];

		const teams = generateRandomTeams(participants);
		expect(teams).toHaveLength(participants.length / 2);

		const allIds = teams.flatMap((team) => team.memberIds);
		expect(new Set(allIds).size).toBe(participants.length);
		expect(allIds).toHaveLength(participants.length);
	});

	it("buildTeamMatches creates round-robin pairings", () => {
		const teams = [
			{ id: "team-1", memberIds: ["1", "2"], memberNames: ["A", "B"] },
			{ id: "team-2", memberIds: ["3", "4"], memberNames: ["C", "D"] },
			{ id: "team-3", memberIds: ["5", "6"], memberNames: ["E", "F"] },
			{ id: "team-4", memberIds: ["7", "8"], memberNames: ["G", "H"] },
		];

		const matches = buildTeamMatches(teams);
		expect(matches).toHaveLength(6);
		const firstMatch = matches[0];
		expect(firstMatch).toBeDefined();
		expect(firstMatch).toEqual({ leftTeamId: "team-1", rightTeamId: "team-2" });
	});

	it("applyTeamMatchElo updates individual ratings for both members", () => {
		const elo = new EloRating();
		const leftTeam = { id: "team-1", memberIds: ["1", "2"], memberNames: ["A", "B"] };
		const rightTeam = { id: "team-2", memberIds: ["3", "4"], memberNames: ["C", "D"] };
		const initialRatings = { 1: 1500, 2: 1500, 3: 1500, 4: 1500 };

		const updated = applyTeamMatchElo({
			elo,
			ratings: initialRatings,
			leftTeam,
			rightTeam,
			winnerSide: "left",
		});

		expect(updated["1"] ?? 0).toBeGreaterThan(initialRatings["1"] ?? 0);
		expect(updated["2"] ?? 0).toBeGreaterThan(initialRatings["2"] ?? 0);
		expect(updated["3"] ?? 0).toBeLessThan(initialRatings["3"] ?? 0);
		expect(updated["4"] ?? 0).toBeLessThan(initialRatings["4"] ?? 0);
		expect((updated["1"] ?? 0) - (initialRatings["1"] ?? 0)).toBe(
			(updated["2"] ?? 0) - (initialRatings["2"] ?? 0),
		);
		expect((initialRatings["3"] ?? 0) - (updated["3"] ?? 0)).toBe(
			(initialRatings["4"] ?? 0) - (updated["4"] ?? 0),
		);
	});

	it("applyTeamMatchElo respects rating clamps", () => {
		const elo = new EloRating();
		const leftTeam = { id: "team-1", memberIds: ["1", "2"], memberNames: ["A", "B"] };
		const rightTeam = { id: "team-2", memberIds: ["3", "4"], memberNames: ["C", "D"] };
		const initialRatings = {
			1: ELO_RATING.MAX_RATING - 1,
			2: ELO_RATING.MAX_RATING - 1,
			3: ELO_RATING.MIN_RATING + 1,
			4: ELO_RATING.MIN_RATING + 1,
		};

		const updated = applyTeamMatchElo({
			elo,
			ratings: initialRatings,
			leftTeam,
			rightTeam,
			winnerSide: "left",
		});

		expect(updated["1"]).toBeLessThanOrEqual(ELO_RATING.MAX_RATING);
		expect(updated["2"]).toBeLessThanOrEqual(ELO_RATING.MAX_RATING);
		expect(updated["3"]).toBeGreaterThanOrEqual(ELO_RATING.MIN_RATING);
		expect(updated["4"]).toBeGreaterThanOrEqual(ELO_RATING.MIN_RATING);
	});
});

describe("getBracketStageLabel", () => {
	it("maps late rounds to named stages", () => {
		expect(getBracketStageLabel(4, 4)).toBe("Final");
		expect(getBracketStageLabel(3, 4)).toBe("Semifinal");
		expect(getBracketStageLabel(2, 4)).toBe("Quarterfinal");
	});

	it("uses generic round label for early rounds", () => {
		expect(getBracketStageLabel(1, 6)).toBe("Round 1");
		expect(getBracketStageLabel(2, 6)).toBe("Round 2");
	});
});
