/**
 * @module NameGrid
 * @description Responsive Grid of name cards using CSS Grid.
 * Simplified from masonry layout for stability and performance.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMasonryLayout } from "@/hooks/useMasonryLayout";
import { EmptyState, Lightbox, Loading } from "@/shared/components/layout";
import {
	applyNameFilters,
	cn,
	mapFilterStatusToVisibility,
	selectedNamesToSet,
} from "@/shared/lib/basic";
import type { NameItem } from "@/shared/types";
import { NameGridItem } from "./NameGridItem";
import { NameUploadForm } from "./NameUploadForm";

interface NameGridProps {
	names: NameItem[];
	selectedNames?: NameItem[] | Set<string | number>;
	onToggleName?: (name: NameItem) => void;
	filters?: {
		category?: string;
		filterStatus?: "visible" | "hidden" | "all";
	};
	isAdmin?: boolean;
	showSelectedOnly?: boolean;
	showCatPictures?: boolean;
	onNamesUpdate?: (updater: NameItem[] | ((prev: NameItem[]) => NameItem[])) => void;
	imageList?: string[];
	onToggleVisibility?: (id: string | number) => void;
	onDelete?: (name: NameItem) => void;
	isLoading?: boolean;
	className?: string;
}

export function NameGrid({
	names = [],
	selectedNames = [],
	onToggleName,
	filters = {},
	isAdmin = false,
	showSelectedOnly = false,
	showCatPictures = false,
	imageList = [],
	onToggleVisibility,
	onDelete,
	isLoading = false,
	className = "",
}: NameGridProps) {
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const [suppImages, setSuppImages] = useState<string[]>([]);

	// Merge provided imageList with any newly uploaded images
	const finalImageList = useMemo(() => {
		const base = Array.isArray(imageList) ? imageList : [];
		return [...suppImages, ...base];
	}, [suppImages, imageList]);

	const handleImageClick = useCallback(
		(imageUrl: string) => {
			const idx = finalImageList.indexOf(imageUrl);
			if (idx !== -1) {
				setLightboxIndex(idx);
			}
		},
		[finalImageList],
	);

	const selectedSet = useMemo(
		() => selectedNamesToSet(selectedNames as NameItem[] | Set<string | number>),
		[selectedNames],
	);

	const processedNames = useMemo(() => {
		const visibility = mapFilterStatusToVisibility(filters.filterStatus || "visible");

		let result = applyNameFilters(names, {
			visibility,
			isAdmin,
		});

		if (showSelectedOnly && selectedSet.size > 0) {
			result = result.filter((name) => {
				const nameId = name.id as string | number;
				return selectedSet.has(nameId);
			});
		}

		return result;
	}, [names, filters.filterStatus, isAdmin, showSelectedOnly, selectedSet]);

	const { containerRef, setItemRef, positions, totalHeight, columnWidth, recalculate } =
		useMasonryLayout<HTMLDivElement>(processedNames.length, {
			minColumnWidth: 280,
			gap: 16,
		});

	// Manually trigger layout recalculation when processedNames changes
	// to ensure correct positioning after filtering or sorting
	// biome-ignore lint/correctness/useExhaustiveDependencies: We want to trigger when processedNames changes
	useEffect(() => {
		recalculate();
	}, [processedNames, recalculate]);

	if (isLoading) {
		return (
			<div className={cn("relative w-full mx-auto p-4 md:p-6 min-h-[50vh]", className)}>
				<div className="relative w-full max-w-[95%] mx-auto grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={`skeleton-${i}`} className="w-full h-40">
							<Loading variant="card-skeleton" cardSkeletonVariant="mosaic-card" size="medium" />
						</div>
					))}
					<div className="col-span-full flex justify-center py-8">
						<Loading
							variant="cat"
							catVariant="paw"
							catColor="neon"
							text="Loading cat names..."
							size="small"
						/>
					</div>
				</div>
			</div>
		);
	}

	if (processedNames.length === 0) {
		return (
			<div className={cn("relative w-full mx-auto p-4 md:p-6 min-h-[50vh]", className)}>
				<EmptyState
					title="No names found"
					description={
						showSelectedOnly
							? "You haven't selected any names yet. Switch back to browse mode to pick some favorites!"
							: "No names match your search or filters. Try adjusting your filters or search terms to find what you're looking for."
					}
					icon={showSelectedOnly ? "🕸️" : "🔍"}
				/>
			</div>
		);
	}

	return (
		<div className={cn("relative w-full mx-auto p-4 md:p-6", className)}>
			<div
				className="relative w-full max-w-[95%] mx-auto transition-height duration-300"
				role="list"
				ref={containerRef}
				style={{ height: totalHeight || "auto", position: "relative" }}
			>
				{processedNames.map((name, index) => {
					const isSelected = selectedSet.has(name.id as string | number);
					const position = positions[index];

					return (
						<div
							key={name.id}
							className="absolute top-0 left-0"
							ref={setItemRef(index)}
							style={{
								position: "absolute",
								top: position?.top || 0,
								left: position?.left || 0,
								width: columnWidth || 280,
								transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
							}}
						>
							<NameGridItem
								nameObj={name}
								isSelected={isSelected}
								onToggleName={onToggleName}
								isAdmin={isAdmin}
								showCatPictures={showCatPictures}
								imageList={finalImageList}
								onToggleVisibility={onToggleVisibility}
								onDelete={onDelete}
								onImageClick={handleImageClick}
								index={index}
							/>
						</div>
					);
				})}
			</div>

			{/* Admin Image Upload */}
			<NameUploadForm
				isAdmin={isAdmin}
				onImagesUploaded={(uploaded) => setSuppImages((prev) => [...uploaded, ...prev])}
			/>

			{lightboxIndex !== null && (
				<Lightbox
					images={finalImageList}
					currentIndex={lightboxIndex}
					onClose={() => setLightboxIndex(null)}
					onNavigate={setLightboxIndex}
				/>
			)}
		</div>
	);
}
