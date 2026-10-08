import { GameId, GameDefinition, GameManifest } from '../types';
import { bonegleManifest } from './bonegle';
import { midnightAlleyManifest } from './midnight-alley';

/**
 * Central registry mapping all TableSkull games.
 * To add a new game:
 * 1. Create `src/frontend/games/<my-game>/` and its authoritative server engine
 * 2. Implement GameManifest
 * 3. Add to GAME_REGISTRY
 */
export const GAME_REGISTRY: Record<GameId, GameManifest> = {
  bonegle: bonegleManifest,
  'midnight-alley': midnightAlleyManifest,
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
