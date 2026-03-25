const LOCAL_ANALYTICS_HOSTS = new Set([
	"localhost",
	"127.0.0.1",
	"0.0.0.0",
	"::1",
]);

interface AnalyticsEnv {
	hostname: string;
	isProd: boolean;
}

export function shouldEnableAnalytics({
	hostname,
	isProd,
}: AnalyticsEnv): boolean {
	return isProd && !LOCAL_ANALYTICS_HOSTS.has(hostname);
}
