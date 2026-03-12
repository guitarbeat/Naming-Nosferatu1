interface ErrorInfo {
	title: string;
	message: string;
	details?: string[];
	suggestions?: string[];
}

const ErrorDisplayId = "deployment-error-display";
const MaxWaitTime = 5000; // 5 seconds

/**
 * Displays a full-screen error overlay when deployment issues are detected.
 * This runs before React loads to catch initialization failures.
 */
function showDeploymentError(errorInfo: ErrorInfo): void {
	// Remove existing error display if present
	const existing = document.getElementById(ErrorDisplayId);
	if (existing) {
		existing.remove();
	}

	const errorDiv = document.createElement("div");
	errorDiv.id = ErrorDisplayId;
	errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1rem;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

	const content = document.createElement("div");
	content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 2rem;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        color: #1a1a1a;
    `;

	const detailsHtml = errorInfo.details
		? `
        <div style="margin: 1.5rem 0; padding: 1rem; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h3 style="font-size: 1rem; font-weight: 600; margin: 0 0 0.75rem;">Details:</h3>
            <ul style="margin: 0; padding-left: 1.5rem;">
                ${errorInfo.details.map((d) => `<li style="margin: 0.5rem 0; line-height: 1.5;">${d}</li>`).join("")}
            </ul>
        </div>
    `
		: "";

	const suggestionsHtml = errorInfo.suggestions
		? `
        <div style="margin: 1.5rem 0; padding: 1rem; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h3 style="font-size: 1rem; font-weight: 600; margin: 0 0 0.75rem;">How to Fix:</h3>
            <ol style="margin: 0; padding-left: 1.5rem;">
                ${errorInfo.suggestions.map((s) => `<li style="margin: 0.5rem 0; line-height: 1.5;">${s}</li>`).join("")}
            </ol>
        </div>
    `
		: "";

	content.innerHTML = `
        <div style="font-size: 3rem; text-align: center; margin-bottom: 1rem;">⚠️</div>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 1rem; color: #dc2626; text-align: center;">
            ${errorInfo.title}
        </h2>
        <p style="font-size: 1rem; line-height: 1.6; margin: 0 0 1.5rem; color: #666;">
            ${errorInfo.message}
        </p>
        ${detailsHtml}
        ${suggestionsHtml}
        <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap;">
            <button onclick="window.location.reload()" style="
                flex: 1;
                min-width: 120px;
                padding: 0.75rem 1.5rem;
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
            ">Reload Page</button>
        </div>
    `;

	errorDiv.appendChild(content);
	document.body.appendChild(errorDiv);
}

export function initDeploymentCheck(): void {
	// Check if root element exists
	const root = document.getElementById("root");
	if (!root) {
		showDeploymentError({
			title: "Root Element Missing",
			message: "The application root element (#root) was not found in the HTML.",
			suggestions: [
				'Verify index.html contains <div id="root"></div>',
				"Check that the HTML file is being served correctly",
			],
		});
		return;
	}

	// Monitor script loading
	const mainScript =
		document.querySelector('script[type="module"][src]') ||
		document.querySelector('script[src*="index"]');

	if (mainScript) {
		let scriptLoaded = false;
		let scriptError = false;

		mainScript.addEventListener("load", () => {
			scriptLoaded = true;
		});

		mainScript.addEventListener("error", () => {
			scriptError = true;
			showDeploymentError({
				title: "JavaScript Failed to Load",
				message: "The application's JavaScript files could not be loaded. This is often caused by:",
				details: [
					"Content Security Policy (CSP) blocking scripts",
					"Incorrect build output paths",
					"Missing or incorrect base path configuration",
					"Network issues preventing script downloads",
				],
				suggestions: [
					'Check browser console for CSP violations (look for "Content-Security-Policy" errors)',
					"Verify that script files exist in the /assets/js/ directory",
					"Check Network tab to see if scripts return 404 or are blocked",
					"Review vercel.json CSP configuration",
					"Ensure Vite build completed successfully",
				],
			});
		});

		// Check if app initialized after timeout
		setTimeout(() => {
			if (!scriptLoaded && !scriptError) {
				// Script might have loaded but app didn't initialize
				if (root.children.length === 0) {
					showDeploymentError({
						title: "Application Failed to Initialize",
						message:
							"The JavaScript loaded but the application failed to initialize. Possible causes:",
						details: [
							"JavaScript errors preventing React from mounting",
							"Missing environment variables (VITE_SUPABASE_URL, etc.)",
							"Build configuration issues",
							"Runtime errors in the application code",
						],
						suggestions: [
							"Open browser console (F12) and check for JavaScript errors",
							"Verify all required environment variables are set in Vercel",
							"Check that the build completed without errors",
							"Review the error boundary fallback for more details",
							"Try rebuilding the application",
						],
					});
				}
			}
		}, MaxWaitTime);
	}

	// Monitor CSP violations
	document.addEventListener("securitypolicyviolation", (event) => {
		if (event.violatedDirective === "script-src" || event.effectiveDirective === "script-src") {
			showDeploymentError({
				title: "Content Security Policy Violation",
				message: "The application's scripts are being blocked by Content Security Policy:",
				details: [
					`Blocked resource: ${event.blockedURI || "Unknown"}`,
					`Violated directive: ${event.violatedDirective}`,
					`Current CSP: ${event.originalPolicy}`,
				],
				suggestions: [
					"Update vercel.json CSP to allow scripts from 'self'",
					"Add 'blob:' to script-src for Vite's dynamic imports",
					"Ensure 'unsafe-inline' is included if needed",
					"Check that script sources match CSP rules",
					"Review Vercel deployment logs for CSP configuration",
				],
			});
		}
	});
}

// Auto-initialize if running in browser context
if (typeof window !== "undefined") {
	initDeploymentCheck();
}
