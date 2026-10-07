import { GameId, GameDefinition, GameManifest } from '../types';
import { bonegleManifest } from './bonegle';
import { midnightAlleyManifest } from './midnight-alley';
import { vortilexManifest } from './vortilex';
import { skullBonesManifest } from './skull-bones';

// Fallback manifests for games in the catalog whose engines use the generic stage
export const royalCheckersManifest: GameManifest = {
  id: 'royal-checkers',
  definition: {
    id: 'royal-checkers',
    title: 'Classic Checkers',
    subtitle: 'Strategy Board Game',
    description: 'Diagonal leaps, king promotions, and board control in a traditional checkers match.',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedTimeMin: 6,
    iconName: 'Crown',
    badge: '2 PLAYERS',
  },
  hasRoundTimer: true,
  engine: () => null, // GenericGameEngine renders tactical board fallback
};

export const mysteryManorManifest: GameManifest = {
  id: 'mystery-manor',
  definition: {
    id: 'mystery-manor',
    title: 'Mystery Manor',
    subtitle: 'Deduction & Clue Game',
    description: 'Share clues, eliminate suspects, and deduce the mystery before the round ends.',
    minPlayers: 3,
    maxPlayers: 5,
    estimatedTimeMin: 8,
    iconName: 'Shield',
    badge: 'MYSTERY',
  },
  hasRoundTimer: true,
  engine: () => null, // GenericGameEngine renders tactical board fallback
};

/**
 * Central registry mapping all TableSkull games.
 * To add a new game:
 * 1. Create `src/games/<my-game>/`
 * 2. Implement GameManifest
 * 3. Add to GAME_REGISTRY
 */
export const GAME_REGISTRY: Record<GameId, GameManifest> = {
  bonegle: bonegleManifest,
  'midnight-alley': midnightAlleyManifest,
  vortilex: vortilexManifest,
  'skull-bones': skullBonesManifest,
  'royal-checkers': royalCheckersManifest,
  'mystery-manor': mysteryManorManifest,
};

/**
 * Retrieve the manifest for a given game ID.
 */
export function getGameManifest(gameId: GameId): GameManifest | undefined {
  return GAME_REGISTRY[gameId];
}

/**
 * Retrieve all registered game manifests.
 */
export function getAllGameManifests(): GameManifest[] {
  return Object.values(GAME_REGISTRY);
}

/**
 * Retrieve definition for a given game ID.
 */
export function getGameDefinition(gameId: GameId): GameDefinition | undefined {
  return GAME_REGISTRY[gameId]?.definition;
}

/**
 * Retrieve definitions for all games in the catalog.
 */
export function getAllGameDefinitions(): GameDefinition[] {
  return getAllGameManifests().map((m) => m.definition);
}
