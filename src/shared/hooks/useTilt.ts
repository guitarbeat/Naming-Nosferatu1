import { type MotionValue, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

interface TiltConfig {
	maxTilt?: number;
	scale?: number;
	speed?: number;
}

interface TiltValues {
	rotateX: MotionValue<string>;
	rotateY: MotionValue<string>;
	handleMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
	handleMouseLeave: () => void;
	isEnabled: boolean;
}

const defaultConfig: TiltConfig = {
	maxTilt: 8,
	scale: 1.02,
	speed: 400,
};

export function useTilt(enabled = true, config: TiltConfig = {}): TiltValues {
	const { maxTilt, speed } = { ...defaultConfig, ...config };

	// Detect touch device to disable tilt on mobile
	const [isTouchDevice, setIsTouchDevice] = useState(false);
	useEffect(() => {
		const coarsePointerQuery =
			typeof window !== "undefined" && typeof window.matchMedia === "function"
				? window.matchMedia("(pointer: coarse)")
				: null;
		setIsTouchDevice(Boolean(coarsePointerQuery?.matches));
	}, []);

	const isEnabled = enabled && !isTouchDevice;

	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);

	const springConfig = { stiffness: speed, damping: 30, mass: 0.5 };
	const mouseXSpring = useSpring(mouseX, springConfig);
	const mouseYSpring = useSpring(mouseY, springConfig);

	const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${maxTilt}deg`, `-${maxTilt}deg`]);
	const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${maxTilt}deg`, `${maxTilt}deg`]);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLElement>) => {
			if (!isEnabled) {
				return;
			}
			const rect = e.currentTarget.getBoundingClientRect();
			const x = (e.clientX - rect.left) / rect.width - 0.5;
			const y = (e.clientY - rect.top) / rect.height - 0.5;
			mouseX.set(x);
			mouseY.set(y);
		},
		[isEnabled, mouseX, mouseY],
	);

	const handleMouseLeave = useCallback(() => {
		mouseX.set(0);
		mouseY.set(0);
	}, [mouseX, mouseY]);

	return {
		rotateX,
		rotateY,
		handleMouseMove,
		handleMouseLeave,
		isEnabled,
	};
}
