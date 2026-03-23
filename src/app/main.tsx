import "../polyfills";
// Conditional Sentry import to prevent app from breaking if package is missing
let Sentry: typeof import("@sentry/react") | null = null;
try {
	Sentry = require("@sentry/react");
} catch (error) {
	console.warn(
		"Sentry not available, continuing without error tracking:",
		error,
	);
}

import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { authAdapter } from "@/services/supabaseAuthAdapter";
import { ErrorBoundary } from "@/shared/components/layout/Feedback/ErrorBoundary";
import { queryClient } from "@/shared/services/supabase/client";
import App from "./App";
import { shouldEnableAnalytics } from "./analytics";
import { Providers } from "./providers/Providers";
import "../styles/index.css";

// Initialize Sentry in production
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN && Sentry) {
	try {
		Sentry.init({
			dsn: import.meta.env.VITE_SENTRY_DSN,
			integrations: [
				Sentry.browserTracingIntegration(),
				Sentry.replayIntegration({
					maskAllText: false,
					blockAllMedia: false,
				}),
			],
			tracesSampleRate: 1.0,
			replaysSessionSampleRate: 0.1,
			replaysOnErrorSampleRate: 1.0,
			environment: import.meta.env.MODE,
			release: `name-nosferatu@${import.meta.env.VITE_APP_VERSION || "1.0.2"}`,
		});
	} catch (error) {
		console.warn("Failed to initialize Sentry:", error);
	}
}

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element #root not found");
}

const analyticsEnabled = shouldEnableAnalytics({
	hostname: window.location.hostname,
	isProd: import.meta.env.PROD,
});

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		<ErrorBoundary
			context="Application Root"
			onError={(error: Error, errorInfo: React.ErrorInfo) => {
				// Sentry will automatically capture this through ErrorManager
				console.error("Application error:", error, errorInfo);
			}}
		>
			<QueryClientProvider client={queryClient}>
				<Providers auth={{ adapter: authAdapter }}>
					<BrowserRouter>
						<App />
						{analyticsEnabled ? <Analytics /> : null}
					</BrowserRouter>
				</Providers>
			</QueryClientProvider>
		</ErrorBoundary>
	</React.StrictMode>,
);
