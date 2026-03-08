import type React from "react";
import { cn } from "@/shared/lib/basic";
import { ChevronDown, ChevronRight } from "@/shared/lib/icons";

interface CollapsibleHeaderProps {
	title: string;
	icon?: React.ReactNode;
	actions?: React.ReactNode;
	isCollapsed?: boolean;
	onToggle?: () => void;
	contentId?: string;
	variant?: "default" | "compact";
	toolbar?: React.ReactNode;
}

export const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({
	title,
	icon,
	actions,
	isCollapsed,
	onToggle,
	contentId,
	variant = "default",
	toolbar,
}) => {
	return (
		<div className={cn("flex items-center justify-between", variant === "default" && "mb-4")}>
			{onToggle ? (
				<button
					type="button"
					className={cn("flex items-center gap-2 cursor-pointer select-none")}
					onClick={onToggle}
					aria-expanded={isCollapsed === undefined ? undefined : !isCollapsed}
					aria-controls={contentId}
				>
					<div className="text-white/60 hover:text-white transition-colors">
						{isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
					</div>
					<div className="text-lg font-semibold text-white flex items-center gap-2">
						{icon && <span>{icon}</span>}
						{title}
					</div>
				</button>
			) : (
				<div className={cn("flex items-center gap-2")}>
					<div className="text-lg font-semibold text-white flex items-center gap-2">
						{icon && <span>{icon}</span>}
						{title}
					</div>
				</div>
			)}
			<div className="flex items-center gap-4">
				{toolbar}
				{actions}
			</div>
		</div>
	);
};

export const CollapsibleContent: React.FC<{
	id?: string;
	isCollapsed: boolean;
	children: React.ReactNode;
}> = ({ id, isCollapsed, children }) => {
	if (isCollapsed) {
		return null;
	}
	return (
		<div id={id} className="animate-in slide-in-from-top-2 duration-200 fade-in zoom-in-95">
			{children}
		</div>
	);
};
