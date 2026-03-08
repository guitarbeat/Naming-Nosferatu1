import { CardBody, Button as HeroButton } from "@heroui/react";
import { useToast } from "@/app/providers/Providers";
import { usePersonalResults } from "@/features/analytics/hooks/usePersonalResults";
import { Card } from "@/shared/components/layout";
import { exportTournamentResultsToCSV } from "@/shared/lib/basic";
import { Download, Plus } from "@/shared/lib/icons";
import type { NameItem, RatingData } from "@/shared/types";
import { RankingAdjustment } from "./RankingAdjustment";

interface PersonalResultsProps {
	personalRatings: Record<string, RatingData> | undefined;
	currentTournamentNames?: NameItem[];
	onStartNew: () => void;
	onUpdateRatings: (
		ratings:
			| Record<string, RatingData>
			| ((prev: Record<string, RatingData>) => Record<string, RatingData>),
	) => void;
	userName?: string;
}

export const PersonalResults = ({
	personalRatings,
	currentTournamentNames,
	onStartNew,
	onUpdateRatings,
}: PersonalResultsProps) => {
	const { rankings } = usePersonalResults({
		personalRatings,
		currentTournamentNames,
	});
	const { showToast } = useToast();

	return (
		<div className="flex flex-col gap-6 w-full">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card variant="warning" className="backdrop-blur-sm">
					<CardBody className="flex flex-col items-center justify-center gap-2 p-6">
						<span className="text-4xl select-none">🏆</span>
						<h3 className="text-sm font-medium text-white/60">Champion</h3>
						<p className="text-xl font-bold text-white truncate max-w-full">
							{rankings[0]?.name || "-"}
						</p>
					</CardBody>
				</Card>

				<Card variant="primary" className="backdrop-blur-sm">
					<CardBody className="flex flex-col items-center justify-center gap-2 p-6">
						<span className="text-4xl select-none">⭐</span>
						<h3 className="text-sm font-medium text-white/60">Highest Rated</h3>
						<p className="text-xl font-bold text-white">{String(rankings[0]?.rating || 1500)}</p>
					</CardBody>
				</Card>

				<Card variant="info" className="backdrop-blur-sm">
					<CardBody className="flex flex-col items-center justify-center gap-2 p-6">
						<span className="text-4xl select-none">📝</span>
						<h3 className="text-sm font-medium text-white/60">Names Ranked</h3>
						<p className="text-xl font-bold text-white">{rankings.length}</p>
					</CardBody>
				</Card>
			</div>

			<RankingAdjustment
				rankings={rankings}
				onSave={async (r: NameItem[]) => {
					const ratingsMap = Object.fromEntries(
						r.map((n) => [
							n.name,
							{
								rating: n.rating as number,
								wins: n.wins ?? 0,
								losses: n.losses ?? 0,
							},
						]),
					);
					await onUpdateRatings(ratingsMap);
					showToast("Updated!", "success");
				}}
				onCancel={onStartNew}
			/>

			<div className="flex flex-wrap gap-3 justify-end">
				<HeroButton
					onClick={onStartNew}
					variant="flat"
					className="bg-purple-500/20 hover:bg-purple-500/30 text-white"
					startContent={<Plus size={18} />}
				>
					New Tournament
				</HeroButton>
				<HeroButton
					variant="flat"
					className="bg-white/5 hover:bg-white/10 text-white"
					startContent={<Download size={18} />}
					onClick={() => {
						if (!rankings.length) {
							return;
						}
						exportTournamentResultsToCSV(rankings);
					}}
				>
					Export CSV
				</HeroButton>
			</div>
		</div>
	);
};
