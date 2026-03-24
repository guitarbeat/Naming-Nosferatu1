/**
 * @module NameSuggestion
 * @description Unified name suggestion component with inline and modal variants.
 * Uses the shared useNameSuggestion hook for consistent submission logic.
 */

import { useCallback, useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Input, LiquidGlass, Textarea } from "@/shared/components/layout";
import { getGlassPreset } from "@/shared/components/layout/GlassPresets";
import { useNameSuggestion } from "@/shared/hooks";
import { CheckCircle, Lightbulb, PartyPopper, X } from "@/shared/lib/icons";

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

	// Calculate form completion progress
	const nameProgress = Math.min((values.name.length / 50) * 100, 100);
	const descriptionProgress = Math.min((values.description.length / 500) * 100, 100);
	const overallProgress = (nameProgress + descriptionProgress) / 2;
	const isFormComplete = values.name.trim().length > 0 && values.description.trim().length > 0;

	return (
		<form onSubmit={handleLocalSubmit} className="w-full max-w-4xl mx-auto">
			<div className="relative">
				{/* Enhanced Background Elements - hidden on mobile for clarity */}
				<div className="absolute inset-0 overflow-hidden rounded-3xl hidden sm:block">
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 0.6, scale: 1 }}
						transition={{ duration: 1, ease: "easeOut" }}
						className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 0.4, scale: 1 }}
						transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
						className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-3xl"
					/>
				</div>

				{/* Main Content Container */}
				<div className="relative bg-gradient-to-br from-background/80 via-background/90 to-background/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-border/20 shadow-2xl p-4 sm:p-8 md:p-12">
					
					{/* Header - compact on mobile */}
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
						className="text-center mb-6 sm:mb-12"
					>
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 25 }}
							className="inline-flex mx-auto items-center gap-2 sm:gap-3 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10 px-4 sm:px-6 py-2 sm:py-3 mb-3 sm:mb-6"
						>
							<Lightbulb size={16} className="text-primary sm:hidden" />
							<motion.div
								animate={{ rotate: [0, 10, -10, 0] }}
								transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
								className="hidden sm:block"
							>
								<Lightbulb size={20} className="text-primary" />
							</motion.div>
							<span className="text-xs sm:text-sm font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
								Submit A Name
							</span>
						</motion.div>
						
						<motion.h1
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3, duration: 0.6 }}
							className="text-2xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent mb-3 sm:mb-6"
						>
							Drop Your Best Cat Name
						</motion.h1>
						
						<motion.p
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4, duration: 0.6 }}
							className="text-sm sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
						>
							Share your creative name with the community
						</motion.p>
					</motion.div>

					{/* Progress Indicator - hidden on mobile */}
					<motion.div
						initial={{ opacity: 0, width: 0 }}
						animate={{ opacity: 1, width: "100%" }}
						transition={{ delay: 0.5, duration: 0.8 }}
						className="mb-6 sm:mb-8 hidden sm:block"
					>
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium text-foreground/70">Form Progress</span>
							<span className="text-sm font-bold text-primary">{Math.round(overallProgress)}%</span>
						</div>
						<div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
							<motion.div
								initial={{ width: 0 }}
								animate={{ width: `${overallProgress}%` }}
								transition={{ duration: 0.5, ease: "easeOut" }}
								className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
							/>
						</div>
					</motion.div>

					{/* Form Fields */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6, duration: 0.6 }}
						className="space-y-5 sm:space-y-8"
					>
						{/* Name Input */}
						<div className="space-y-2 sm:space-y-3">
							<label htmlFor="suggest-name" className="flex items-center gap-2 text-sm font-bold text-foreground/90">
								<span className="w-2 h-2 bg-primary rounded-full" />
								Name suggestion
								<span className="text-destructive">*</span>
								<motion.span
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="text-xs text-muted-foreground ml-auto"
								>
									{values.name.length}/50
								</motion.span>
							</label>
							<motion.div
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								transition={{ type: "spring", stiffness: 400, damping: 25 }}
							>
								<Input
									id="suggest-name"
									type="text"
									value={values.name}
									onChange={(e) => handleChange("name", e.target.value)}
									placeholder="e.g. Count Whiskula, Sir Paws-a-lot, Meow-zart"
									className="w-full h-12 sm:h-16 px-4 sm:px-6 text-base sm:text-lg font-semibold bg-gradient-to-r from-foreground/5 to-foreground/10 border-border/30 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-xl backdrop-blur-sm transition-all duration-300"
									disabled={isSubmitting}
									maxLength={50}
								/>
							</motion.div>
						</div>

						{/* Description Textarea */}
						<div className="space-y-2 sm:space-y-3">
							<div className="flex items-center justify-between gap-2">
								<label htmlFor="suggest-description" className="flex items-center gap-2 text-sm font-bold text-foreground/90">
									<span className="w-2 h-2 bg-accent rounded-full" />
									Why this name?
									<span className="text-destructive">*</span>
								</label>
								<motion.span
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="text-xs text-muted-foreground"
								>
									{values.description.length}/500
								</motion.span>
							</div>
							<motion.div
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								transition={{ type: "spring", stiffness: 400, damping: 25 }}
							>
								<Textarea
									id="suggest-description"
									value={values.description}
									onChange={(e) => handleChange("description", e.target.value)}
								placeholder="Why is this name special?"
								rows={3}
								className="w-full px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-medium bg-gradient-to-r from-foreground/5 to-foreground/10 border-border/30 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent/50 rounded-xl backdrop-blur-sm resize-none transition-all duration-300"
									disabled={isSubmitting}
									maxLength={500}
									showCount={false}
								/>
							</motion.div>
							<p className="text-xs text-muted-foreground italic">
								Help voters understand the vibe and personality behind your suggestion
							</p>
						</div>

						{/* Submit Section */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.8, duration: 0.6 }}
							className="pt-6"
						>
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<p className="text-sm text-muted-foreground">
									Your suggestion will be added to the shared discovery pool for everyone to enjoy
								</p>
								<motion.div
									whileHover={{ scale: 1.05, y: -2 }}
									whileTap={{ scale: 0.95 }}
									transition={{ type: "spring", stiffness: 400, damping: 25 }}
								>
									<Button
										type="submit"
										variant="glass"
										size="xl"
										disabled={!isFormComplete || isSubmitting}
										loading={isSubmitting}
										className="w-full sm:w-auto min-w-[200px] font-extrabold px-8 py-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-xl hover:shadow-2xl hover:shadow-primary/30 border-2 border-primary/30"
									>
										{isSubmitting ? "Submitting..." : "Submit Suggestion"}
									</Button>
								</motion.div>
							</div>
						</motion.div>
					</motion.div>

					{/* Enhanced Status Messages */}
					<AnimatePresence mode="wait">
						{globalError && (
							<motion.div
								initial={{ opacity: 0, y: -10, scale: 0.95 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: -10, scale: 0.95 }}
								transition={{ duration: 0.3 }}
								className="mt-6 p-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/30 rounded-xl text-destructive-foreground text-sm font-semibold text-center backdrop-blur-sm shadow-lg shadow-destructive/20"
							>
								<div className="flex items-center justify-center gap-2">
									<X size={16} />
									{globalError}
								</div>
							</motion.div>
						)}
						
						{successMessage && (
							<motion.div
								initial={{ opacity: 0, y: -10, scale: 0.95 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: -10, scale: 0.95 }}
								transition={{ duration: 0.3 }}
								className="mt-6 p-4 bg-gradient-to-r from-success/10 to-chart-2/10 border border-success/30 rounded-xl text-success-foreground text-sm font-semibold text-center backdrop-blur-sm shadow-lg shadow-success/20"
							>
								<div className="flex items-center justify-center gap-2">
									<motion.div
										initial={{ scale: 0, rotate: -180 }}
										animate={{ scale: 1, rotate: 0 }}
										transition={{ type: "spring", stiffness: 600, damping: 20 }}
									>
										<CheckCircle size={16} />
									</motion.div>
									{successMessage}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
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
