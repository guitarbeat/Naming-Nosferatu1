import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/shared/lib/basic";
import Button from "./Button";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmTone?: "default" | "danger";
	loading?: boolean;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
}

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	confirmTone = "default",
	loading = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	useEffect(() => {
		if (!open) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !loading) {
				event.preventDefault();
				onCancel();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [open, loading, onCancel]);

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-[1099] bg-black/60 backdrop-blur-sm"
						onClick={() => {
							if (!loading) {
								onCancel();
							}
						}}
						aria-hidden="true"
					/>

					<motion.div
						initial={{ opacity: 0, y: 16, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 12, scale: 0.98 }}
						transition={{ duration: 0.2 }}
						role="dialog"
						aria-modal="true"
						aria-labelledby="confirm-dialog-title"
						aria-describedby={description ? "confirm-dialog-description" : undefined}
						className="fixed inset-0 z-[1100] grid place-items-center p-4"
					>
						<div
							className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/95 p-6 text-white shadow-2xl"
							onClick={(event) => event.stopPropagation()}
						>
							<h3 id="confirm-dialog-title" className="text-lg font-bold leading-tight">
								{title}
							</h3>
							{description && (
								<p id="confirm-dialog-description" className="mt-2 text-sm text-white/70">
									{description}
								</p>
							)}

							<div className="mt-6 flex items-center justify-end gap-3">
								<Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
									{cancelLabel}
								</Button>
								<Button
									type="button"
									variant={confirmTone === "danger" ? "danger" : "gradient"}
									onClick={() => void onConfirm()}
									loading={loading}
									className={cn(confirmTone === "danger" && "bg-red-600 hover:bg-red-500")}
								>
									{confirmLabel}
								</Button>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
