import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	cleanupPerformanceMonitoring,
	initializePerformanceMonitoring,
} from "./performance";

type MockObserverRecord = {
	type?: string;
	callback: PerformanceObserverCallback;
	disconnect: ReturnType<typeof vi.fn>;
};

const mockObservers: MockObserverRecord[] = [];

class MockPerformanceObserver {
	callback: PerformanceObserverCallback;
	disconnect = vi.fn();

	constructor(callback: PerformanceObserverCallback) {
		this.callback = callback;
		mockObservers.push({
			callback,
			disconnect: this.disconnect,
		});
	}

	observe(options: PerformanceObserverInit) {
		const record = mockObservers[mockObservers.length - 1];
		if (!record) {
			throw new Error("Mock observer registration missing");
		}
		record.type = options.type;
	}
}

function emitEntries(type: string, entries: PerformanceEntry[]) {
	const observer = mockObservers.find((record) => record.type === type);
	if (!observer) {
		throw new Error(`No observer registered for type "${type}"`);
	}

	observer.callback(
		{
			getEntries: () => entries,
		} as PerformanceObserverEntryList,
		{} as PerformanceObserver,
	);
}

describe("performance monitoring", () => {
	beforeEach(() => {
		mockObservers.length = 0;
		vi.stubGlobal("PerformanceObserver", MockPerformanceObserver);
		vi.spyOn(window.performance, "getEntriesByType").mockReturnValue(
			[] as PerformanceEntryList,
		);
	});

	afterEach(() => {
		cleanupPerformanceMonitoring();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("suppresses console debug output by default", () => {
		const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {
			/* muted in test */
		});

		initializePerformanceMonitoring();
		emitEntries("paint", [
			{ name: "first-contentful-paint", startTime: 123.4 } as PerformanceEntry,
		]);

		expect(debugSpy).not.toHaveBeenCalled();
	});

	it("reports metrics through debug logging and callbacks when configured", () => {
		const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {
			/* expected debug output */
		});
		const onReport = vi.fn();

		initializePerformanceMonitoring({ debug: true, onReport });
		emitEntries("paint", [
			{ name: "first-contentful-paint", startTime: 123.4 } as PerformanceEntry,
		]);

		expect(debugSpy).toHaveBeenCalledWith("[Perf] FCP: 123ms");
		expect(onReport).toHaveBeenCalledWith("FCP", 123);
	});
});
