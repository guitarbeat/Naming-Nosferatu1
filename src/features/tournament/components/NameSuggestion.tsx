/**
 * @module NameSuggestion
 * @description Unified name suggestion component with inline and modal variants.
 * Uses the shared useNameSuggestion hook for consistent submission logic.
 */

import { useCallback, useEffect, useId, useRef } from "react";
import { Button, Input, LiquidGlass, Textarea } from "@/shared/components/layout";
import { getGlassPreset } from "@/shared/components/layout/GlassPresets";
import { useNameSuggestion } from "@/shared/hooks";
import { CheckCircle, Lightbulb, X } from "@/shared/lib/icons";

// ============================================================================
// TYPES
// ============================================================================

interface NameSuggestionProps {
	/** Variant: inline (compact) or modal (full-featured) */
	variant?: "inline" | "modal";
	/** For modal variant: controls visibility */
	isOpen?: boolean;
	/** For modal variant: close callback */
	onClose?: () => void;
}

// ============================================================================
// INLINE VARIANT
// ============================================================================

function InlineNameSuggestion() {
	const { values, isSubmitting, handleChange, handleSubmit, globalError, successMessage } =
		useNameSuggestion();

	const handleLocalSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await handleSubmit();
	};

	return (
		<LiquidGlass
			className="w-full flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md rounded-3xl"
			style={{ width: "100%", height: "auto", minHeight: "200px" }}
			{...getGlassPreset("card")}
		>
			<form onSubmit={handleLocalSubmit} className="w-full max-w-3xl mx-auto">
				<div className="relative overflow-hidden rounded-[28px] border border-border bg-background/50 p-6 sm:p-8 shadow-2xl shadow-background/40">
					<div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-color/15 blur-3xl" />
					<div className="pointer-events-none absolute -left-14 bottom-0 h-48 w-48 rounded-full bg-chart-4/10 blur-3xl" />

					<div className="relative text-center flex flex-col gap-3">
						<div className="inline-flex mx-auto items-center gap-2 rounded-full border border-border bg-foreground/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-foreground/90">
							<Lightbulb size={14} />
							Submit A Name
						</div>
						<h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
							Drop your best cat name idea
						</h3>
						<p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
							Add a name and a quick reason. Great suggestions help everyone discover fun new
							options.
						</p>
					</div>

					<div className="relative mt-6 grid gap-5">
						<div className="flex flex-col gap-2">
							<label htmlFor="suggest-name" className="text-sm font-semibold text-foreground/90">
								Name suggestion <span className="text-destructive">*</span>
							</label>
							<Input
								id="suggest-name"
								type="text"
								value={values.name}
								onChange={(e) => handleChange("name", e.target.value)}
								placeholder="e.g. Count Whiskula"
								className="w-full h-14 px-4 text-base font-semibold bg-foreground/5 border-border focus-visible:ring-accent-color/45"
								disabled={isSubmitting}
								maxLength={50}
							/>
						</div>

						<div className="grid gap-5">
							<div className="flex flex-col gap-2">
								<label htmlFor="suggest-name" className="text-sm font-semibold text-white/90">
									Name suggestion <span className="text-rose-300">*</span>
								</label>
								<Input
									id="suggest-name"
									type="text"
									value={values.name}
									onChange={(e) => handleChange("name", e.target.value)}
									placeholder="e.g. Count Whiskula"
									className="w-full h-14 px-4 text-base font-semibold bg-white/5 border-white/20 focus-visible:ring-cyan-300/45"
									disabled={isSubmitting}
									maxLength={50}
								/>
							</div>

							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between gap-3">
									<label
										htmlFor="suggest-description"
										className="text-sm font-semibold text-white/90"
									>
										Why this name? <span className="text-rose-300">*</span>
									</label>
									<span className="text-xs text-white/55">Help voters understand the vibe</span>
								</div>
								<Textarea
									id="suggest-description"
									value={values.description}
									onChange={(e) => handleChange("description", e.target.value)}
									placeholder="Share the meaning, story, or personality fit..."
									rows={4}
									className="w-full px-4 py-3 font-medium bg-white/5 border-white/20 focus-visible:ring-cyan-300/45 resize-none"
									disabled={isSubmitting}
									maxLength={500}
									showCount={true}
								/>
							</div>

							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
								<p className="text-xs sm:text-sm text-slate-300/80">
									Your suggestion is added to the shared discovery pool.
								</p>
								<Button
									type="submit"
									variant="glass"
									size="xl"
									disabled={!values.name.trim() || !values.description.trim() || isSubmitting}
									loading={isSubmitting}
									className="w-full sm:w-auto sm:min-w-[190px] font-extrabold"
								>
									Why this name? <span className="text-destructive">*</span>
								</label>
								<span className="text-xs text-muted-foreground">
									Help voters understand the vibe
								</span>
							</div>
							<Textarea
								id="suggest-description"
								value={values.description}
								onChange={(e) => handleChange("description", e.target.value)}
								placeholder="Share the meaning, story, or personality fit..."
								rows={4}
								className="w-full px-4 py-3 font-medium bg-foreground/5 border-border focus-visible:ring-accent-color/45 resize-none"
								disabled={isSubmitting}
								maxLength={500}
								showCount={true}
							/>
						</div>

						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
							<p className="text-xs sm:text-sm text-muted-foreground">
								Your suggestion is added to the shared discovery pool.
							</p>
							<Button
								type="submit"
								variant="glass"
								size="xl"
								disabled={!values.name.trim() || !values.description.trim() || isSubmitting}
								loading={isSubmitting}
								className="w-full sm:w-auto sm:min-w-[190px] font-extrabold"
							>
								Submit Suggestion
							</Button>
						</div>
					</div>
				</div>

				{globalError && (
					<div className="mt-4 p-3 bg-destructive/10 border border-destructive/25 rounded-xl text-destructive-foreground text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
						{globalError}
					</div>
				)}
				{successMessage && (
					<div className="mt-4 flex items-center justify-center gap-2 p-3 bg-chart-2/10 border border-chart-2/25 rounded-xl text-chart-2 text-sm font-semibold text-center animate-in fade-in slide-in-from-top-2">
						<CheckCircle size={16} />
						{successMessage}
					</div>
				)}
			</form>
		</LiquidGlass>
	);
}

