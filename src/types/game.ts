import { GameId, Player, RoomSettings, Room, GameDefinition } from './index';

/**
 * Standard props contract for any game engine mounted inside GameArena / GameStageFrame.
 * Connects the individual game engine with the TableSkull platform lifecycle.
 */
export interface BaseGameEngineProps {
  gameId?: GameId;
  roomCode?: string;
  roomId?: string;
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
 * Props passed to custom game settings forms (used in CreateRoomModal and RoomSettingsModal).
 */
export interface GameSettingsFormProps {
  settings: RoomSettings;
  onUpdateSetting: <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => void;
  isHost: boolean;
  stepOffset?: number;
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

/**
 * Game Manifest: the single declaration that defines a game's identity, rules,
 * settings, metadata chips, and engine implementation.
 * Enables adding new games to TableSkull without modifying core platform components.
 */
export interface GameManifest<TState = unknown, TAction = unknown> {
  id: GameId;
  definition: GameDefinition;
  /** Custom badge format displayed in RoomBrowser/Lobby, e.g. "10 Rounds" */
  formatBadge?: string;
  /** Whether the game uses a round countdown timer (default: true). Set to false for turn-based games like Midnight Alley */
  hasRoundTimer?: boolean;
  /** Whether to hide the default top scoreboard strip in GameArena (e.g. for secret revelation games or custom table layouts) */
  hideContinuousScoreboard?: boolean;
  /** Optional layout CSS class for GameArena layout container (e.g. 'arena-midnight-layout') */
  arenaLayoutClass?: string;
  /** The React component that renders the game inside GameStageFrame */
  engine: React.ComponentType<BaseGameEngineProps>;
  /** Optional custom rules component rendered in RulesModal */
  rulesComponent?: React.ComponentType;
  /** Optional custom settings form controls rendered in CreateRoomModal and RoomSettingsModal */
  settingsComponent?: React.ComponentType<GameSettingsFormProps>;
  /** Optional custom metadata chips rendered in PreGameLobby */
  lobbyMetaChips?: (room: Room) => React.ReactNode;
  /** Optional game logic controller */
  logic?: AbstractGameEngine<TState, TAction>;
}
