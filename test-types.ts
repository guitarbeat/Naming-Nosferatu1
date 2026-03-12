function debounceAny<T extends (...args: any[]) => void>(func: T, wait: number): T {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return function (this: any, ...args: Parameters<T>) {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	} as T;
}

function debounceUnknown<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return function (this: unknown, ...args: Parameters<T>) {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	} as T;
}

function debounceArgs<Args extends unknown[]>(func: (...args: Args) => void, wait: number): (...args: Args) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return function (this: unknown, ...args: Args) {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

const f1 = debounceAny((a: string) => console.log(a), 100);
const f2 = debounceUnknown((a: string) => console.log(a), 100);
const f3 = debounceArgs((a: string) => console.log(a), 100);
