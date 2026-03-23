/**
 * @module FormPrimitives
 * @description Unified form system with validated inputs and textareas.
 * Single source of truth for all form components in the application.
 */

import { AnimatePresence, motion } from "framer-motion";
import React, { forwardRef, useCallback, useEffect, useId, useState } from "react";
import type { z } from "zod";
import { cn } from "@/shared/lib/basic";

// ============================================================================
// TYPES
// ============================================================================

interface BaseFieldProps {
	label?: string;
	error?: string | null;
	required?: boolean;
	showSuccess?: boolean;
	className?: string;
}

interface ValidationProps {
	schema?: z.ZodSchema;
	onValidationChange?: (isValid: boolean) => void;
	debounceMs?: number;
	externalError?: string | null;
	externalTouched?: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

interface FormFieldContextValue {
	id: string;
	errorId: string | undefined;
	error: string | null;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

// ============================================================================
// HOOKS
// ============================================================================

const useFormValidation = (
	schema: z.ZodSchema | undefined,
	value: unknown,
	onValidationChange?: (isValid: boolean) => void,
	debounceMs = 300,
	externalError?: string | null,
	externalTouched?: boolean,
) => {
	const [internalError, setInternalError] = useState<string | null>(null);
	const [isTouched, setIsTouched] = useState(false);
	const [isValidating, setIsValidating] = useState(false);

	const validate = useCallback(
		(val: string) => {
			if (!schema) {
				return;
			}

			const result = schema.safeParse(val);
			if (result.success) {
				setInternalError(null);
				onValidationChange?.(true);
			} else {
				setInternalError(result.error.issues[0]?.message || "Invalid input");
				onValidationChange?.(false);
			}
			setIsValidating(false);
		},
		[schema, onValidationChange],
	);

	useEffect(() => {
		if (!isTouched || !schema) {
			return;
		}

		setIsValidating(true);
		const timer = setTimeout(() => {
			validate(String(value || ""));
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [value, isTouched, schema, validate, debounceMs]);

	const currentError = externalError !== undefined ? externalError : internalError;
	const currentTouched = externalTouched !== undefined ? externalTouched : isTouched;
	const hasError = currentTouched && currentError && !isValidating;

	return {
		internalError,
		isTouched,
		setIsTouched,
		isValidating,
		validate,
		currentError,
		currentTouched,
		hasError,
	};
};

// ============================================================================
// STYLES
// ============================================================================

const inputBaseStyles =
	"flex h-12 w-full rounded-xl border border-border/10 bg-background/20 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all text-foreground backdrop-blur-sm";

const errorStyles = "border-destructive/50 focus-visible:ring-destructive/50 animate-pulse";
const successStyles = "border-chart-2/50 focus-visible:ring-chart-2/50";

// ============================================================================
// FORM FIELD WRAPPER
// ============================================================================

interface FormFieldProps extends BaseFieldProps {
	children: React.ReactNode;
	id?: string;
	name?: string;
}

const FormField: React.FC<FormFieldProps> = ({
	id,
	name,
	label,
	error,
	required = false,
	children,
	className = "",
}) => {
	const generatedId = useId();
	const fieldId = id || (name ? `${name}-field` : `field-${generatedId}`);
	const errorId = error ? `${fieldId}-error` : undefined;

	return (
		<FormFieldContext.Provider value={{ id: fieldId, errorId, error: error || null }}>
			<div className={cn("flex flex-col gap-2 w-full", className)}>
				{label && (
					<label
						htmlFor={fieldId}
						className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground/80 ml-1"
					>
						{label}
						{required && <span className="text-destructive ml-1">*</span>}
					</label>
				)}
				{children}
				<AnimatePresence mode="wait">
					{error && errorId && (
						<motion.div
							id={errorId}
							key={error}
							initial={{ opacity: 0, y: -5 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -5 }}
							className="text-xs font-medium text-destructive ml-1"
							role="alert"
						>
							{error}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</FormFieldContext.Provider>
	);
};

FormField.displayName = "FormField";

// ============================================================================
// INPUT COMPONENT
// ============================================================================

interface InputProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">,
		BaseFieldProps,
		ValidationProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			label,
			required,
			schema,
			value,
			onChange,
			onValidationChange,
			debounceMs = 300,
			showSuccess = false,
			externalError,
			externalTouched,
			className = "",
			...props
		},
		ref,
	) => {
		const internalId = useId();
		const id = props.id || internalId;
		const { setIsTouched, validate, currentError, currentTouched, hasError, isValidating } =
			useFormValidation(
				schema,
				value,
				onValidationChange,
				debounceMs,
				externalError,
				externalTouched,
			);

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setIsTouched(true);
			onChange?.(e);
		};

		const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
			setIsTouched(true);
			validate(String(value || ""));
			props.onBlur?.(e);
		};

		const isSuccess =
			showSuccess &&
			currentTouched &&
			!currentError &&
			!isValidating &&
			String(value || "").length > 0;

		return (
			<FormField id={id} label={label} error={hasError ? currentError : null} required={required}>
				<div className="relative">
					<input
						{...props}
						id={id}
						ref={ref}
						value={value}
						onChange={handleChange}
						onBlur={handleBlur}
						className={cn(
							inputBaseStyles,
							hasError && errorStyles,
							isSuccess && successStyles,
							className,
						)}
						aria-invalid={hasError || undefined}
						aria-describedby={hasError ? `${id}-error` : undefined}
					/>
					<AnimatePresence>
						{isSuccess && (
							<motion.span
								initial={{ scale: 0, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0, opacity: 0 }}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-chart-2 pointer-events-none"
							>
								✅
							</motion.span>
						)}
						{hasError && (
							<motion.span
								initial={{ scale: 0, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0, opacity: 0 }}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive pointer-events-none"
							>
								❌
							</motion.span>
						)}
					</AnimatePresence>
				</div>
			</FormField>
		);
	},
);

Input.displayName = "Input";

// ============================================================================
// TEXTAREA COMPONENT
// ============================================================================

interface TextareaProps
	extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">,
		BaseFieldProps,
		ValidationProps {
	showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{
			label,
			required,
			schema,
			value,
			onChange,
			onValidationChange,
			debounceMs = 300,
			showSuccess = false,
			showCount = false,
			externalError,
			externalTouched,
			className = "",
			...props
		},
		ref,
	) => {
		const internalId = useId();
		const id = props.id || internalId;
		const { setIsTouched, validate, currentError, currentTouched, hasError, isValidating } =
			useFormValidation(
				schema,
				value,
				onValidationChange,
				debounceMs,
				externalError,
				externalTouched,
			);

		const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setIsTouched(true);
			onChange?.(e);
		};

