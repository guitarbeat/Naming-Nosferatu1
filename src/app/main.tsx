import "../polyfills";
import { QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { authAdapter } from "@/services/authAdapter";
import { queryClient } from "@/services/supabase";
import App from "./App";
import { Providers } from "./providers/Providers";
import "../index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<Providers auth={{ adapter: authAdapter }}>
				<BrowserRouter>
					<App />
					<Analytics />
				</BrowserRouter>
			</Providers>
		</QueryClientProvider>
	</React.StrictMode>,
);
