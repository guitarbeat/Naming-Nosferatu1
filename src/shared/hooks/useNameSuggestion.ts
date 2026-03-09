import { useCallback, useState } from "react";
import { coreAPI } from "@/services/supabase/api";

interface UseNameSuggestionProps {
	onSuccess?: () => void;
}

interface UseNameSuggestionResult {
	values: { name: string; description: string };
	errors: { name?: string; description?: string };
	touched: { name?: boolean; description?: boolean };
	isSubmitting: boolean;
	isValid: boolean;
	handleChange: (field: "name" | "description", value: string) => void;
	handleBlur: (field: "name" | "description") => void;
	handleSubmit: () => Promise<void>;
	reset: () => void;
	globalError: string;
	successMessage: string;
	setGlobalError: (error: string) => void;
}

export function useNameSuggestion(props: UseNameSuggestionProps = {}): UseNameSuggestionResult {
	const [values, setValues] = useState({ name: "", description: "" });
	const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
	const [touched, setTouched] = useState<{ name?: boolean; description?: boolean }>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [globalError, setGlobalError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const handleChange = useCallback((field: "name" | "description", value: string) => {
		setValues((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: undefined }));
		setGlobalError("");
	}, []);

	const handleBlur = useCallback((field: "name" | "description") => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	}, []);

	const validate = useCallback(() => {
		const nextErrors: { name?: string; description?: string } = {};
		if (!values.name.trim()) {
			nextErrors.name = "Name is required";
		}
		if (!values.description.trim()) {
			nextErrors.description = "Description is required";
		}
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}, [values]);

	const handleSubmit = useCallback(async () => {
		if (!validate()) {
			return;
		}
		setIsSubmitting(true);
		setGlobalError("");
		setSuccessMessage("");
		try {
			const result = await coreAPI.addName(values.name, values.description);
			if (!result.success) {
				throw new Error(result.error || "Failed to submit suggestion");
			}
			setSuccessMessage("Name suggestion submitted successfully!");
			setValues({ name: "", description: "" });
			setTouched({});
			props.onSuccess?.();
		} catch (submitError) {
			setGlobalError(
				submitError instanceof Error ? submitError.message : "Failed to submit suggestion",
			);
		} finally {
			setIsSubmitting(false);
		}
	}, [props, validate, values.name, values.description]);

	const reset = useCallback(() => {
		setValues({ name: "", description: "" });
		setErrors({});
		setTouched({});
		setGlobalError("");
		setSuccessMessage("");
	}, []);

	const isValid = !errors.name && !errors.description && values.name.trim() !== "";

	return {
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
		successMessage,
		setGlobalError,
	};
}
