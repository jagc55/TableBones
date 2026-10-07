import { GameId, Player, RoomSettings } from './index';

/**
 * Standard props contract for any game engine mounted inside GameArena / GameStageFrame.
 * Connects the individual game engine with the TableSkull platform lifecycle.
 */
export interface BaseGameEngineProps {
  gameId?: GameId;
  currentUserPlayer: Player;
  players: Player[];
  settings?: RoomSettings;
  timeLeftSec?: number;
  onPlayerScore: (playerId: string, addedScore: number) => void;
  onActionNotification: (text: string) => void;
  onLeaveMatch?: () => void;
  onMatchResolved?: (winner: Player, reason: string, finalPlayers?: Player[]) => void;
}

/**
 * Abstract class representing game logic and state lifecycle.
 * Defines the contract that game rules and engines must implement.
 */
export abstract class AbstractGameEngine<TState = unknown, TAction = unknown> {
  abstract readonly gameId: GameId;
  abstract readonly title: string;

  /**
   * Initializes initial game state based on player list and room configuration.
   */
  abstract initialize(players: Player[], settings?: RoomSettings): TState;

  /**
   * Processes a player action or game event and returns updated state.
   */
  abstract processAction(state: TState, action: TAction): TState;

  /**
   * Calculates player scores or final standings from current state.
   */
  abstract calculateScores(state: TState): Record<string, number>;

  /**
   * Determines if the match condition has been met.
   */
  abstract checkGameOver(state: TState): boolean;
}
