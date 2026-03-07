import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Button from "@/shared/components/layout/Button";
import { Card } from "@/shared/components/layout/Card";
import CatImage from "@/shared/components/layout/CatImage";
import { getRandomCatImage } from "@/shared/lib/basic";
import { CAT_IMAGES } from "@/shared/lib/constants";
import { Check, Eye, EyeOff, Heart, X, ZoomIn } from "@/shared/lib/icons";
import type { IdType, NameItem } from "@/shared/types";

const SMOOTH_SPRING_CONFIG = {
	type: "spring" as const,
	stiffness: 260,
	damping: 20,
	mass: 0.8,
	velocity: 2,
};

const EXIT_SPRING_CONFIG = {
	type: "spring" as const,
	stiffness: 400,
	damping: 25,
	velocity: 50,
};

export type AdminActionRequest = {
	type: "toggle-hidden" | "toggle-locked";
	nameId: IdType;
	isCurrentlyEnabled: boolean;
};

interface NameSelectorSwipeSectionProps {
	visibleCards: NameItem[];
	cardsToRender: NameItem[];
	dragDirection: "left" | "right" | null;
	dragOffset: number;
	selectedNames: Set<IdType>;
	catImageById: Map<IdType, string>;
	isAdmin: boolean;
	togglingHidden: Set<IdType>;
	requestAdminAction: (action: AdminActionRequest) => void;
	handleOpenLightbox: (nameId: IdType) => void;
	updateDragState: (offset: number, direction?: "left" | "right" | null) => void;
	handleDragEnd: (nameId: IdType, info: PanInfo) => void;
	handleSwipe: (nameId: IdType, direction: "left" | "right") => void;
}

