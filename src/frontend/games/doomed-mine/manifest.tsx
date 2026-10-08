import type { GameManifest } from '../../types';
import { DoomedMineEngine } from './DoomedMineEngine';
import { DoomedMineRules } from './DoomedMineRules';

export const doomedMineManifest: GameManifest = {
  id: 'doomed-mine',
  definition: {
    id: 'doomed-mine',
    title: 'Doomed Mine: Texas Hold’em',
    subtitle: 'Póquer Cooperativo Subterráneo',
    description:
      'Una cuadrilla de esqueletos mineros debe apuntalar 3 galerías antes de sufrir 3 derrumbes. Estima tu fuerza en silencio con fichas de presión.',
    minPlayers: 2,
    maxPlayers: 6,
    estimatedTimeMin: 10,
    iconName: 'Pickaxe',
    badge: 'NUEVO',
  },
  formatBadge: 'Cooperativo',
  hasRoundTimer: true,
  hideContinuousScoreboard: false,
  arenaLayoutClass: 'arena-doomed-mine-layout',
  engine: (props) => <DoomedMineEngine {...props} />,
  rulesComponent: DoomedMineRules,
};
