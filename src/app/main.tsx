import "../polyfills";
import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "@/shared/services/supabase/client";
import App from "./App";
import { shouldEnableAnalytics } from "./analytics";
import { Providers } from "./providers/Providers";
import { ErrorBoundary } from "@/shared/components/layout/Feedback/ErrorBoundary";
import "../index.css";

// Initialize Sentry in production
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
	Sentry.init({
		dsn: import.meta.env.VITE_SENTRY_DSN,
		integrations: [
			new Sentry.BrowserTracing({
				// Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
				tracePropagationTargets: ["localhost", /^https:\/\/yourdomain\.io/],
			}),
			new Sentry.Replay({
				maskAllText: false,
				blockAllMedia: false,
			}),
		],
		// Performance Monitoring
		tracesSampleRate: 1.0, // Capture 100% of transactions
		// Session Replay
		replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
		replaysOnErrorSampleRate: 1.0, // If you're not already sampling entire session, change the sample rate to 100% when sampling sessions where errors occur.
		environment: import.meta.env.MODE,
		release: `name-nosferatu@${import.meta.env.VITE_APP_VERSION || "1.0.2"}`,
	});
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
		<ErrorBoundary context="Application Root" onError={(error: Error, errorInfo: React.ErrorInfo) => {
			// Sentry will automatically capture this through ErrorManager
			console.error("Application error:", error, errorInfo);
		}}>
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
