/**
 * @module NameSuggestion
 * @description Unified name suggestion component with inline and modal variants.
 * Uses the shared useNameSuggestion hook for consistent submission logic.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef } from "react";
import { Button, Input, LiquidGlass, Textarea } from "@/shared/components/layout";
import { getGlassPreset } from "@/shared/components/layout/GlassPresets";
import { useNameSuggestion } from "@/shared/hooks";
import { CheckCircle, X } from "@/shared/lib/icons";

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
// INNER CONTENT (no wrapper — used when embedded in a shared container)
// ============================================================================

export function NameSuggestionInner() {
	const { values, isSubmitting, handleChange, handleSubmit, globalError, successMessage } =
		useNameSuggestion();

	const handleLocalSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await handleSubmit();
	};

	const isFormComplete = values.name.trim().length > 0 && values.description.trim().length > 0;

	return (
		<form onSubmit={handleLocalSubmit} className="w-full max-w-2xl mx-auto">
			<div className="rounded-2xl border border-border/20 bg-gradient-to-br from-background/80 via-background/90 to-background/95 backdrop-blur-xl shadow-xl p-6 sm:p-8 space-y-6">
				{/* Name Input */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<label htmlFor="suggest-name" className="text-sm font-semibold text-foreground/90">
							Cat name suggestion{" "}
							<span className="text-destructive" aria-hidden="true">
								*
							</span>
						</label>
						<span className="text-xs text-muted-foreground tabular-nums">
							{values.name.length}/50
						</span>
					</div>
					<p className="text-xs text-muted-foreground">
						One name only — first or full name, max 50 characters.
					</p>
					<Input
						id="suggest-name"
						type="text"
						value={values.name}
						onChange={(e) => handleChange("name", e.target.value)}
						placeholder="e.g. Count Whiskula, Sir Paws-a-lot, Meow-zart"
						className="w-full h-12 px-4 text-base bg-foreground/5 border-border/30 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-xl transition-all duration-200"
						disabled={isSubmitting}
						maxLength={50}
					/>
				</div>

				{/* Description Textarea */}
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-2">
						<label
							htmlFor="suggest-description"
							className="text-sm font-semibold text-foreground/90"
						>
							Why this name?{" "}
							<span className="text-destructive" aria-hidden="true">
								*
							</span>
						</label>
						<span className="text-xs text-muted-foreground tabular-nums">
							{values.description.length}/500
						</span>
					</div>
					<p className="text-xs text-muted-foreground">
						What makes it perfect for a cat? Funny, elegant, spooky?
					</p>
					<Textarea
						id="suggest-description"
						value={values.description}
						onChange={(e) => handleChange("description", e.target.value)}
						placeholder="Share the meaning, story, or personality fit..."
						rows={4}
						className="w-full px-4 py-3 text-sm bg-foreground/5 border-border/30 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-xl resize-none transition-all duration-200"
						disabled={isSubmitting}
						maxLength={500}
						showCount={false}
					/>
				</div>

				{/* Submit Row */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-border/10">
					<p className="text-xs text-muted-foreground">
						Added to the shared community pool for everyone to discover.
					</p>
					<Button
						type="submit"
						variant="primary"
						size="large"
						disabled={!isFormComplete || isSubmitting}
						loading={isSubmitting}
						className="w-full sm:w-auto"
					>
						{isSubmitting ? "Submitting…" : "Submit Suggestion"}
					</Button>
				</div>

				{/* Status Messages */}
				<AnimatePresence mode="wait">
					{globalError && (
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
							className="p-3 bg-destructive/10 border border-destructive/25 rounded-xl text-sm font-medium text-destructive flex items-center gap-2"
							role="alert"
						>
							<X size={15} />
							{globalError}
						</motion.div>
					)}
					{successMessage && (
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
							className="p-3 bg-success/10 border border-success/25 rounded-xl text-sm font-medium text-success-foreground flex items-center gap-2"
							role="status"
						>
							<CheckCircle size={15} />
							{successMessage}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</form>
	);
}

// ============================================================================
// INLINE VARIANT (self-contained with LiquidGlass wrapper)
// ============================================================================

function InlineNameSuggestion() {
	return <NameSuggestionInner />;
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

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		if (isOpen && nameInputRef.current) {
			setTimeout(() => {
				nameInputRef.current?.focus();
			}, 100);
		}
	}, [isOpen]);

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
