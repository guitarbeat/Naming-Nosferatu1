/**
 * @module Feedback
 * @description Barrel export for all feedback components (Loading, Toast, Error, etc.)
 * Provides backward compatibility for existing imports from FeedbackComponents
 */

export {
	ErrorBoundary,
	ErrorComponent,
	type ErrorFallbackProps,
} from "./ErrorBoundary";
export { Loading, type LoadingProps } from "./Loading";
export { OfflineIndicator } from "./OfflineIndicator";
export { PerformanceBadges, TrendIndicator } from "./PerformanceBadges";
export {
	type IToastItem,
	Toast,
	ToastContainer,
} from "./Toast";
