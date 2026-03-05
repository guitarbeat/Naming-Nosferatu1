import {
	DragDropContext,
	Draggable,
	type DraggableProvided,
	type DraggableStateSnapshot,
	Droppable,
	type DroppableProvided,
	type DropResult,
} from "@hello-pangea/dnd";
import { Button, CardBody, CardHeader, Chip, cn, Divider } from "@heroui/react";
import { motion } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";
import { ErrorManager } from "@/services/errorManager";
import { Card } from "@/shared/components/layout";
import { GripVertical, Loader2, Save } from "@/shared/lib/icons";
import type { NameItem } from "@/shared/types";

function haveRankingsChanged(newItems: NameItem[], oldRankings: NameItem[]): boolean {
	if (newItems.length !== oldRankings.length) {
		return true;
	}
	return newItems.some(
		(item, index) =>
			item.name !== oldRankings[index]?.name || item.rating !== oldRankings[index]?.rating,
	);
}

const RankingItemContent = memo(({ item, index }: { item: NameItem; index: number }) => (
	<div className="flex items-center gap-4 w-full">
		{/* Drag Handle */}
		<div className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing">
			<GripVertical size={20} />
		</div>

		{/* Rank Badge */}
		<Chip
			className="flex-shrink-0 bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 text-foreground font-bold min-w-[3rem]"
			size="lg"
			variant="flat"
		>
			#{index + 1}
		</Chip>

		{/* Name and Stats */}
		<div className="flex-1 min-w-0">
			<h3 className="text-lg font-semibold text-foreground truncate mb-1">{item.name}</h3>
			<div className="flex items-center gap-3 text-sm">
				<span className="text-muted-foreground">
					Rating:{" "}
					<span className="text-foreground/90 font-medium">
						{Math.round(item.rating as number)}
					</span>
				</span>
			</div>
		</div>
	</div>
));
RankingItemContent.displayName = "RankingItemContent";

export const RankingAdjustment = memo(
	({
		rankings,
		onSave,
		onCancel,
	}: {
		rankings: NameItem[];
		onSave: (items: NameItem[]) => Promise<void>;
		onCancel: () => void;
	}) => {
		const [items, setItems] = useState(rankings || []);
		const [saveStatus, setSaveStatus] = useState("");
		const [isDragging, setIsDragging] = useState(false);
		const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
		const isMountedRef = useRef(true);
		const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

		useEffect(() => {
			if (hasUnsavedChanges) {
				return;
			}
			const sorted = [...rankings].sort((a, b) => (b.rating as number) - (a.rating as number));
			if (haveRankingsChanged(sorted, items)) {
				setItems(sorted);
			}
		}, [rankings, hasUnsavedChanges, items]);

		useEffect(() => {
			isMountedRef.current = true;
			if (items && rankings && haveRankingsChanged(items, rankings)) {
				setSaveStatus("saving");
				if (saveTimerRef.current) {
					clearTimeout(saveTimerRef.current);
				}
				saveTimerRef.current = setTimeout(() => {
					onSave(items)
						.then(() => {
							if (!isMountedRef.current) {
								return;
							}
							setHasUnsavedChanges(false);
							setSaveStatus("success");
							setTimeout(() => {
								if (isMountedRef.current) {
									setSaveStatus("");
								}
							}, 2000);
						})
						.catch((e: unknown) => {
							if (!isMountedRef.current) {
								return;
							}
							setSaveStatus("error");
							ErrorManager.handleError(e, "Save Rankings");
						});
				}, 1000);
			}
			return () => {
				if (saveTimerRef.current) {
					clearTimeout(saveTimerRef.current);
				}
			};
		}, [items, rankings, onSave]);

		const handleDragEnd = (result: DropResult) => {
			setIsDragging(false);
			if (!result.destination) {
				return;
			}
			const newItems = Array.from(items);
			const [reordered] = newItems.splice(result.source.index, 1);
			if (reordered) {
				newItems.splice(result.destination.index, 0, reordered);
			}
			const adjusted = newItems.map((item: NameItem, index: number) => ({
				...item,
				rating: Math.round(1000 + (1000 * (newItems.length - index)) / newItems.length),
			}));
			setHasUnsavedChanges(true);
			setItems(adjusted);
		};

		return (
			<Card
				className={cn("w-full max-w-4xl mx-auto", isDragging && "ring-2 ring-primary/50")}
				variant="primary"
			>
				<CardHeader className="flex flex-col gap-3 pb-4">
					<div className="flex items-center justify-between w-full">
						<h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
							Your Cat Name Rankings
						</h2>
						{saveStatus && (
							<Chip
								className={cn(
									"transition-all duration-300",
									saveStatus === "saving" &&
										"bg-chart-5/20 border-chart-5/30 text-chart-5 animate-pulse",
									saveStatus === "success" && "bg-chart-2/20 border-chart-2/30 text-chart-2",
									saveStatus === "error" &&
										"bg-destructive/20 border-destructive/30 text-destructive",
								)}
								variant="flat"
								startContent={
									saveStatus === "saving" ? (
										<Loader2 size={14} className="animate-spin" />
									) : saveStatus === "success" ? (
										<Save size={14} />
									) : null
								}
							>
								{saveStatus === "saving"
									? "Saving..."
									: saveStatus === "success"
										? "Saved!"
										: "Error saving"}
							</Chip>
						)}
					</div>
					<p className="text-muted-foreground text-sm">
						Drag and drop to reorder your favorite cat names
					</p>
				</CardHeader>

				<Divider className="bg-border/10" />

				<CardBody className="gap-3 p-6">
					<DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd}>
						<Droppable droppableId="rankings">
							{(provided: DroppableProvided) => (
								<div
									{...provided.droppableProps}
									ref={provided.innerRef}
									className="flex flex-col gap-3"
								>
									{items.map((item: NameItem, index: number) => (
										<Draggable
											key={item.id || item.name}
											draggableId={String(item.id || item.name)}
											index={index}
										>
											{(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
												<div
													ref={provided.innerRef}
													{...provided.draggableProps}
													{...provided.dragHandleProps}
												>
													<motion.div
														initial={{ opacity: 0, y: 10 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, scale: 0.95 }}
														className={cn(
															"p-4 rounded-xl transition-all duration-200",
															"bg-gradient-to-br from-foreground/5 to-foreground/[0.02]",
															"border border-border/10",
															"hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10",
															snapshot.isDragging &&
																"shadow-2xl shadow-primary/30 border-primary/50 scale-105 rotate-2",
														)}
													>
														<RankingItemContent item={item} index={index} />
													</motion.div>
												</div>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</div>
							)}
						</Droppable>
					</DragDropContext>
				</CardBody>

				<Divider className="bg-border/10" />

				<div className="p-6 flex justify-end">
					<Button
						onClick={onCancel}
						variant="flat"
						className="bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border/10"
					>
						Back to Tournament
					</Button>
				</div>
			</Card>
		);
	},
);
RankingAdjustment.displayName = "RankingAdjustment";
