/**
 * @module NameUploadForm
 * @description Admin image upload form for cat photos.
 * Extracted from NameGrid to improve maintainability.
 */

import { useCallback, useState } from "react";
import { imagesAPI } from "@/services/supabase/client";
import { compressImageFile, devError } from "@/shared/lib/basic";
import { AlertCircle, CheckCircle, Loader2, Upload } from "@/shared/lib/icons";

interface NameUploadFormProps {
	onImagesUploaded: (uploadedPaths: string[]) => void;
	isAdmin?: boolean;
}

export function NameUploadForm({ onImagesUploaded, isAdmin = false }: NameUploadFormProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
	const [message, setMessage] = useState("");

	const handleFileUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files || []);
			if (!files.length) {
				return;
			}

			setIsUploading(true);
			setStatus("idle");
			setMessage("");

			try {
				const uploaded: string[] = [];
				await Promise.all(
					files.map(async (f) => {
						const compressed = await compressImageFile(f, {
							maxWidth: 1600,
							maxHeight: 1600,
							quality: 0.8,
						});
						const result = await imagesAPI.upload(compressed, "admin");
						if (result?.path) {
							uploaded.push(result.path);
						}
					}),
				);

				if (uploaded.length > 0) {
					onImagesUploaded(uploaded);
					setStatus("success");
					setMessage(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded!`);

					// Reset after delay
					setTimeout(() => {
						setStatus("idle");
						setMessage("");
					}, 3000);
				} else {
					setStatus("error");
					setMessage("No images were uploaded.");
				}
			} catch (err) {
				devError("Upload error", err);
				setStatus("error");
				setMessage("Upload failed. Please try again.");
			} finally {
				setIsUploading(false);
				// Reset file input value so same files can be selected again if needed
				e.target.value = "";
			}
		},
		[onImagesUploaded],
	);

	if (!isAdmin) {
		return null;
	}

	return (
		<div className="flex justify-center mt-12 mb-8">
			<label
				className={`cursor-pointer flex items-center gap-3 px-8 py-3 rounded-full transition-all font-bold tracking-wider uppercase text-sm border shadow-xl ${
					status === "error"
						? "bg-red-600 hover:bg-red-500 border-red-500/20 shadow-red-900/30 text-white"
						: status === "success"
							? "bg-green-600 hover:bg-green-500 border-green-500/20 shadow-green-900/30 text-white"
							: "bg-purple-600 hover:bg-purple-500 border-purple-500/20 shadow-purple-900/30 text-white"
				} ${
					isUploading
						? "opacity-75 cursor-wait"
						: "active:scale-95 focus-within:ring-4 focus-within:ring-purple-400/50"
				}`}
				aria-busy={isUploading}
				aria-live="polite"
			>
				<input
					type="file"
					accept="image/*"
					multiple={true}
					onChange={handleFileUpload}
					className="sr-only"
					disabled={isUploading}
				/>

				{isUploading ? (
					<>
						<Loader2 size={20} className="animate-spin" />
						<span>Uploading...</span>
					</>
				) : status === "success" ? (
					<>
						<CheckCircle size={20} />
						<span>{message}</span>
					</>
				) : status === "error" ? (
					<>
						<AlertCircle size={20} />
						<span>{message}</span>
					</>
				) : (
					<>
						<Upload size={20} />
						<span>Upload New Cat Photos</span>
					</>
				)}
			</label>
		</div>
	);
}
