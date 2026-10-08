import { GameManifest } from '../../types';
import { MidnightAlleyEngine } from './MidnightAlleyEngine';
import { MidnightRules } from './MidnightRules';
import { MidnightAlleySettings } from './MidnightAlleySettings';

export const midnightAlleyManifest: GameManifest = {
  id: 'midnight-alley',
  definition: {
    id: 'midnight-alley',
    title: 'Midnight Alley: The Mob Trick',
    subtitle: 'Underworld Trick-Taking Duel',
    description:
      'A cutthroat trick-taking card game of skeleton mobsters. Predict your tricks, unleash The Boss and Gangsters, and beware the Femme Fatale!',
    minPlayers: 2,
    maxPlayers: 8,
    estimatedTimeMin: 7,
    iconName: 'Skull',
    badge: 'NEW',
  },
  formatBadge: '10 Rounds',
  hasRoundTimer: false,
  hideContinuousScoreboard: true,
  arenaLayoutClass: 'arena-midnight-layout',
  engine: (props) => <MidnightAlleyEngine {...props} />,
  rulesComponent: MidnightRules,
  settingsComponent: MidnightAlleySettings,
};
