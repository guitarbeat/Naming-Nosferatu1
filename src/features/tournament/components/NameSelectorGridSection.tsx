import { motion } from "framer-motion";
import Button from "@/shared/components/layout/Button";
import CatImage from "@/shared/components/layout/CatImage";
import { CollapsibleContent } from "@/shared/components/layout/CollapsibleHeader";
import { getRandomCatImage } from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import {
	Check,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Eye,
	EyeOff,
	ZoomIn,
} from "@/shared/lib/icons";
import type { IdType, NameItem } from "@/shared/types";
import type { AdminActionRequest } from "./NameSelectorSwipeSection";

interface HiddenPanelController {
	isCollapsed: boolean;
	collapse: () => void;
	expand: () => void;
}

interface NameSelectorGridSectionProps {
	names: NameItem[];
	selectedNames: Set<IdType>;
	isSwipeMode: boolean;
	isAdmin: boolean;
	hiddenPanel: HiddenPanelController;
	hiddenQuery: string;
	setHiddenQuery: (value: string) => void;
	hiddenShowSelectedOnly: boolean;
	setHiddenShowSelectedOnly: (next: boolean) => void;
	hiddenRenderCount: number;
	setHiddenRenderCount: (next: number | ((value: number) => number)) => void;
	hiddenNamesAll: NameItem[];
	hiddenFiltered: NameItem[];
	previewItems: NameItem[];
	renderItems: NameItem[];
	catImageById: Map<IdType, string>;
	togglingHidden: Set<IdType>;
	togglingLocked: Set<IdType>;
	handleToggleName: (nameId: IdType) => void;
	handleOpenLightbox: (nameId: IdType) => void;
	requestAdminAction: (action: AdminActionRequest) => void;
}

