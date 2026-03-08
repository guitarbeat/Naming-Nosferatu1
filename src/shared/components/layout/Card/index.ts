import { Card, CardName, CardStats } from "./Card";

export { Card, CardName, CardStats };
export type {
	CardBackground,
	CardNameProps,
	CardPadding,
	CardProps,
	CardShadow,
	CardStatsProps,
	CardVariant,
	GlassConfig,
} from "./Card";

const CardWithStats = Object.assign(Card, { Stats: CardStats, Name: CardName });

export default CardWithStats;
