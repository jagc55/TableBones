import { GameManifest } from '../../types';
import { SkullBonesEngine } from './SkullBonesEngine';
import { SkullBonesRules } from './SkullBonesRules';
import { SkullBonesGameLogic } from './skullBonesLogic';

export const skullBonesManifest: GameManifest = {
  id: 'skull-bones',
  definition: {
    id: 'skull-bones',
    title: "Liar's Dice: Duel",
    subtitle: 'Dice Bluffing & Bidding',
    description: 'Roll dice behind your cup, place bids on total faces, and call bluffs against opponents.',
    minPlayers: 2,
    maxPlayers: 6,
    estimatedTimeMin: 5,
    iconName: 'Dices',
    badge: 'CLASSIC',
  },
  hasRoundTimer: true,
  engine: SkullBonesEngine,
  rulesComponent: SkullBonesRules,
  logic: new SkullBonesGameLogic(),
};
