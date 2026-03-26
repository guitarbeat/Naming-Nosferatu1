/**
 * @module ProfileSection
 * @description User profile management section wrapper.
 */

import { Section } from "@/shared/components/layout";
import { ProfileInner } from "@/shared/components/profile/ProfileInner";

interface ProfileSectionProps {
	onLogin: (name: string) => Promise<boolean | undefined>;
}
export { ProfileInner };

// ============================================================================
// STANDALONE SECTION WRAPPER (for use outside the combined container)
// ============================================================================

export function ProfileSection({ onLogin }: ProfileSectionProps) {
	return (
		<Section id="profile" variant="minimal" padding="comfortable" maxWidth="full">
			<div className="mx-auto w-full max-w-3xl">
				<ProfileInner onLogin={onLogin} />
			</div>
		</Section>
	);
}
