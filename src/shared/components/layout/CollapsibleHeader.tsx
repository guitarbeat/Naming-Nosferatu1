import type React from "react";

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
