/**
 * @module LightboxImage
 * @description Enhanced image component with loading states and error handling for the lightbox
 */

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

interface LightboxImageProps {
	src: string;
	alt: string;
	className?: string;
	onError?: () => void;
	onLoad?: () => void;
}

export function LightboxImage({
	src,
	alt,
	className,
	onError,
	onLoad,
}: LightboxImageProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [retryCount, setRetryCount] = useState(0);
	const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const maxRetries = 3;

	const handleLoad = useCallback(() => {
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}
		setIsLoading(false);
		setHasError(false);
		onLoad?.();
	}, [onLoad]);

	const handleError = useCallback(() => {
		if (retryCount < maxRetries) {
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
			}
			// Retry with a slight delay
			retryTimeoutRef.current = setTimeout(
				() => {
					setRetryCount((prev) => prev + 1);
					retryTimeoutRef.current = null;
				},
				1000 * (retryCount + 1),
			);
		} else {
			setIsLoading(false);
			setHasError(true);
			onError?.();
		}
	}, [retryCount, onError]);

	// Reset state when src changes
	useEffect(() => {
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}
		setIsLoading(true);
		setHasError(false);
		setRetryCount(0);
		if (!src) {
			setIsLoading(false);
		}
	}, [src]);

	useEffect(() => {
		return () => {
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
		};
	}, []);

	if (hasError) {
		return (
			<div
				className={`flex items-center justify-center text-muted-foreground ${className}`}
			>
				<div className="text-center">
					<div className="text-6xl mb-4">🐱</div>
					<p className="text-sm mb-2">Image failed to load</p>
					{retryCount >= maxRetries && (
						<button
							type="button"
							onClick={() => {
								setRetryCount(0);
								setHasError(false);
								setIsLoading(true);
							}}
							className="px-3 py-1 text-xs bg-foreground/10 hover:bg-foreground/20 rounded-full transition-colors"
						>
							Retry
						</button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="relative">
			{isLoading && (
				<div
					className={`absolute inset-0 flex items-center justify-center ${className}`}
				>
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-foreground/20 border-t-foreground" />
				</div>
			)}
			<motion.img
				key={`${src}-${retryCount}`}
				src={src}
				alt={alt}
				className={className}
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: isLoading ? 0 : 1, scale: isLoading ? 0.9 : 1 }}
				exit={{ opacity: 0, scale: 0.9 }}
				onLoad={handleLoad}
				onError={handleError}
				loading="eager"
				decoding="async"
			/>
		</div>
	);
}
