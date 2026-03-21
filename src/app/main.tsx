import "../polyfills";
import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { authAdapter } from "@/services/authAdapter";
import { ErrorBoundary } from "@/shared/components/layout/Feedback/ErrorBoundary";
import { ErrorManager } from "@/shared/services/errorManager";
import { queryClient } from "@/shared/services/supabase/client";
import App from "./App";
import { shouldEnableAnalytics } from "./analytics";
import { Providers } from "./providers/Providers";
import "../index.scss";

// Initialize Sentry in production
const sentryEnabled = import.meta.env.PROD && Boolean(import.meta.env.VITE_SENTRY_DSN);
ErrorManager.setErrorService(null);

if (sentryEnabled) {
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
		ErrorManager.setErrorService(Sentry);
	} catch (error) {
		console.warn("Failed to initialize Sentry:", error);
		ErrorManager.setErrorService(null);
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
