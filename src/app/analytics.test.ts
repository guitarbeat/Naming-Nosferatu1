import { describe, expect, it } from "vitest";
import { shouldEnableAnalytics } from "./analytics";

describe("shouldEnableAnalytics", () => {
	it("disables analytics outside production", () => {
		expect(
			shouldEnableAnalytics({ hostname: "cats.example.com", isProd: false }),
		).toBe(false);
	});

	it("disables analytics for local preview hosts", () => {
		expect(shouldEnableAnalytics({ hostname: "localhost", isProd: true })).toBe(
			false,
		);
		expect(shouldEnableAnalytics({ hostname: "127.0.0.1", isProd: true })).toBe(
			false,
		);
	});

	it("enables analytics for production hosts", () => {
		expect(
			shouldEnableAnalytics({ hostname: "cats.example.com", isProd: true }),
		).toBe(true);
	});
});
