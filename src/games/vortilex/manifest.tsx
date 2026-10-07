import { GameManifest } from '../../types';
import { VortilexEngine } from './VortilexEngine';
import { VortilexRules } from './VortilexRules';
import { VortilexGameLogic } from './vortilexLogic';

export const vortilexManifest: GameManifest = {
  id: 'vortilex',
  definition: {
    id: 'vortilex',
    title: 'Vortilex: Word Search',
    subtitle: 'Classic Word Puzzle',
    description: 'Connect adjacent letter dice against the clock to discover valid words and score points.',
    minPlayers: 2,
    maxPlayers: 4,
    estimatedTimeMin: 3,
    iconName: 'Swords',
    badge: 'POPULAR',
  },
  hasRoundTimer: true,
  engine: VortilexEngine,
  rulesComponent: VortilexRules,
  logic: new VortilexGameLogic(),
};
