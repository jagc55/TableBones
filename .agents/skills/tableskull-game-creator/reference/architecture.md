# TableSkull Architecture Reference

This reference documents the platform contracts, lifecycles, and component integration points required when developing games for TableSkull.

---

## 1. Core Architecture Principles

1. **Decoupled Plugin Manifest Pattern**: Every game is a self-contained module living in `src/games/<game-id>/`. No game-specific logic or styling should leak into platform shell components (`App.tsx`, `GameArena.tsx`, `RulesModal.tsx`, `CreateRoomModal.tsx`, `PreGameLobby.tsx`).
2. **Iframe Isolation**: In production, games are mounted inside `GameStageFrame.tsx` (`<iframe>`), giving them canvas/CSS isolation while communicating via standard React props.
3. **State Ownership**:
   - The **Platform** owns room metadata, player roster, chat, global timer ticks, network sync, and overall match victory.
   - The **Game Engine** owns active board state, turn progression, piece positions, player hands, and sub-round calculations.
4. **1930s Fleischer/Cuphead Aesthetic**: All games adhere to the woodcut cel-card styling, ink strokes, bold parchment palettes, and tactile mechanical sound effects.

---

## 2. Platform Contracts (`src/types/game.ts`)

### `BaseGameEngineProps`
The props passed into the game engine component mounted inside `GenericGameEngine`:

```typescript
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
```

- `currentUserPlayer`: The local human contender sitting at this client.
- `players`: Complete list of contenders in the room (including bots and remote players).
- `settings`: Active room configuration (`RoomSettings`).
- `timeLeftSec`: Countdown time left (if game uses `hasRoundTimer: true`).
- `onPlayerScore(playerId, pts)`: Notifies the platform when a player scores points.
- `onActionNotification(text)`: Posts a game notice to the live match chat feed.
- `onMatchResolved(winner, reason, finalPlayers)`: Signals match completion and triggers `VictoryModal`.

---

### `AbstractGameEngine<TState, TAction>`
The abstract base class representing the pure state lifecycle and rule verification:

```typescript
export abstract class AbstractGameEngine<TState = unknown, TAction = unknown> {
  abstract readonly gameId: GameId;
  abstract readonly title: string;

  /** Initializes game state based on player list and room settings */
  abstract initialize(players: Player[], settings?: RoomSettings): TState;

  /** Processes an action and returns the new game state */
  abstract processAction(state: TState, action: TAction): TState;

  /** Calculates player scores from state */
  abstract calculateScores(state: TState): Record<string, number>;

  /** Determines if end-game conditions have been satisfied */
  abstract checkGameOver(state: TState): boolean;
}
```

Every game logic file (`<game>Logic.ts`) must export a class extending this abstract base class.

---

### `GameSettingsFormProps`
The props passed to custom game settings forms rendered inside `CreateRoomModal` and `RoomSettingsModal`:

```typescript
export interface GameSettingsFormProps {
  settings: RoomSettings;
  onUpdateSetting: <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => void;
  isHost: boolean;
  stepOffset?: number;
}
```

- `settings`: Current settings object.
- `onUpdateSetting(key, value)`: Setter to update a setting field on the room.
- `isHost`: Boolean indicating if the current user is host (`false` renders read-only observer view).
- `stepOffset`: Step index number for numbered section labels (e.g. `4. BOARD SIZE`).

---

### `GameManifest<TState, TAction>`
The single declarative registry entry that describes and connects the game:

```typescript
export interface GameManifest<TState = unknown, TAction = unknown> {
  id: GameId;
  definition: GameDefinition;
  /** Badge in RoomBrowser & Lobby, e.g. "10 Rounds" or "Best of 5" */
  formatBadge?: string;
  /** Whether the game uses a round countdown clock (default: true). False for turn-based games */
  hasRoundTimer?: boolean;
  /** Hide continuous top scoreboard strip (e.g. for secret revelation or custom tables) */
  hideContinuousScoreboard?: boolean;
  /** Optional CSS class applied to GameArena layout (e.g. 'arena-midnight-layout') */
  arenaLayoutClass?: string;
  /** Main engine React component */
  engine: React.ComponentType<BaseGameEngineProps>;
  /** Custom rules component for RulesModal */
  rulesComponent?: React.ComponentType;
  /** Custom room settings form component */
  settingsComponent?: React.ComponentType<GameSettingsFormProps>;
  /** Custom badges rendered in PreGameLobby summary */
  lobbyMetaChips?: (room: Room) => React.ReactNode;
  /** Concrete logic instance */
  logic?: AbstractGameEngine<TState, TAction>;
}
```

---

## 3. Directory Layout Standard

Every game must be scaffolded under `src/games/<game-id>/`:

```
src/games/<game-id>/
├── types.ts              # Local domain types (GameState, GameAction, Cards, Dice, etc.)
├── <game>Logic.ts        # Extends AbstractGameEngine, pure logic, AI decision helpers
├── <Game>Components.tsx  # Subcomponents (dice, cards, board tiles, tokens, custom HUD)
├── <Game>Engine.tsx      # Main React engine implementing BaseGameEngineProps
├── <Game>Rules.tsx       # Mafia Codex-style rules view for RulesModal
├── <Game>Settings.tsx    # Optional custom settings form for room modals
├── manifest.tsx          # Exports <game>Manifest: GameManifest
└── index.ts              # Clean barrel exports
```

---

## 4. Integration Checklist

When a game is created:
1. **Declare ID**: Add `<game-id>` to `GameId` type union in `src/types/index.ts`.
2. **Register**: Import `myGameManifest` into `src/games/registry.ts` and add it to `GAME_REGISTRY`.
3. **Verify**: Run `npm run build` (`tsc && vite build`).
4. **Done**: The game immediately works in:
   - Room creation game selector
   - Room browser filter tabs
   - Pre-game lobby chips & invite URLs
   - Rules modal codex view
   - Game arena stage
   - Victory & rematch modals
