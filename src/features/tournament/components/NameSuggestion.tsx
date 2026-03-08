/**
 * @module NameSuggestion
 * @description Unified name suggestion component with inline and modal variants.
 * Uses the shared useNameSuggestion hook for consistent submission logic.
 */

import { useCallback, useEffect, useId, useRef } from "react";
import { useNameSuggestion } from "@/hooks/useNames";
import { Button, Input, LiquidGlass, Textarea } from "@/shared/components/layout";
import { getGlassPreset } from "@/shared/components/layout/GlassPresets";
import { X } from "@/shared/lib/icons";

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
			className="w-full flex flex-col items-center justify-center p-8 backdrop-blur-md rounded-3xl"
			style={{ width: "100%", height: "auto", minHeight: "200px" }}
			{...getGlassPreset("card")}
		>
			<form
				onSubmit={handleLocalSubmit}
				className="flex flex-col gap-6 w-full max-w-2xl mx-auto"
				style={{ padding: "2rem" }}
			>
				<div className="flex flex-col gap-4">
					<label
						htmlFor="suggest-name"
						className="text-xl font-bold text-center text-white/90 drop-shadow-sm"
					>
						Got a great name in mind?
					</label>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div className="flex-1">
							<Input
								id="suggest-name"
								type="text"
								value={values.name}
								onChange={(e) => handleChange("name", e.target.value)}
								placeholder="Enter a cool cat name..."
								className="w-full h-[50px] px-4 font-medium backdrop-blur-sm"
								disabled={isSubmitting}
							/>
						</div>
						<Button
							type="submit"
							variant="gradient"
							size="xl"
							disabled={!values.name.trim() || !values.description.trim() || isSubmitting}
							loading={isSubmitting}
							className="w-full sm:w-auto"
						>
							Suggest
						</Button>
					</div>
					<div className="flex flex-col gap-2">
						<label htmlFor="suggest-description" className="text-sm font-medium text-white/80">
							Why this name? (optional but encouraged)
						</label>
						<Textarea
							id="suggest-description"
							value={values.description}
							onChange={(e) => handleChange("description", e.target.value)}
							placeholder="Share what makes this name special, its meaning, or why it fits your cat..."
							rows={3}
							className="w-full px-4 py-3 font-medium backdrop-blur-sm resize-none"
							disabled={isSubmitting}
							maxLength={500}
							showCount={true}
						/>
					</div>
				</div>
				{globalError && (
					<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
						{globalError}
					</div>
				)}
				{successMessage && (
					<div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-200 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
						{successMessage}
					</div>
				)}
				<p className="text-center text-sm text-white/50 font-medium">
					Your suggestion will be added to the pool for everyone to discover.
				</p>
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
					<div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
						<h2
							id="suggest-name-title"
							className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400"
						>
							💡 Suggest a Name
						</h2>
						<button
							type="button"
							className="flex items-center justify-center w-8 h-8 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
							onClick={handleClose}
							aria-label="Close modal"
							disabled={isSubmitting}
						>
							<X size={24} />
						</button>
					</div>

					<div className="p-6">
						<p id="suggest-name-description" className="text-sm text-white/70 mb-6">
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
								<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm font-medium animate-in fade-in slide-in-from-top-2">
									{globalError}
								</div>
							)}
							{success && (
								<div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-200 text-sm font-medium animate-in fade-in slide-in-from-top-2">
									{success}
								</div>
							)}

							<div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
								<Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="gradient"
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
