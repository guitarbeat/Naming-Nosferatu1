import { describe, expect, it } from "vitest";
import { getTabMobileLabel } from "./TabNavigation";

describe("getTabMobileLabel", () => {
	it("keeps the selected count on the ready start action", () => {
		expect(getTabMobileLabel("pick", "Start (3)")).toBe("Start (3)");
	});

	it("keeps the idle picker label compact on mobile", () => {
		expect(getTabMobileLabel("pick", "Pick Names")).toBe("Pick");
	});

	it("uses the first word for non-picker labels", () => {
		expect(getTabMobileLabel("analyze", "Analyze")).toBe("Analyze");
		expect(getTabMobileLabel("profile", "Avery Admin")).toBe("Avery");
	});
});
