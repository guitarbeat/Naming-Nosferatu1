/**
 * @module VirtualizedNameList
 * @description Virtualized list component for efficient rendering of large name lists
 */

import { useCallback, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import CatImage from "@/shared/components/layout/CatImage";
import { Check, Shuffle, X } from "@/shared/lib/icons";
import type { NameItem as TournamentNameItem } from "@/shared/types";

interface VirtualizedNameListProps {
	names: TournamentNameItem[];
	selectedNames: Set<string>;
	onToggleName: (nameId: string) => void;
	onClearSelection: () => void;
	onRandomSelection: (count: number) => void;
	searchTerm: string;
	itemHeight: number;
	height: number;
}

interface NameItemProps {
	index: number;
	style: React.CSSProperties;
	data: {
		names: TournamentNameItem[];
		selectedNames: Set<string>;
		onToggleName: (nameId: string) => void;
	};
}

const VirtualizedNameItem: React.FC<NameItemProps> = ({
	index,
	style,
	data,
}) => {
	const { names, selectedNames, onToggleName } = data;
	const name = names[index];
	const nameId = name ? String(name.id) : "";
	const isSelected = name ? selectedNames.has(nameId) : false;

	const handleToggle = useCallback(() => {
		if (name) {
			onToggleName(nameId);
		}
	}, [name, nameId, onToggleName]);

	if (!name) {
		return null;
	}

	return (
		<div
			style={style}
			className="flex items-center gap-3 p-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
			onClick={handleToggle}
		>
			<div className="flex-shrink-0">
				<CatImage
					name={name.name}
					src={getRandomCatImage()}
					alt={name.name}
					size="small"
					className="w-12 h-12 rounded-lg object-cover"
				/>
			</div>
			<div className="flex-1 min-w-0">
				<h3 className="font-semibold text-foreground truncate">{name.name}</h3>
				{name.description && (
					<p className="text-sm text-muted-foreground truncate">
						{name.description}
					</p>
				)}
			</div>
			<div className="flex items-center gap-2 flex-shrink-0">
				{name.avgRating && (
					<span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
						{Math.round(name.avgRating)}
					</span>
				)}
				<div
					className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
						isSelected
							? "bg-primary border-primary text-primary-foreground"
							: "border-muted-foreground hover:border-primary"
					}`}
				>
					{isSelected && <Check size={12} />}
				</div>
			</div>
		</div>
	);
};

// Helper function to get random cat image
function getRandomCatImage(): string {
	const images = [
		"https://images.unsplash.com/photo-1514888286974-6c03e2ca4dba?w=64&h=64&fit=crop&crop=faces",
		"https://images.unsplash.com/photo-1513245543132-31f50141621b?w=64&h=64&fit=crop&crop=faces",
		"https://images.unsplash.com/photo-1574158622682-e40e69881006?w=64&h=64&fit=crop&crop=faces",
		"https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=64&h=64&fit=crop&crop=faces",
	];
	return images[Math.floor(Math.random() * images.length)];
}

export const VirtualizedNameList: React.FC<VirtualizedNameListProps> = ({
	names,
	selectedNames,
	onToggleName,
	onClearSelection,
	onRandomSelection,
	searchTerm,
	itemHeight = 80,
	height = 600,
}) => {
	const itemData = useMemo(
		() => ({
			names,
			selectedNames,
			onToggleName,
		}),
		[names, selectedNames, onToggleName],
	);

	const handleClearSelection = useCallback(() => {
		onClearSelection();
	}, [onClearSelection]);

	const handleRandomSelection = useCallback(() => {
		const count = Math.min(8, Math.floor(names.length / 4));
		onRandomSelection(count);
	}, [names.length, onRandomSelection]);

	if (names.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-96 text-center">
				<p className="text-muted-foreground mb-4">No names found</p>
				{searchTerm && (
					<button
						onClick={handleClearSelection}
						className="text-primary hover:underline"
					>
						Clear search
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header with action buttons */}
			<div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
				<span className="text-sm text-muted-foreground">
					{names.length} names • {selectedNames.size} selected
				</span>
				<div className="flex items-center gap-2">
					{selectedNames.size > 0 && (
						<button
							onClick={handleClearSelection}
							className="flex items-center gap-1 px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
						>
							<X size={14} />
							Clear
						</button>
					)}
					<button
						onClick={handleRandomSelection}
						className="flex items-center gap-1 px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
					>
						<Shuffle size={14} />
						Random
					</button>
				</div>
			</div>

			{/* Virtualized list */}
			<List
				height={height}
				itemCount={names.length}
				itemSize={itemHeight}
				itemData={itemData}
				className="border border-border rounded-lg"
			>
				{VirtualizedNameItem}
			</List>
		</div>
	);
};

export default VirtualizedNameList;
