export function isRpcSignatureError(message: string): boolean {
	const normalized = message.toLowerCase();
	return (
		normalized.includes("function") &&
		(normalized.includes("does not exist") ||
			normalized.includes("no function matches") ||
			normalized.includes("could not find"))
	);
}
