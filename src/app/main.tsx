import "../polyfills";
import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "@/shared/services/supabase/client";
import { supabaseAuthAdapter } from "@/services/supabaseAuthAdapter";
import App from "./App";
import { shouldEnableAnalytics } from "./analytics";
import { Providers } from "./providers/Providers";
import { ErrorBoundary } from "@/shared/components/layout/Feedback/ErrorBoundary";
import "../index.css";

// Sentry initialization disabled - use ErrorBoundary and ErrorManager for error handling
// To enable Sentry:
// 1. Install @sentry/react: pnpm add @sentry/react
// 2. Uncomment the code below
// 3. Set VITE_SENTRY_DSN environment variable

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
                                <Providers auth={{ adapter: supabaseAuthAdapter }}>
                                        <BrowserRouter>
                                                <App />
                                                {analyticsEnabled ? <Analytics /> : null}
                                        </BrowserRouter>
                                </Providers>
                        </QueryClientProvider>
                </ErrorBoundary>
        </React.StrictMode>,
);
