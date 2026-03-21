/**
 * @module ProfileSection
 * @description User profile management (Login, Name, Avatar).
 * Exports both a standalone Section wrapper and a bare inner component
 * for embedding in shared containers.
 */

import { useEffect, useRef, useState } from "react";
import { Button, Input, Section } from "@/shared/components/layout";
import { CAT_IMAGES } from "@/shared/lib/constants";
import { LogOut, Pencil, User } from "@/shared/lib/icons";
import useAppStore from "@/store/appStore";

interface ProfileSectionProps {
	onLogin: (name: string) => Promise<boolean | undefined>;
}

// ============================================================================
// INNER CONTENT (no wrapper — for embedding in a shared container)
// ============================================================================

export function ProfileInner({ onLogin }: ProfileSectionProps) {
	const { user, userActions } = useAppStore();
	const defaultAvatar = CAT_IMAGES[0] ?? "";
	const nameInputRef = useRef<HTMLInputElement | null>(null);
	const [editedName, setEditedName] = useState(user.name || "");
	const [isSaving, setIsSaving] = useState(false);
	const [isEditing, setIsEditing] = useState(!user.isLoggedIn);
	const [avatarSrc, setAvatarSrc] = useState(user.avatarUrl || defaultAvatar);
	const previousLoginStateRef = useRef(user.isLoggedIn);
	const previousEditingStateRef = useRef(isEditing);

	useEffect(() => {
		setEditedName(user.name || "");
		setAvatarSrc(user.avatarUrl || defaultAvatar);
	}, [defaultAvatar, user.name, user.avatarUrl]);

	useEffect(() => {
		const wasLoggedIn = previousLoginStateRef.current;
		if (!user.isLoggedIn) {
			setIsEditing(true);
		} else if (!wasLoggedIn) {
			setIsEditing(false);
		}
		previousLoginStateRef.current = user.isLoggedIn;
	}, [user.isLoggedIn]);

	useEffect(() => {
		const enteredEditingWhileLoggedIn =
			user.isLoggedIn && !previousEditingStateRef.current && isEditing;
		if (enteredEditingWhileLoggedIn) {
			nameInputRef.current?.focus();
		}
		previousEditingStateRef.current = isEditing;
	}, [isEditing, user.isLoggedIn]);

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
		<div className="flex flex-col gap-6 w-full">
			{/* Section Header - Only show when editing/logging in */}
			{isEditing && !user.isLoggedIn && (
				<div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
					<h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
						Join the Council
					</h2>
					<p className="text-sm text-muted-foreground">Enter your name to track your rankings</p>
				</div>
			)}

			<div className="flex flex-col md:flex-row gap-6 items-center">
				{/* Avatar with glow */}
				<div className="relative shrink-0">
					<div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-xl animate-pulse" />
					<div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/20 bg-muted">
						<img
							src={avatarSrc}
							alt="Profile"
							className="w-full h-full object-cover"
							onError={() => setAvatarSrc(defaultAvatar)}
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
										ref={nameInputRef}
										type="text"
										value={editedName}
										onChange={(e) => setEditedName(e.target.value)}
										placeholder="Who are you?"
										onKeyDown={(e) => e.key === "Enter" && handleSave()}
										className="w-full h-[50px] pl-12 pr-4 font-medium backdrop-blur-sm"
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
									variant="primary"
									size="xl"
									shape="pill"
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
								<Button
									type="button"
									onClick={() => setIsEditing(true)}
									variant="ghost"
									size="icon"
									iconOnly={true}
									shape="pill"
									className="size-8 bg-transparent text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
									aria-label="Edit name"
								>
									<Pencil size={16} />
								</Button>
							</div>
							<Button
								type="button"
								onClick={handleLogout}
								variant="ghost"
								shape="pill"
								className="group w-fit bg-transparent text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
								startIcon={
									<LogOut size={16} className="transition-transform group-hover:-translate-x-0.5" />
								}
							>
								Logout
							</Button>
						</div>
					)}
				</div>
			</div>

			{!isEditing && (
				<p className="text-center text-sm text-muted-foreground font-medium">
					Your preferences are saved to track your cat name rankings.
				</p>
			)}
		</div>
	);
}

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