export function NameSelectorSwipeSection({
	visibleCards,
	cardsToRender,
	dragDirection,
	dragOffset,
	selectedNames,
	catImageById,
	isAdmin,
	togglingHidden,
	requestAdminAction,
	handleOpenLightbox,
	updateDragState,
	handleDragEnd,
	handleSwipe,
}: NameSelectorSwipeSectionProps) {
	return (
		<>
			<div
				className="relative w-full flex items-center justify-center"
				style={{ minHeight: "600px" }}
			>
				<AnimatePresence mode="popLayout">
					{visibleCards.length > 0 ? (
						cardsToRender.map((nameItem, index) => {
							const catImage =
								catImageById.get(nameItem.id) ?? getRandomCatImage(nameItem.id, CAT_IMAGES);
							return (
								<motion.div
									key={nameItem.id}
									layout={true}
									layoutId={String(nameItem.id)}
									className="absolute inset-0 flex items-center justify-center"
									style={{ zIndex: 10 - index }}
									exit={{
										opacity: 0,
										x: dragDirection === "right" ? 400 : -400,
										rotate: dragDirection === "right" ? 25 : -25,
										scale: 0.8,
										transition: EXIT_SPRING_CONFIG,
									}}
								>
									<motion.div
										drag={index === 0 ? "x" : false}
										dragConstraints={{ left: -250, right: 250 }}
										onDrag={(_, info) => {
											if (index === 0) {
												updateDragState(info.offset.x);
											}
										}}
										onDragEnd={(_, info) => {
											if (index === 0) {
												handleDragEnd(nameItem.id, info);
											}
										}}
										animate={{
											scale: index === 0 ? 1 : 0.95,
											opacity: 1,
											rotate: index === 0 ? dragOffset / 30 : 0,
											x: index === 0 ? dragOffset * 0.15 : 0,
											y: index * 8,
										}}
										transition={SMOOTH_SPRING_CONFIG}
										whileDrag={{
											scale: 1.02,
											transition: { duration: 0.15 },
										}}
										className="w-full max-w-md h-[550px]"
									>
										<Card
											className={`name-swipe-card relative overflow-hidden group transition-all duration-200 h-full ${
												selectedNames.has(nameItem.id)
													? "ring-2 ring-primary/45 shadow-[0_0_35px_rgba(34,197,94,0.28)]"
													: ""
											} ${
												index === 0
													? "cursor-grab active:cursor-grabbing shadow-2xl active:scale-95"
													: "pointer-events-none"
											}`}
											variant="filled"
											padding="none"
										>
											{index === 0 && (
												<>
													<motion.div
														className="absolute left-8 top-1/2 -translate-y-1/2 z-20"
														initial={{ opacity: 0, scale: 0.8 }}
														animate={{
															opacity: dragOffset < -50 ? 1 : 0,
															scale: dragOffset < -50 ? 1 : 0.8,
														}}
													>
														<div className="flex items-center gap-2 px-6 py-3 bg-red-500/90 backdrop-blur-md rounded-full border-2 border-red-500 shadow-lg rotate-[-20deg]">
															<X size={24} className="text-white" />
															<span className="text-white font-black text-lg uppercase">Nope</span>
														</div>
													</motion.div>

													<motion.div
														className="absolute right-8 top-1/2 -translate-y-1/2 z-20"
														initial={{ opacity: 0, scale: 0.8 }}
														animate={{
															opacity: dragOffset > 50 ? 1 : 0,
															scale: dragOffset > 50 ? 1 : 0.8,
														}}
													>
														<div className="flex items-center gap-2 px-6 py-3 bg-green-500/90 backdrop-blur-md rounded-full border-2 border-green-500 shadow-lg rotate-[20deg]">
															<Heart size={24} className="text-white fill-white" />
															<span className="text-white font-black text-lg uppercase">Like</span>
														</div>
													</motion.div>
												</>
											)}

											<div className="relative w-full h-full flex flex-col justify-end bg-slate-950/25">
												<CatImage
													src={catImage}
													alt={nameItem.name}
													objectFit="cover"
													containerClassName="absolute inset-0 w-full h-full"
													imageClassName="name-swipe-card__image w-full h-full object-cover opacity-95 transition-transform duration-700"
												/>

												{index === 0 && (
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleOpenLightbox(nameItem.id);
														}}
														className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none transition-opacity hover:bg-black/70 z-30"
														aria-label="View full size"
													>
														<ZoomIn size={18} />
													</button>
												)}

												<div className="name-swipe-card__overlay relative z-10 p-8 flex flex-col justify-end pointer-events-none">
													<h3 className="font-whimsical text-4xl lg:text-5xl text-white tracking-wide drop-shadow-2xl break-words w-full">
														{nameItem.name}
														{nameItem.pronunciation && (
															<span className="ml-3 text-amber-400 text-2xl lg:text-3xl font-bold italic opacity-90">
																[{nameItem.pronunciation}]
															</span>
														)}
													</h3>
													{nameItem.description && (
														<p className="text-white/85 text-sm md:text-base leading-relaxed max-w-md mt-3 drop-shadow-sm line-clamp-3">
															{nameItem.description}
														</p>
													)}

													{isAdmin && (
														<button
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
															className={`mt-4 flex items-center gap-2 pointer-events-auto w-fit text-sm font-bold tracking-wider uppercase transition-all ${
																togglingHidden.has(nameItem.id)
																	? "text-slate-500 cursor-not-allowed"
																	: "text-amber-400 hover:text-amber-300 hover:scale-105 active:scale-95"
															}`}
														>
															{togglingHidden.has(nameItem.id) ? (
																<>
																	<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
																	<span>Processing...</span>
																</>
															) : nameItem.isHidden ? (
																<>
																	<Eye size={16} />
																	<span>Unhide From Public</span>
																</>
															) : (
																<>
																	<EyeOff size={16} />
																	<span>Hide From Public</span>
																</>
															)}
														</button>
													)}

													{selectedNames.has(nameItem.id) && (
														<div className="flex mt-4">
															<div className="px-4 py-1.5 bg-green-500/30 backdrop-blur-md border border-green-500/40 rounded-full flex items-center gap-2 shadow-lg shadow-green-500/20">
																<Check size={16} className="text-green-400" />
																<span className="text-green-400 font-black text-xs tracking-[0.2em] uppercase">
																	Selected
																</span>
															</div>
														</div>
													)}
												</div>
											</div>
										</Card>
									</motion.div>
								</motion.div>
							);
						})
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="text-center space-y-4">
								<p className="text-2xl font-bold text-foreground">All done!</p>
								<p className="text-muted-foreground">You've reviewed all names. Ready to start?</p>
							</div>
						</div>
					)}
				</AnimatePresence>
			</div>

			{visibleCards.length > 0 && (
				<div className="flex items-center justify-center gap-8 mt-8 pb-4">
					<Button
						variant="outline"
						iconOnly={true}
						className="h-16 w-16 rounded-full border-2 border-red-500/20 hover:bg-red-500/10 hover:border-red-500 text-red-500 transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-110 active:scale-95"
						onClick={() => {
							const currentCard = visibleCards[0];
							if (currentCard) {
								handleSwipe(currentCard.id, "left");
							}
						}}
						aria-label="Skip (Left Arrow)"
						title="Skip (Left Arrow)"
					>
						<X size={32} />
					</Button>

					<Button
						variant="outline"
						iconOnly={true}
						className="h-16 w-16 rounded-full border-2 border-green-500/20 hover:bg-green-500/10 hover:border-green-500 text-green-500 transition-all duration-300 shadow-lg hover:shadow-green-500/25 hover:scale-110 active:scale-95"
						onClick={() => {
							const currentCard = visibleCards[0];
							if (currentCard) {
								handleSwipe(currentCard.id, "right");
							}
						}}
						aria-label="Select (Right Arrow)"
						title="Select (Right Arrow)"
					>
						<Heart size={32} />
					</Button>
				</div>
			)}
		</>
	);
}
