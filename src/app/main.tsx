import "../polyfills";
import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { authAdapter } from "@/services/authAdapter";
import { queryClient } from "@/services/supabase/client";
import App from "./App";
import { shouldEnableAnalytics } from "./analytics";
import { Providers } from "./providers/Providers";
import "../index.css";

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
		<QueryClientProvider client={queryClient}>
			<Providers auth={{ adapter: authAdapter }}>
				<BrowserRouter>
					<App />
					{analyticsEnabled ? <Analytics /> : null}
				</BrowserRouter>
			</Providers>
		</QueryClientProvider>
	</React.StrictMode>,
);
