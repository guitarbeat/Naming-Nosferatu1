/**
 * @module Feedback
 * @description Barrel export for all feedback components (Loading, Toast, Error, etc.)
 * Provides backward compatibility for existing imports from FeedbackComponents
 */

export {
	ErrorBoundary,
	ErrorComponent,
} from "./ErrorBoundary";
export { Loading } from "./Loading";
export { OfflineIndicator } from "./OfflineIndicator";
export { Toast } from "./Toast";
