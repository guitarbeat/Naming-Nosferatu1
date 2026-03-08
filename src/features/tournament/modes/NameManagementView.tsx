/**
 * @module NameManagementView
 * @description Shared view component that powers both Tournament Setup and Profile views.
 * Provides a consistent interface with mode-specific extensions.
 */

import React, { useEffect, useState } from "react";
import { useToast } from "@/app/providers/Providers";
import { NameManagementProvider } from "@/features/tournament/context/NameManagementContext";
import { useNameManagementView } from "@/features/tournament/hooks/useNameManagementView";
import { ErrorComponent } from "@/shared/components/layout";
import { cn } from "@/shared/lib/basic";
import type {
	NameItem,
	NameManagementViewExtensions,
	UseNameManagementViewProps,
} from "@/shared/types";
import { ManagementMode } from "./ManagementMode";

interface NameManagementViewProps extends UseNameManagementViewProps {
	className?: string; // Kept for API compatibility, but might be unused if modes handle containers
	onStartTournament?: (selectedNames: NameItem[]) => void;

	extensions?: NameManagementViewExtensions;
	tournamentProps?: Record<string, unknown>;
	profileProps?: Record<string, unknown>;
}

export function NameManagementView({
	mode = "tournament", // Default mode
	userName,
	analysisMode: propsAnalysisMode,
	setAnalysisMode: propsSetAnalysisMode,

	extensions = {},
	tournamentProps = {},
	profileProps = {},
	className = "",
}: NameManagementViewProps) {
	// * Internal state as fallback if not provided by props (though required in interface)
	const [internalAnalysisMode, setInternalAnalysisMode] = useState(false);

	const analysisMode = propsAnalysisMode ?? internalAnalysisMode;
	const setAnalysisMode = propsSetAnalysisMode ?? setInternalAnalysisMode;

	const { showToast } = useToast();

	useEffect(() => {
		if (typeof window === "undefined" || propsAnalysisMode !== undefined) {
			return;
		}
		const params = new URLSearchParams(window.location.search);
		setInternalAnalysisMode(params.get("analysis") === "true");
	}, [propsAnalysisMode]);

	const state = useNameManagementView({
		mode,
		userName,
		profileProps,
		tournamentProps,
		analysisMode,
		setAnalysisMode,
		extensions,
	});

	const { isError, dataError, clearErrors } = state;

	// * Feedback Side Effects
	useEffect(() => {
		if (isError && dataError) {
			showToast(dataError.message || "An error occurred while loading data", "error");
		}
	}, [isError, dataError, showToast]);

	const renderContent = () => {
		// 1. Dashboard Mode (Analysis or Profile Dashboard via extension)
		if (analysisMode && extensions.dashboard) {
			return (
				<div
					className={cn(
						"w-full max-w-[95%] mx-auto min-h-[80vh] flex flex-col gap-8 px-4 md:px-8 bg-black/50 backdrop-blur-sm rounded-3xl border border-white/5",
						className,
					)}
					data-component="name-management-view"
					data-mode="analysis"
				>
					{extensions.header && (
						<div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
							{typeof extensions.header === "function" ? extensions.header() : extensions.header}
						</div>
					)}
					<section className="w-full flex-1 min-h-[500px] animate-in fade-in zoom-in-95 duration-500 delay-100">
						{React.isValidElement(extensions.dashboard)
							? extensions.dashboard
							: typeof extensions.dashboard === "function"
								? React.createElement(extensions.dashboard as React.ComponentType)
								: extensions.dashboard}
					</section>
				</div>
			);
		}

		// 2. Management Mode (Tournament Setup or Profile Grid)
		return <ManagementMode {...state} mode={mode} />;
	};

	return (
		<>
			{isError && (
				<ErrorComponent
					error={dataError?.message || "An error occurred"}
					onRetry={() => state.refetch()}
					onDismiss={clearErrors}
				/>
			)}

			<NameManagementProvider value={state}>
				{/* Context Logic Extension */}
				{extensions.contextLogic &&
					(typeof extensions.contextLogic === "function"
						? extensions.contextLogic()
						: extensions.contextLogic)}

				{renderContent()}
			</NameManagementProvider>
		</>
	);
}
