/**
 * @module ProfileSection
 * @description Dedicated page section for user profile management (Login, Name, Avatar)
 * Uses LiquidGlass for consistent styling with NameSuggestion component.
 */

import { useEffect, useState } from "react";
import { Button, Input, LiquidGlass, Section } from "@/shared/components/layout";
import { getGlassPreset } from "@/shared/components/layout/GlassPresets";
import { CAT_IMAGES } from "@/shared/lib/constants";
import { LogOut, Pencil, User } from "@/shared/lib/icons";
import useAppStore from "@/store/appStore";

interface ProfileSectionProps {
	onLogin: (name: string) => Promise<boolean | undefined>;
}

export function ProfileSection({ onLogin }: ProfileSectionProps) {
	const { user, userActions } = useAppStore();
	const [editedName, setEditedName] = useState(user.name || "");
	const [isSaving, setIsSaving] = useState(false);
	const [isEditing, setIsEditing] = useState(!user.isLoggedIn);
	const [avatarSrc, setAvatarSrc] = useState(user.avatarUrl || "https://placekitten.com/200/200");

	// Sync local state when user changes
	useEffect(() => {
		setEditedName(user.name || "");
		setAvatarSrc(user.avatarUrl || "https://placekitten.com/200/200");
		if (!user.isLoggedIn) {
			setIsEditing(true);
		}
	}, [user.name, user.isLoggedIn, user.avatarUrl]);

	const handleSave = async () => {
		if (!editedName.trim()) {
			return;
		}
		setIsSaving(true);
		try {
			await onLogin(editedName.trim());
			setIsEditing(false);
		} catch (err) {
			console.error("Failed to update name:", err);
		} finally {
			setIsSaving(false);
		}
	};

	const handleLogout = () => {
		userActions.logout();
		setIsEditing(true);
	};

	return (
		<Section id="profile" variant="minimal" padding="comfortable" maxWidth="2xl" separator={true}>
			<LiquidGlass
				className="w-full flex flex-col items-center justify-center backdrop-blur-md rounded-3xl p-8 gap-6"
				style={{ width: "100%", height: "auto", minHeight: "200px" }}
				{...getGlassPreset("card")}
			>
				{/* Section Header - Only show when editing/logging in */}
				{isEditing && !user.isLoggedIn && (
					<div className="w-full text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
						<h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
							Join the Council
						</h2>
						<p className="text-sm text-muted-foreground">Enter your name to track your rankings</p>
					</div>
				)}

				<div className="w-full flex flex-col md:flex-row gap-6 items-center">
					{/* Avatar with glow */}
					<div className="relative shrink-0">
						<div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-xl animate-pulse" />
						<div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20 bg-muted">
							<img
								src={avatarSrc}
								alt="Profile"
								className="w-full h-full object-cover"
								onError={() => setAvatarSrc(CAT_IMAGES[0] ?? "")}
							/>
						</div>
					</div>

					{/* Content Section */}
					<div className="flex-1 w-full">
						{isEditing ? (
							<div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
								<div className="space-y-2">
									<label className="text-sm font-medium text-foreground/80 block">Your Name</label>
									<div className="relative">
										<User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/50" />
										<Input
											type="text"
											value={editedName}
											onChange={(e) => setEditedName(e.target.value)}
											placeholder="Who are you?"
											onKeyDown={(e) => e.key === "Enter" && handleSave()}
											className="w-full h-[50px] pl-12 pr-4 font-medium backdrop-blur-sm"
											autoFocus={!user.isLoggedIn}
										/>
									</div>
								</div>
								<div className="flex gap-3">
									{user.isLoggedIn && (
										<Button
											type="button"
											variant="ghost"
											onClick={() => setIsEditing(false)}
											className="flex-1"
										>
											Cancel
										</Button>
									)}
									<Button
										type="submit"
										variant="glass"
										size="xl"
										onClick={handleSave}
										disabled={!editedName.trim() || isSaving}
										loading={isSaving}
										className="flex-[2]"
									>
										{user.isLoggedIn ? "Save" : "Begin Journey"}
									</Button>
								</div>
							</div>
						) : (
							<div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
								<div className="flex items-center gap-3">
									<h3 className="text-2xl md:text-3xl font-bold text-foreground">{user.name}</h3>
									<button
										type="button"
										onClick={() => setIsEditing(true)}
										className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
										aria-label="Edit name"
									>
										<Pencil size={16} />
									</button>
								</div>
								<button
									type="button"
									onClick={handleLogout}
									className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors group"
								>
									<LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
									Logout
								</button>
							</div>
						)}
					</div>
				</div>

				{!isEditing && (
					<p className="w-full text-center text-sm text-muted-foreground font-medium">
						Your preferences are saved to track your cat name rankings.
					</p>
				)}
			</LiquidGlass>
		</Section>
	);
}
