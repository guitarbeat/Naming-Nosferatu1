/**
 * @module EmptyState
 * @description A generic empty state component to provide feedback when no data is available.
 * Styles consolidated in source/styles/components.css
 */

import type React from "react";

interface EmptyStateProps {
	/**
	 * Main title of the empty state
	 */
	title: string;
	/**
	 * Detailed description or helpful hint
	 */
	description?: string;
	/**
	 * Icon or emoji to display
	 * @default "📭"
	 */
	icon?: React.ReactNode;
	/**
	 * Optional action button or link
	 */
	action?: React.ReactNode;
	className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	title,
	description,
	icon = "📭",
	action,
	className = "",
}) => {
	return (
		<div className={`empty-state ${className}`}>
			<div className="empty-state__icon" aria-hidden="true">
				{icon}
			</div>
			<h3 className="empty-state__title">{title}</h3>
			{description && <p className="empty-state__description">{description}</p>}
			{action && <div className="empty-state__actions">{action}</div>}
		</div>
	);
};
