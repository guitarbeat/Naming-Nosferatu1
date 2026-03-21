/**
 * @module RandomGenerator
 * @description Random cat name generator with favorites persistence.
 */

import { useCallback, useId, useMemo, useState } from "react";
import Button from "@/shared/components/layout/Button";
import { useLocalStorage } from "@/shared/hooks";
import { Copy, Heart, Shuffle } from "@/shared/lib/icons";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface NameEntry {
	name: string;
	[key: string]: unknown;
}

interface RandomGeneratorProps {
	fetchNames: () => Promise<NameEntry[]>;
	storageKey?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fallback Names
// ═══════════════════════════════════════════════════════════════════════════════

const FALLBACK_NAMES = [
	"Luna",
	"Oliver",
	"Milo",
	"Cleo",
	"Simba",
	"Nala",
	"Leo",
	"Willow",
	"Jasper",
	"Pepper",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function Spinner() {
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="h-10 w-10 animate-spin rounded-full border-3 border-primary/30 border-t-primary" />
		</div>
	);
}

function FavoriteChip({ name, onRemove }: { name: string; onRemove: () => void }) {
	return (
		<div className="flex items-center gap-1 rounded-full border border-border bg-foreground/5 py-1 pl-3 pr-1">
			<span className="text-sm text-foreground/80">{name}</span>
			<Button
				type="button"
				onClick={onRemove}
				variant="ghost"
				size="icon"
				iconOnly={true}
				shape="pill"
				className="size-7 bg-transparent text-foreground/40 hover:bg-foreground/10 hover:text-foreground/80"
				aria-label={`Remove ${name} from favorites`}
			>
				<span className="text-xs">✕</span>
			</Button>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function RandomGenerator({
	fetchNames,
	storageKey = "cat_name_favorites",
}: RandomGeneratorProps) {
	const dottedGridId = useId().replace(/:/g, "-");
	const [generatedName, setGeneratedName] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [storedFavorites, setStoredFavorites] = useLocalStorage<string[]>(storageKey, []);

	const favorites = useMemo(() => new Set(storedFavorites), [storedFavorites]);

	const generateName = useCallback(async () => {
		setIsGenerating(true);
		try {
			const allNames = await fetchNames();
			if (allNames.length > 0) {
				const idx = Math.floor(Math.random() * allNames.length);
				const picked = allNames[idx];
				if (picked) {
					setGeneratedName(picked.name);
				}
			} else {
				// Empty response — pick from fallbacks
				const idx = Math.floor(Math.random() * FALLBACK_NAMES.length);
				setGeneratedName(FALLBACK_NAMES[idx] ?? null);
			}
		} catch {
			const idx = Math.floor(Math.random() * FALLBACK_NAMES.length);
			setGeneratedName(FALLBACK_NAMES[idx] ?? null);
		} finally {
			setIsGenerating(false);
		}
	}, [fetchNames]);

	const copyToClipboard = useCallback(async (name: string) => {
		try {
			await navigator.clipboard.writeText(name);
		} catch {
			/* clipboard not available in insecure contexts */
		}
	}, []);

	const toggleFavorite = useCallback(
		(name: string) => {
			setStoredFavorites((prev) => {
				const set = new Set(prev);
				if (set.has(name)) {
					set.delete(name);
				} else {
					set.add(name);
				}
				return Array.from(set);
			});
		},
		[setStoredFavorites],
	);

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col">
			{/* Header */}
			<h2 className="mb-2 text-center text-2xl font-bold text-foreground">Random Name Generator</h2>
			<p className="mb-8 text-center text-muted-foreground">
				Can&apos;t decide? Let fate decide for you.
			</p>

			{/* Generator Card */}
			<div className="random-generator-card relative flex min-h-[240px] w-full flex-col items-center justify-center gap-8 overflow-hidden rounded-2xl border border-border bg-foreground/10 px-6 py-12 backdrop-blur-sm">
				<svg
					className="absolute inset-0 h-full w-full pointer-events-none z-0"
					width="100%"
					height="100%"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden="true"
				>
					<defs>
						<pattern id={dottedGridId} width="30" height="30" patternUnits="userSpaceOnUse">
							<circle cx="2" cy="2" r="1" fill="rgba(255, 255, 255, 0.2)" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill={`url(#${dottedGridId})`} />
				</svg>
				<div className="random-generator-bubble random-generator-bubble--one" aria-hidden="true" />
				<div className="random-generator-bubble random-generator-bubble--two" aria-hidden="true" />
				<div
					className="random-generator-bubble random-generator-bubble--three"
					aria-hidden="true"
				/>

				{/* Display Area */}
				<div className="relative z-10 flex min-h-[100px] w-full flex-col items-center justify-center text-center">
					{isGenerating ? (
						<Spinner />
					) : generatedName ? (
						<div className="flex flex-col items-center gap-6 leading-none">
							<h3 className="text-5xl font-black tracking-tight text-foreground/90 drop-shadow-2xl md:text-6xl">
								{generatedName}
							</h3>
							<div className="flex gap-2">
								<Button
									onClick={() => toggleFavorite(generatedName)}
									type="button"
									variant="ghost"
									size="icon"
									iconOnly={true}
									shape="pill"
									className="bg-foreground/8 text-foreground hover:bg-foreground/14"
									aria-label={
										favorites.has(generatedName) ? "Remove from favorites" : "Add to favorites"
									}
								>
									<Heart
										size={20}
										className={favorites.has(generatedName) ? "fill-pink-500 text-pink-500" : ""}
									/>
								</Button>
								<Button
									onClick={() => copyToClipboard(generatedName)}
									type="button"
									variant="ghost"
									size="icon"
									iconOnly={true}
									shape="pill"
									className="bg-foreground/8 text-foreground hover:bg-foreground/14"
									aria-label="Copy to clipboard"
								>
									<Copy size={20} />
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center gap-2 text-foreground/20">
							<Shuffle size={48} />
							<p>Tap to generate</p>
						</div>
					)}
				</div>

				{/* Generate Button */}
				<div className="random-generator-button-wrap">
					<Button
						type="button"
						onClick={generateName}
						disabled={isGenerating}
						variant="glass"
						size="lg"
						className="min-w-[12rem]"
						startIcon={<Shuffle size={18} />}
					>
						{isGenerating ? "Generating..." : "Generate Name"}
					</Button>
				</div>
			</div>

			{/* Favorites */}
			{favorites.size > 0 && (
				<div className="mt-6 flex flex-col gap-4">
					<h3 className="flex items-center gap-2 text-lg font-semibold text-foreground/80">
						<Heart size={16} className="fill-pink-500 text-pink-500" />
						Favorites
					</h3>
					<div className="flex flex-wrap gap-2">
						{Array.from(favorites).map((name) => (
							<FavoriteChip key={name} name={name} onRemove={() => toggleFavorite(name)} />
						))}
					</div>
				</div>
			)}
		</div>
	);
}