export function NameSelectorGridSection({
	names,
	selectedNames,
	isSwipeMode,
	isAdmin,
	hiddenPanel,
	hiddenQuery,
	setHiddenQuery,
	hiddenShowSelectedOnly,
	setHiddenShowSelectedOnly,
	hiddenRenderCount,
	setHiddenRenderCount,
	hiddenNamesAll,
	hiddenFiltered,
	previewItems,
	renderItems,
	catImageById,
	togglingHidden,
	togglingLocked,
	handleToggleName,
	handleOpenLightbox,
	requestAdminAction,
}: NameSelectorGridSectionProps) {
	const activeNames = names.filter((name) => !(name.lockedIn || name.locked_in) && !name.isHidden);

	return (
		<div className="space-y-8">
			{activeNames.length > 0 && (
				<div className="grid grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
					{activeNames.map((nameItem) => {
						const isSelected = selectedNames.has(nameItem.id);
						const catImage =
							catImageById.get(nameItem.id) ?? getRandomCatImage(nameItem.id, CAT_IMAGES);
						return (
							<motion.div
								key={nameItem.id}
								onClick={() => handleToggleName(nameItem.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleToggleName(nameItem.id);
									}
								}}
								role="button"
								tabIndex={0}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								transition={{ type: "spring", stiffness: 400, damping: 25 }}
								className={`mobile-readable-card name-grid-card relative rounded-xl sm:rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300 ${
									isSelected
										? "name-grid-card--selected border-primary/70 bg-primary/15 shadow-[0_18px_40px_rgba(34,197,94,0.26)] ring-2 ring-primary/45"
										: "border-white/15 bg-slate-950/45 hover:border-white/35 hover:bg-slate-900/55 shadow-[0_12px_28px_rgba(2,6,23,0.5)]"
								} ${nameItem.lockedIn || nameItem.locked_in ? "opacity-75" : ""}`}
							>
								<div className="name-grid-card__media w-full relative aspect-[5/4] sm:aspect-[4/3] group/img">
									<CatImage
										src={catImage}
										alt={nameItem.name}
										objectFit="cover"
										containerClassName="w-full h-full"
										imageClassName="name-grid-card__image w-full h-full object-cover transition-transform duration-500"
									/>

									<div className="name-grid-card__overlay absolute inset-x-0 bottom-0 p-2 sm:p-3 flex flex-col justify-end pointer-events-none">
										<div className="flex flex-col gap-0.5">
											<div className="flex items-center justify-between gap-2">
												<span className="mobile-readable-title font-whimsical font-black text-white text-[13px] sm:text-base leading-tight tracking-[0.01em] drop-shadow-md truncate">
													{nameItem.name}
												</span>
												{isSelected && (
													<motion.div
														initial={{ scale: 0, opacity: 0 }}
														animate={{ scale: 1, opacity: 1 }}
														className="shrink-0 size-5 bg-primary rounded-full flex items-center justify-center shadow-lg"
													>
														<Check size={12} className="text-white" />
													</motion.div>
												)}
											</div>
											{nameItem.pronunciation && (
												<span className="mobile-readable-meta text-amber-200 text-[11px] sm:text-sm leading-tight font-bold italic opacity-95 drop-shadow-md truncate">
													[{nameItem.pronunciation}]
												</span>
											)}
											{nameItem.description && (
												<p className="mobile-readable-description text-white/90 text-[11px] sm:text-sm leading-snug line-clamp-2 sm:line-clamp-3 mt-1 drop-shadow-sm">
													{nameItem.description}
												</p>
											)}
										</div>
									</div>

									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											handleOpenLightbox(nameItem.id);
										}}
										className="name-grid-card__zoom absolute top-1.5 right-1.5 p-1.5 sm:top-2 sm:right-2 sm:p-2 rounded-full bg-black/65 backdrop-blur-sm text-white opacity-100 md:opacity-0 md:group-hover/img:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none transition-opacity hover:bg-black/85 z-10"
										aria-label="View full size"
									>
										<ZoomIn size={14} />
									</button>
								</div>
								{isAdmin && !isSwipeMode && (
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.1 }}
										className="px-3 pb-3 flex gap-2"
									>
										<motion.button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												requestAdminAction({
													type: "toggle-hidden",
													nameId: nameItem.id,
													isCurrentlyEnabled: nameItem.isHidden || false,
												});
											}}
											disabled={togglingHidden.has(nameItem.id)}
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											transition={{ type: "spring", stiffness: 400, damping: 25 }}
											className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
												nameItem.isHidden
													? "bg-green-600 hover:bg-green-700 text-white shadow-green-500/25"
													: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/25"
											} ${togglingHidden.has(nameItem.id) ? "opacity-50 cursor-not-allowed" : ""} shadow-lg`}
										>
											{togglingHidden.has(nameItem.id) ? (
												<div className="flex items-center justify-center gap-1">
													<div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
													<span>Processing...</span>
												</div>
											) : nameItem.isHidden ? (
												<>
													<Eye size={12} className="mr-1" />
													Unhide
												</>
											) : (
												<>
													<EyeOff size={12} className="mr-1" />
													Hide
												</>
											)}
										</motion.button>

										<motion.button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												requestAdminAction({
													type: "toggle-locked",
													nameId: nameItem.id,
													isCurrentlyEnabled: nameItem.lockedIn || nameItem.locked_in || false,
												});
											}}
											disabled={togglingLocked.has(nameItem.id)}
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											transition={{ type: "spring", stiffness: 400, damping: 25 }}
											className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
												nameItem.lockedIn || nameItem.locked_in
													? "bg-gray-600 hover:bg-gray-700 text-white shadow-gray-500/25"
													: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25"
											} ${togglingLocked.has(nameItem.id) ? "opacity-50 cursor-not-allowed" : ""} shadow-lg`}
										>
											{togglingLocked.has(nameItem.id) ? (
												<div className="flex items-center justify-center gap-1">
													<div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
													<span>Processing...</span>
												</div>
											) : nameItem.lockedIn || nameItem.locked_in ? (
												<>
													<CheckCircle size={12} className="mr-1" />
													Unlock
												</>
											) : (
												<>
													<CheckCircle size={12} className="mr-1" />
													Lock
												</>
											)}
										</motion.button>
									</motion.div>
								)}
							</motion.div>
						);
					})}
				</div>
			)}

			{hiddenNamesAll.length > 0 &&
				(isSwipeMode ? (
					<div className="mt-6 text-center text-muted-foreground text-sm">
						Hidden names available in Grid mode
					</div>
				) : (
					<div className="mt-6">
						<div className="select-none">
							<button
								type="button"
								onClick={() => {
									if (!hiddenPanel.isCollapsed) {
										hiddenPanel.collapse();
										return;
									}
									hiddenPanel.expand();
									setHiddenRenderCount(24);
								}}
								aria-expanded={hiddenPanel.isCollapsed ? "false" : "true"}
								aria-controls="hidden-names-panel"
								className="w-full flex flex-wrap items-center justify-between gap-2 sm:gap-3"
							>
								<div className="flex items-center gap-2">
									<span className="text-muted-foreground">
										{hiddenPanel.isCollapsed ? (
											<ChevronRight size={20} />
										) : (
											<ChevronDown size={20} />
										)}
									</span>
									<span className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-tighter">
										Hidden Names ({hiddenNamesAll.length})
									</span>
								</div>
								<span className="text-[11px] sm:text-xs text-muted-foreground">
									{hiddenPanel.isCollapsed ? "Click to expand" : "Click to collapse"}
								</span>
							</button>

							{hiddenPanel.isCollapsed && (
								<div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
									{previewItems.map((n) => {
										const img = catImageById.get(n.id) ?? getRandomCatImage(n.id, CAT_IMAGES);
										return (
											<div
												key={n.id}
												className="relative aspect-square overflow-hidden border border-border/10"
											>
												<CatImage
													src={img}
													alt="Hidden name"
													containerClassName="w-full h-full"
													imageClassName="w-full h-full object-cover opacity-20"
												/>
												<div className="absolute inset-0 flex items-center justify-center">
													<span className="text-muted-foreground/50 text-sm font-bold">?</span>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						<CollapsibleContent id="hidden-names-panel" isCollapsed={hiddenPanel.isCollapsed}>
							<div className="mt-4">
								<div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
									<input
										value={hiddenQuery}
										onChange={(e) => {
											setHiddenQuery(e.target.value);
											setHiddenRenderCount(24);
										}}
										placeholder="Search hidden names"
										className="w-full sm:max-w-sm px-3 py-2 bg-foreground/5 border border-border/10 text-foreground text-sm"
									/>
									<div className="flex items-center justify-between sm:justify-end gap-3">
										{hiddenQuery.trim().length > 0 && (
											<button
												type="button"
												onClick={() => {
													setHiddenQuery("");
													setHiddenRenderCount(24);
												}}
												className="px-3 py-2 border border-border/10 bg-foreground/5 text-xs text-foreground/80 hover:bg-foreground/10"
											>
												Clear search
											</button>
										)}
										<button
											type="button"
											onClick={() => setHiddenShowSelectedOnly(!hiddenShowSelectedOnly)}
											className={`px-3 py-2 border text-xs font-medium ${
												hiddenShowSelectedOnly
													? "bg-primary/20 border-primary/40 text-foreground"
													: "bg-foreground/5 border-border/10 text-foreground/80"
											}`}
										>
											Selected only
										</button>
										<span className="text-xs text-muted-foreground">
											{hiddenFiltered.length} / {hiddenNamesAll.length}
										</span>
									</div>
								</div>

								<div className="grid grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-4 gap-3">
									{renderItems.map((nameItem) => {
										const isSelected = selectedNames.has(nameItem.id);
										const catImage =
											catImageById.get(nameItem.id) ?? getRandomCatImage(nameItem.id, CAT_IMAGES);
										return (
											<div
												key={nameItem.id}
												onClick={() => handleToggleName(nameItem.id)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														handleToggleName(nameItem.id);
													}
												}}
												role="button"
												tabIndex={0}
												className={`mobile-readable-card name-grid-card relative rounded-xl sm:rounded-2xl border-2 transition-all overflow-hidden group transform hover:scale-105 active:scale-95 cursor-pointer ${
													isSelected
														? "name-grid-card--selected border-primary/70 bg-primary/15 shadow-[0_18px_40px_rgba(34,197,94,0.26)] ring-2 ring-primary/45"
														: "border-white/15 bg-slate-950/45 hover:border-white/35 hover:bg-slate-900/55 shadow-[0_12px_28px_rgba(2,6,23,0.5)]"
												}`}
											>
												<div className="name-grid-card__media aspect-[5/4] sm:aspect-[4/3] w-full relative group/hidden">
													<CatImage
														src={catImage}
														alt={nameItem.name}
														objectFit="cover"
														containerClassName="w-full h-full"
														imageClassName="name-grid-card__image w-full h-full object-cover transition-transform duration-500"
													/>

													<div className="name-grid-card__overlay absolute inset-x-0 bottom-0 p-2 sm:p-3 flex flex-col justify-end pointer-events-none">
														<div className="flex flex-col gap-0.5">
															<div className="flex items-center justify-between gap-2">
																<span className="mobile-readable-title font-whimsical font-black text-white text-[13px] sm:text-base leading-tight tracking-[0.01em] drop-shadow-md truncate">
																	{nameItem.name}
																</span>
																{isSelected && (
																	<motion.div
																		initial={{ scale: 0, opacity: 0 }}
																		animate={{ scale: 1, opacity: 1 }}
																		className="shrink-0 size-4 bg-primary rounded-full flex items-center justify-center shadow-md"
																	>
																		<Check size={10} className="text-white" />
																	</motion.div>
																)}
															</div>
															{nameItem.pronunciation && (
																<span className="mobile-readable-meta text-amber-200 text-[11px] sm:text-sm leading-tight font-bold italic opacity-95 drop-shadow-md truncate">
																	[{nameItem.pronunciation}]
																</span>
															)}
															{nameItem.description && (
																<p className="mobile-readable-description text-white/90 text-[11px] sm:text-sm leading-snug line-clamp-2 sm:line-clamp-3 mt-1 drop-shadow-sm">
																	{nameItem.description}
																</p>
															)}
														</div>
													</div>

													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleOpenLightbox(nameItem.id);
														}}
														className="name-grid-card__zoom absolute top-1.5 right-1.5 p-1.5 sm:top-2 sm:right-2 sm:p-2 rounded-full bg-black/65 backdrop-blur-sm text-white opacity-100 md:opacity-0 md:group-hover/hidden:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none transition-opacity hover:bg-black/85 z-10"
														aria-label="View full size"
													>
														<ZoomIn size={14} />
													</button>
												</div>
												{isAdmin && (
													<div className="px-3 pb-3">
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																requestAdminAction({
																	type: "toggle-hidden",
																	nameId: nameItem.id,
																	isCurrentlyEnabled: true,
																});
															}}
															disabled={togglingHidden.has(nameItem.id)}
															className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-green-600 hover:bg-green-700 text-white ${
																togglingHidden.has(nameItem.id)
																	? "opacity-50 cursor-not-allowed"
																	: ""
															}`}
														>
															{togglingHidden.has(nameItem.id) ? (
																<div className="flex items-center justify-center gap-1">
																	<div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
																	<span>Processing...</span>
																</div>
															) : (
																<>
																	<Eye size={12} className="mr-1 inline" />
																	Unhide
																</>
															)}
														</button>
													</div>
												)}
											</div>
										);
									})}
								</div>
								{hiddenFiltered.length === 0 && (
									<div className="mt-4 rounded-xl border border-border/10 bg-foreground/5 px-4 py-6 text-center text-sm text-foreground/70">
										No hidden names match this filter.
									</div>
								)}

								{hiddenFiltered.length > hiddenRenderCount && (
									<div className="mt-4 flex justify-center">
										<Button
											onClick={() => setHiddenRenderCount((c) => c + 24)}
											variant="glass"
											size="small"
										>
											Load more
										</Button>
									</div>
								)}
							</div>
						</CollapsibleContent>
					</div>
				))}
		</div>
	);
}
