import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bootstrapMocks = vi.hoisted(() => {
        const renderMock = vi.fn();
        const createRootMock = vi.fn(() => ({
                render: renderMock,
        }));

        return { createRootMock, renderMock };
});

vi.mock("../polyfills", () => ({}));
vi.mock("../styles/index.css", () => ({}));

vi.mock("@sentry/react", () => ({
        init: vi.fn(),
        browserTracingIntegration: vi.fn(),
        replayIntegration: vi.fn(),
}));

vi.mock("react-dom/client", () => ({
        createRoot: bootstrapMocks.createRootMock,
        default: {
                createRoot: bootstrapMocks.createRootMock,
        },
}));

vi.mock("@tanstack/react-query", () => ({
        QueryClientProvider: ({ children, client }: { children: ReactNode; client: unknown }) => (
                <div data-testid="query-client-provider" data-has-client={String(Boolean(client))}>
                        {children}
                </div>
        ),
}));

vi.mock("@vercel/analytics/react", () => ({
        Analytics: () => <div data-testid="analytics" />,
}));

vi.mock("react-router-dom", () => ({
        BrowserRouter: ({ children }: { children: ReactNode }) => (
                <div data-testid="browser-router">{children}</div>
        ),
}));

vi.mock("@/services/supabaseAuthAdapter", () => ({
        authAdapter: { kind: "auth-adapter" },
}));

vi.mock("@/shared/services/supabase/client", () => ({
        queryClient: { kind: "query-client" },
}));

vi.mock("@/shared/components/layout/Feedback/ErrorBoundary", () => ({
        ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./providers/Providers", () => ({
        Providers: ({ children, auth }: { children: ReactNode; auth?: { adapter?: unknown } }) => (
                <div data-testid="providers" data-has-adapter={String(Boolean(auth?.adapter))}>
                        {children}
                </div>
        ),
}));

vi.mock("./analytics", () => ({
        shouldEnableAnalytics: () => false,
}));

vi.mock("./App", () => ({
        default: () => <div data-testid="app" />,
}));

describe("main bootstrap", () => {
        beforeEach(() => {
                bootstrapMocks.createRootMock.mockClear();
                bootstrapMocks.renderMock.mockClear();
                document.body.innerHTML = '<div id="root"></div>';
                vi.resetModules();
        });

        afterEach(() => {
                cleanup();
                document.body.innerHTML = "";
        });

        it("mounts App inside the expected providers", async () => {
                await import("./main");

                expect(bootstrapMocks.createRootMock).toHaveBeenCalledWith(document.getElementById("root"));
                expect(bootstrapMocks.renderMock).toHaveBeenCalledTimes(1);

                const renderedTree = bootstrapMocks.renderMock.mock.calls[0]?.[0];
                expect(renderedTree).toBeTruthy();

                render(renderedTree);

                expect(screen.getByTestId("query-client-provider")).toHaveAttribute("data-has-client", "true");
                expect(screen.getByTestId("providers")).toHaveAttribute("data-has-adapter", "true");
                expect(screen.getByTestId("browser-router")).toBeInTheDocument();
                expect(screen.getByTestId("app")).toBeInTheDocument();
                expect(screen.queryByTestId("analytics")).not.toBeInTheDocument();
        }, 20000);

        it("throws when the root element is missing", async () => {
                document.body.innerHTML = "";

                await expect(import("./main")).rejects.toThrow("Root element #root not found");
                expect(bootstrapMocks.createRootMock).not.toHaveBeenCalled();
        });
});