// ============================================================================
// MODAL VARIANT
// ============================================================================

interface ModalNameSuggestionProps {
	isOpen: boolean;
	onClose: () => void;
}

function ModalNameSuggestion({ isOpen, onClose }: ModalNameSuggestionProps) {
	const isMountedRef = useRef(true);
	const nameInputRef = useRef<HTMLInputElement | null>(null);
	const modalGlassId = useId();

	const {
		values,
		errors,
		touched,
		isSubmitting,
		isValid,
		handleChange,
		handleBlur,
		handleSubmit,
		reset,
		globalError,
		successMessage: success,
		setGlobalError,
	} = useNameSuggestion({
		onSuccess: () => {
			setTimeout(() => {
				if (isMountedRef.current) {
					onClose();
				}
			}, 3000);
		},
	});

	// Track mount state
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	// Focus name input when modal opens
	useEffect(() => {
		if (isOpen && nameInputRef.current) {
			setTimeout(() => {
				nameInputRef.current?.focus();
			}, 100);
		}
	}, [isOpen]);

	// Handle Escape key to close modal
	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				reset();
				onClose();
			}
		};

		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose, reset]);

	const handleClose = useCallback(() => {
		if (isSubmitting) {
			return;
		}
		reset();
		setGlobalError("");
		onClose();
	}, [isSubmitting, onClose, reset, setGlobalError]);

	if (!isOpen) {
		return null;
	}

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 z-[1050] backdrop-blur-sm animate-in fade-in duration-200"
				onClick={handleClose}
				aria-hidden="true"
			/>
			<LiquidGlass
				id={`modal-glass-${modalGlassId.replace(/:/g, "-")}`}
				{...getGlassPreset("modal")}
				className="z-[1051] overflow-hidden"
				style={{
					position: "fixed",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: "min(90vw, 500px)",
					maxHeight: "90vh",
					height: "auto",
					minHeight: "400px",
					maxWidth: "min(90vw, 500px)",
					zIndex: "1051",
				}}
			>
				<div
					className="flex flex-col h-full bg-black/40 text-white"
					role="dialog"
					aria-labelledby="suggest-name-title"
					aria-describedby="suggest-name-description"
					aria-modal="true"
				>
					<div className="flex items-center justify-between p-6 border-b border-border bg-foreground/5">
						<h2
							id="suggest-name-title"
							className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
						>
							💡 Suggest a Name
						</h2>
						<button
							type="button"
							className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
							onClick={handleClose}
							aria-label="Close modal"
							disabled={isSubmitting}
						>
							<X size={24} />
						</button>
					</div>

					<div className="p-6">
						<p id="suggest-name-description" className="text-sm text-muted-foreground mb-6">
							Help us expand the list by suggesting new cat names!
						</p>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								void handleSubmit();
							}}
							className="flex flex-col gap-5"
						>
							<Input
								id="modal-name-input"
								label="Name"
								ref={nameInputRef}
								type="text"
								value={values.name}
								onChange={(e) => {
									handleChange("name", e.target.value);
									if (globalError) {
										setGlobalError("");
									}
								}}
								onBlur={() => handleBlur("name")}
								placeholder="e.g., Whiskers"
								maxLength={50}
								showSuccess={true}
								error={touched.name ? errors.name : null}
							/>

							<Textarea
								id="modal-description-input"
								label="Description"
								value={values.description}
								onChange={(e) => {
									handleChange("description", e.target.value);
									if (globalError) {
										setGlobalError("");
									}
								}}
								onBlur={() => handleBlur("description")}
								placeholder="Why is this name special? (e.g. 'He looks like a vampire!')"
								disabled={isSubmitting}
								maxLength={500}
								rows={4}
								error={touched.description ? errors.description : null}
								showCount={true}
							/>

							{globalError && (
								<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive-foreground text-sm font-medium animate-in fade-in slide-in-from-top-2">
									{globalError}
								</div>
							)}
							{success && (
								<div className="p-3 bg-chart-2/10 border border-chart-2/20 rounded-lg text-chart-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
									{success}
								</div>
							)}

							<div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
								<Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="glass"
									disabled={isSubmitting || !isValid}
									loading={isSubmitting}
									className="px-6"
								>
									Submit Suggestion
								</Button>
							</div>
						</form>
					</div>
				</div>
			</LiquidGlass>
		</>
	);
}

// ============================================================================
// UNIFIED EXPORT
// ============================================================================

export function NameSuggestion({
	variant = "inline",
	isOpen = false,
	onClose,
}: NameSuggestionProps) {
	if (variant === "modal") {
		return (
			<ModalNameSuggestion
				isOpen={isOpen}
				onClose={
					onClose ||
					(() => {
						/* No-op default */
					})
				}
			/>
		);
	}
	return <InlineNameSuggestion />;
}