		const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
			setIsTouched(true);
			validate(String(value || ""));
			props.onBlur?.(e);
		};

		const isSuccess =
			showSuccess &&
			currentTouched &&
			!currentError &&
			!isValidating &&
			String(value || "").length > 0;

		const currentLength = String(value || "").length;
		const maxLength = props.maxLength;
		const countId = `${id}-count`;

		const describedBy = [
			hasError ? `${id}-error` : undefined,
			showCount && maxLength ? countId : undefined,
		]
			.filter(Boolean)
			.join(" ");

		return (
			<FormField id={id} label={label} error={hasError ? currentError : null} required={required}>
				<textarea
					{...props}
					id={id}
					ref={ref}
					value={value}
					onChange={handleChange}
					onBlur={handleBlur}
					className={cn(
						inputBaseStyles,
						"min-h-[80px] py-3",
						hasError && errorStyles,
						isSuccess && successStyles,
						className,
					)}
					aria-invalid={hasError || undefined}
					aria-describedby={describedBy || undefined}
				/>
				{showCount && maxLength && (
					<div
						id={countId}
						className="text-xs text-muted-foreground/50 text-right font-medium tabular-nums px-1"
					>
						{currentLength}/{maxLength}
					</div>
				)}
			</FormField>
		);
	},
);

Textarea.displayName = "Textarea";
