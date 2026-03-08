/**
 * @module NameGridItem
 * @description Individual grid item card component for name selection.
 * Extracted from NameGrid to reduce component size.
 */

import { motion } from "framer-motion";
import { memo, useCallback, useMemo } from "react";
import { getRandomCatImage } from "@/services/tournament";
import { CardName } from "@/shared/components/layout/Card";
import { cn, isNameHidden } from "@/shared/lib/basic";
import type { NameItem } from "@/shared/types";

interface NameGridItemProps {
	nameObj: NameItem;
	isSelected: boolean;
	onToggleName?: (name: NameItem) => void;
	isAdmin: boolean;
	showCatPictures: boolean;
	imageList: string[];
	onToggleVisibility?: (id: string | number) => void;
	onDelete?: (name: NameItem) => void;
	onImageClick: (image: string) => void;
	index: number;
}

export const NameGridItem = memo(function NameGridItem({
	nameObj,
	isSelected,
	onToggleName,
	isAdmin,
	showCatPictures,
	imageList,
	onToggleVisibility,
	onDelete,
	onImageClick,
	index,
}: NameGridItemProps) {
	const nameId = nameObj.id as string | number;
	const isHidden = isNameHidden(nameObj);

	// Deterministic image selection
	const cardImage = useMemo(() => {
		if (!nameObj || !showCatPictures || !imageList.length) {
			return undefined;
		}
		return getRandomCatImage(nameObj.id, imageList);
	}, [nameObj, showCatPictures, imageList]);

	const handleCardClick = useCallback(() => {
		if (cardImage) {
			onImageClick(cardImage);
		}
	}, [cardImage, onImageClick]);

	return (
		<motion.div
			className="w-full h-full"
			initial={index < 12 ? { opacity: 0, y: 10 } : false}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.25,
				delay: index < 12 ? Math.min(index * 0.02, 0.3) : 0,
			}}
		>
			<CardName
				name={nameObj.name || ""}
				description={nameObj.description}
				pronunciation={
					typeof nameObj.pronunciation === "string" ? nameObj.pronunciation : undefined
				}
				isSelected={isSelected}
				onClick={() => onToggleName?.(nameObj)}
				image={cardImage}
				onImageClick={cardImage ? handleCardClick : undefined}
				metadata={
					isAdmin
						? {
								rating: nameObj.avg_rating || 1500,
								popularity: nameObj.popularity_score,
							}
						: undefined
				}
				className={cn(isHidden && "opacity-50 grayscale")}
				isAdmin={isAdmin}
				isHidden={isHidden}
				_onToggleVisibility={isAdmin ? () => onToggleVisibility?.(nameId) : undefined}
				_onDelete={isAdmin ? () => onDelete?.(nameObj) : undefined}
				onSelectionChange={undefined}
				size="medium"
			/>
		</motion.div>
	);
});
