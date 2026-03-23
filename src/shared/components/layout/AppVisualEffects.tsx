import { useEffect, useState } from "react";
import { useBrowserState } from "@/shared/hooks";
import { MagicMoire, supportsWebGL } from "./MagicMoire";

interface AppVisualEffectsProps {
	theme?: string;
}

type MoireMode = "pending" | "webgl" | "css";

export function AppVisualEffects({ theme }: AppVisualEffectsProps) {
	const { prefersReducedMotion, isSlowConnection } = useBrowserState();
	const [moireMode, setMoireMode] = useState<MoireMode>("pending");

	useEffect(() => {
		if (prefersReducedMotion || isSlowConnection) {
			setMoireMode("css");
			return;
		}

		setMoireMode(supportsWebGL() ? "webgl" : "css");
	}, [isSlowConnection, prefersReducedMotion]);

	return (
		<div
			className="app-visual-effects"
			data-testid="app-visual-effects"
			aria-hidden="true"
		>
			<div className="cat-background">
				<div className="cat-background__gradient" />
				{moireMode === "css" ? <div className="cat-background__moire" /> : null}
				<div className="cat-background__soft-blur" />
				<div className="cat-background__vignette" />
			</div>
			{moireMode === "webgl" ? (
				<MagicMoire
					theme={theme}
					onError={() => {
						setMoireMode("css");
					}}
				/>
			) : null}
		</div>
	);
}

export default AppVisualEffects;
