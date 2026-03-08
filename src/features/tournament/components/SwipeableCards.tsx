import { Button, Chip, cn, Progress } from "@heroui/react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRandomCatImage } from "@/services/tournament";
import { Card } from "@/shared/components/layout/Card";
import { playSound } from "@/shared/lib/basic";
import { Check, ChevronLeft, ChevronRight, Heart, X } from "@/shared/lib/icons";
import type { NameItem } from "@/shared/types";

export const SwipeableCards = memo(
        ({
                names,
                selectedNames,
                onToggleName,
                showCatPictures,
                imageList = [],
                onStartTournament,
        }: {
                names: NameItem[];
                selectedNames: NameItem[];
                onToggleName: (name: NameItem) => void;
                showCatPictures: boolean;
                imageList?: string[];
                onStartTournament: (names: NameItem[]) => void;
        }) => {
                const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
                const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(null);
                const [dragOffset, setDragOffset] = useState(0);
                const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

                const visibleCards = useMemo(
                        () => names.filter((n: NameItem) => !swipedIds.has(String(n.id))),
                        [names, swipedIds],
                );
                const cardsToRender = visibleCards.slice(0, 3);
                const currentCard = cardsToRender[0];
                const isSelected = useCallback(
                        (n: NameItem) => selectedNames.some((s: NameItem) => s.id === n.id),
                        [selectedNames],
                );
                const resetDragState = useCallback(() => {
                        if (resetTimerRef.current) {
                                clearTimeout(resetTimerRef.current);
                        }
                        resetTimerRef.current = setTimeout(() => {
                                setDragDirection(null);
                                setDragOffset(0);
                        }, 300);
                }, []);

                const applySwipe = useCallback(
                        (card: NameItem, direction: "left" | "right") => {
                                setDragDirection(direction);
                                setDragOffset(0);

                                if (direction === "right") {
                                        playSound("gameboy-pluck");
                                        if (!isSelected(card)) {
                                                onToggleName(card);
                                        }
                                } else {
                                        playSound("wow");
                                        if (isSelected(card)) {
                                                onToggleName(card);
                                        }
                                }

                                setSwipedIds((prev) => new Set([...prev, String(card.id)]));
                                resetDragState();
                        },
                        [isSelected, onToggleName, resetDragState],
                );

                useEffect(() => {
                        return () => {
                                if (resetTimerRef.current) {
                                        clearTimeout(resetTimerRef.current);
                                }
                        };
                }, []);

                const handleDragEnd = useCallback(
                        (card: NameItem, info: PanInfo) => {
                                const offset = info.offset.x;
                                const velocity = info.velocity.x;
                                const threshold = 100;
                                const velocityThreshold = 500;

                                if (Math.abs(offset) < threshold && Math.abs(velocity) < velocityThreshold) {
                                        setDragOffset(0);
                                        return;
                                }

                                if (offset > threshold || velocity > velocityThreshold) {
                                        applySwipe(card, "right");
                                } else {
                                        applySwipe(card, "left");
                                }
                        },
                        [applySwipe],
                );

                const progressValue = names.length > 0 ? (swipedIds.size / names.length) * 100 : 0;

                return (
                        <div className="flex flex-col gap-6 w-full">
                                <Card padding="small" variant="default">
                                        <div className="gap-3 flex flex-col">
                                                <div className="flex justify-between items-center">
                                                        <span className="text-sm font-bold text-default-500 uppercase tracking-wider">
                                                                Progress
                                                        </span>
                                                        <Chip size="sm" variant="flat" color="primary" className="font-bold">
                                                                {swipedIds.size} / {names.length}
                                                        </Chip>
                                                </div>
                                                <Progress
                                                        value={progressValue}
                                                        color="primary"
                                                        className="h-2"
                                                        classNames={{
                                                                indicator: "bg-gradient-to-r from-primary to-secondary",
                                                        }}
                                                />
                                        </div>
                                </Card>

                                {/* Swipe Stack */}
                                <div className="relative w-full" style={{ minHeight: "500px" }}>
                                        <AnimatePresence mode="popLayout">
                                                {visibleCards.length > 0 ? (
                                                        cardsToRender.map((card: NameItem, index: number) => (
                                                                <motion.div
                                                                        key={card.id}
                                                                        layout={true}
                                                                        layoutId={String(card.id)}
                                                                        className="absolute inset-0 flex items-center justify-center"
                                                                        style={{ zIndex: 10 - index }}
                                                                        exit={{
                                                                                opacity: 0,
                                                                                x: dragDirection === "right" ? 400 : -400,
                                                                                rotate: dragDirection === "right" ? 20 : -20,
                                                                                transition: { duration: 0.3 },
                                                                        }}
                                                                >
                                                                        <motion.div
                                                                                drag={index === 0 ? "x" : false}
                                                                                dragConstraints={{ left: -200, right: 200 }}
                                                                                style={{ touchAction: "pan-y" }}
                                                                                onDrag={(_, info) => {
                                                                                        if (index === 0) {
                                                                                                setDragOffset(info.offset.x);
                                                                                        }
                                                                                }}
                                                                                onDragEnd={(_, info) => {
                                                                                        if (index === 0) {
                                                                                                handleDragEnd(card, info);
                                                                                        }
                                                                                }}
                                                                                animate={{
                                                                                        y: index * 12,
                                                                                        scale: 1 - index * 0.04,
                                                                                        opacity: 1 - index * 0.2,
                                                                                        rotate: index === 0 ? dragOffset / 20 : 0,
                                                                                }}
                                                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                                className="w-full max-w-md"
                                                                        >
                                                                                <Card
                                                                                        className={cn(
                                                                                                "relative flex flex-col items-center justify-between overflow-hidden group transition-all duration-200 h-[500px]",
                                                                                                isSelected(card) ? "shadow-[0_0_30px_rgba(34,197,94,0.3)]" : "",
                                                                                                index === 0 &&
                                                                                                        "cursor-grab active:cursor-grabbing shadow-2xl active:scale-95",
                                                                                                index > 0 && "pointer-events-none",
                                                                                        )}
                                                                                        variant="default"
                                                                                        padding="medium"
                                                                                >
                                                                                        {/* Swipe Indicators */}
                                                                                        {index === 0 && (
                                                                                                <>
                                                                                                        <motion.div
                                                                                                                className="absolute left-8 top-1/2 -translate-y-1/2 z-10"
                                                                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                                                                animate={{
                                                                                                                        opacity: dragOffset < -50 ? 1 : 0,
                                                                                                                        scale: dragOffset < -50 ? 1 : 0.8,
                                                                                                                }}
                                                                                                        >
                                                                                                                <div className="flex items-center gap-2 px-6 py-3 bg-danger/90 backdrop-blur-md rounded-full border-2 border-danger shadow-lg rotate-[-20deg]">
                                                                                                                        <X size={24} className="text-white" />
                                                                                                                        <span className="text-white font-black text-lg uppercase">Nope</span>
                                                                                                                </div>
                                                                                                        </motion.div>

                                                                                                        <motion.div
                                                                                                                className="absolute right-8 top-1/2 -translate-y-1/2 z-10"
                                                                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                                                                animate={{
                                                                                                                        opacity: dragOffset > 50 ? 1 : 0,
                                                                                                                        scale: dragOffset > 50 ? 1 : 0.8,
                                                                                                                }}
                                                                                                        >
                                                                                                                <div className="flex items-center gap-2 px-6 py-3 bg-success/90 backdrop-blur-md rounded-full border-2 border-success shadow-lg rotate-[20deg]">
                                                                                                                        <Heart size={24} className="text-white fill-white" />
                                                                                                                        <span className="text-white font-black text-lg uppercase">Like</span>
                                                                                                                </div>
                                                                                                        </motion.div>
                                                                                                </>
                                                                                        )}

                                                                                        {/* Image Container */}
                                                                                        <div className="w-full aspect-square rounded-xl overflow-hidden border-0 mb-4 bg-white/10 backdrop-blur-md flex items-center justify-center">
                                                                                                {showCatPictures && card.id && imageList.length > 0 ? (
                                                                                                        <div
                                                                                                                className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                                                                                                                style={{
                                                                                                                        backgroundImage: `url('${getRandomCatImage(card.id, imageList)}')`,
                                                                                                                }}
                                                                                                        />
                                                                                                ) : (
                                                                                                        <span className="text-white/20 text-6xl font-bold select-none">
                                                                                                                {card.name[0]?.toUpperCase() || "?"}
                                                                                                        </span>
                                                                                                )}
                                                                                        </div>

                                                                                        {/* Text Content */}
                                                                                        <div className="text-center pb-4 z-10 w-full">
                                                                                                <h3 className="font-whimsical text-2xl lg:text-3xl text-white tracking-wide drop-shadow-lg break-words w-full">
                                                                                                        {card.name}
                                                                                                </h3>
                                                                                                {typeof card.pronunciation === "string" && card.pronunciation && (
                                                                                                        <p className="text-white/80 text-sm leading-relaxed max-w-md mt-1 mx-auto font-medium">
                                                                                                                [{card.pronunciation}]
                                                                                                        </p>
                                                                                                )}
                                                                                                {card.description && (
                                                                                                        <p className="text-white/60 text-sm leading-relaxed max-w-md mt-2 mx-auto">
                                                                                                                {card.description}
                                                                                                        </p>
                                                                                                )}
                                                                                                {isSelected(card) && (
                                                                                                        <div className="flex justify-center mt-3">
                                                                                                                <div className="px-3 py-1 bg-success/20 backdrop-blur-md border border-success/30 rounded-full flex items-center gap-2">
                                                                                                                        <Check size={14} className="text-success" />
                                                                                                                        <span className="text-success font-bold text-xs tracking-widest uppercase">
                                                                                                                                Selected
                                                                                                                        </span>
                                                                                                                </div>
                                                                                                        </div>
                                                                                                )}
                                                                                        </div>
                                                                                </Card>
                                                                        </motion.div>
                                                                </motion.div>
                                                        ))
                                                ) : (
                                                        <motion.div
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="flex flex-col items-center justify-center gap-6 p-12"
                                                        >
                                                                <Card variant="default" className="flex flex-col items-center text-center gap-6">
                                                                        <div className="text-6xl">🎉</div>
                                                                        <h2 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                                                                All Clear!
                                                                        </h2>
                                                                        <p className="text-white/60 max-w-md">
                                                                                You've reviewed all {names.length} names. Ready to start the tournament?
                                                                        </p>
                                                                        {selectedNames.length >= 2 && (
                                                                                <Button
                                                                                        size="lg"
                                                                                        color="primary"
                                                                                        variant="shadow"
                                                                                        onClick={() => onStartTournament(selectedNames)}
                                                                                        className="font-bold text-lg px-8 shadow-primary/40"
                                                                                >
                                                                                        Start Tournament ({selectedNames.length} names)
                                                                                </Button>
                                                                        )}
                                                                </Card>
                                                        </motion.div>
                                                )}
                                        </AnimatePresence>
                                </div>

                                {/* Action Buttons */}
                                {visibleCards.length > 0 && (
                                        <div className="flex gap-4 justify-center items-center">
                                                <Button
                                                        isIconOnly={true}
                                                        size="lg"
                                                        variant="flat"
                                                        className="w-16 h-16 bg-danger/10 hover:bg-danger/20 border-2 border-danger/30 text-danger"
                                                        aria-label={currentCard ? `Discard ${currentCard.name}` : "Discard"}
                                                        onClick={() => {
                                                                if (currentCard) {
                                                                        applySwipe(currentCard, "left");
                                                                }
                                                        }}
                                                >
                                                        <X size={28} />
                                                </Button>

                                                <Button
                                                        size="lg"
                                                        color="primary"
                                                        variant="shadow"
                                                        onClick={() => onStartTournament(selectedNames)}
                                                        disabled={selectedNames.length < 2}
                                                        className="font-bold px-8 shadow-primary/40"
                                                >
                                                        Start Tournament ({selectedNames.length})
                                                </Button>

                                                <Button
                                                        isIconOnly={true}
                                                        size="lg"
                                                        variant="flat"
                                                        className="w-16 h-16 bg-success/10 hover:bg-success/20 border-2 border-success/30 text-success"
                                                        aria-label={currentCard ? `Keep ${currentCard.name}` : "Keep"}
                                                        onClick={() => {
                                                                if (currentCard) {
                                                                        applySwipe(currentCard, "right");
                                                                }
                                                        }}
                                                >
                                                        <Heart size={28} className="fill-success" />
                                                </Button>
                                        </div>
                                )}

                                {/* Swipe Hint */}
                                {visibleCards.length > 0 && swipedIds.size === 0 && (
                                        <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                                className="flex items-center justify-center gap-3 text-default-400 text-sm"
                                        >
                                                <ChevronLeft size={16} className="animate-pulse" />
                                                <span className="font-medium">Swipe or tap buttons to review names</span>
                                                <ChevronRight size={16} className="animate-pulse" />
                                        </motion.div>
                                )}
                        </div>
                );
        },
);
SwipeableCards.displayName = "SwipeableCards";