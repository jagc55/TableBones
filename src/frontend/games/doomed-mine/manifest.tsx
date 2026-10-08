import type { GameManifest } from '../../types';
import { DoomedMineEngine } from './DoomedMineEngine';
import { DoomedMineRules } from './DoomedMineRules';

export const doomedMineManifest: GameManifest = {
  id: 'doomed-mine',
  definition: {
    id: 'doomed-mine',
    title: 'Doomed Mine: Texas Hold’em',
    subtitle: 'Cooperative Underground Poker',
    description:
      'A crew of skeleton miners must shore up 3 cave shafts before suffering 3 cave-ins. Estimate your hand strength silently with pressure tokens.',
    minPlayers: 2,
    maxPlayers: 6,
    estimatedTimeMin: 10,
    iconName: 'Pickaxe',
    badge: 'NEW',
  },
  formatBadge: 'Cooperative',
  hasRoundTimer: true,
  hideContinuousScoreboard: true,
  arenaLayoutClass: 'arena-doomed-mine-layout',
  engine: (props) => <DoomedMineEngine {...props} />,
  rulesComponent: DoomedMineRules,
};
