import type { PropsWithChildren } from "react";

export function FrameEffect({ children }: PropsWithChildren) {
	return (
		<div className="app-frame-shell" data-testid="app-frame-shell">
			<div className="app-frame-shell__content">{children}</div>
			<div
				className="app-frame"
				data-testid="app-frame"
				aria-hidden="true"
				style={{ pointerEvents: "none" }}
			/>
		</div>
	);
}

export default FrameEffect;
