# TableSkull: Game Architecture & Interface Contract

This document defines the formal interfaces, data models, and architectural boundaries between the **TableSkull Main Frame** (platform shell, room lobbies, chat, network sync, timer HUD) and the **Game Engines** that execute inside the Game Arena.

Follow this specification to maintain clean separation of concerns, eliminate cross-cutting bugs, and easily add new multiplayer games to TableSkull without touching core platform files.

---

## 1. Architectural Overview & Philosophy

TableSkull follows a **Micro-Kernel / Pluggable Game Module** architecture.

```
+-----------------------------------------------------------------------------------+
|                                 TABLESKULL MAIN FRAME                             |
|                                                                                   |
|  +--------------------+   +--------------------+   +---------------------------+  |
|  |    RoomBrowser     |   |    PreGameLobby    |   |     Global Modals         |  |
|  |  (Catalog & Rooms) |   | (Quorum & Bot Sim) |   | (Create, Settings, Rules) |  |
|  +--------------------+   +--------------------+   +---------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                                  GAME ARENA                                 |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | Top HUD: Stopwatch Dial | Room Stub | Quorum | Rules & Leave Buttons  |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | Arena Grid:                                                           |  |  |
|  |  |   +---------------------------------------+   +--------------------+  |  |  |
|  |  |   |           GameStageFrame              |   |     ChatPanel      |  |  |  |
|  |  |   |      (Isolated IFrame Container)      |   |  (Match chat feed, |  |  |  |
|  |  |   |  +---------------------------------+  |   |   system notices,  |  |  |  |
|  |  |   |  |   GameEngineHost / Manifest     |  |   |    player muting)  |  |  |  |
|  |  |   |  |  +---------------------------+  |  |   +--------------------+  |  |  |
|  |  |   |  |  |   Active Game Engine      |  |  |                           |  |  |
|  |  |   |  |  | (Bonegle, Midnight Alley, |  |  |                           |  |  |
|  |  |   |  |  |  Vortilex, Skull & Bones) |  |  |                           |  |  |
|  |  |   |  |  +---------------------------+  |  |                           |  |  |
|  |  |   |  +---------------------------------+  |                           |  |  |
|  |  |   +---------------------------------------+                           |  |  |
|  +--+-----------------------------------------------------------------------+--+  |
+-----------------------------------------------------------------------------------+
```

### Core Principles
1. **Zero Game Logic Leaks**: The platform core (`App.tsx`, `GameArena.tsx`, `RoomBrowser.tsx`, `networkSync.ts`) must never contain game-specific logic, hardcoded game IDs, or game-specific fields.
2. **Self-Contained Game Modules**: Each game lives entirely within its folder (`src/games/<game-id>/`) and declares its interface through a `GameManifest`.
3. **Bi-directional Symmetry**: Communication between the Main Frame and Game Engines occurs exclusively through a well-defined props contract (`BaseGameEngineProps`).
4. **Deterministic Multiplayer**: Games must generate board layouts, card decks, and random outcomes deterministically from the shared `settings.matchSeed` or `roomCode`.

---

## 2. Component Hierarchy & Boundaries

### 2.1 The Platform Shell
* **`App.tsx`**: State container for user profile, achievements, active room collection, navigation views (`browser` | `lobby` | `arena`), and multi-device network events.
* **`RoomBrowser.tsx`**: Displays the games catalog and public/private rooms. Queries manifests via `getAllGameDefinitions()`.
* **`PreGameLobby.tsx`**: Manages contender readiness, host privileges, bot simulations, and quorum. Dynamically displays game badges and `lobbyMetaChips` from the game manifest.
* **`GameArena.tsx`**: The match enclosure. Houses the countdown stopwatch, room code ticket, leave confirmation modal, and chat sidebar. It delegates game execution to `GameStageFrame`.

### 2.2 The Presentation Sandbox: `GameStageFrame`
Each game engine is mounted inside an `<iframe>` via React Portal (`createPortal`) with isolated styles, themes, and heights:
* Clones stylesheets, typography, and theme CSS variables (`data-theme="day"` / `"night"`).
* Isolates game layout rules from platform layout rules.
* Automatically auto-sizes using `ResizeObserver` and `MutationObserver` (minimum 720px height).

---

## 3. The Bi-Directional Data Model Contract

Communication between the Main Frame and the Game Engine occurs through `BaseGameEngineProps`:

```typescript
export interface BaseGameEngineProps {
  // Identifiers
  gameId?: GameId;
  roomCode?: string;
  roomId?: string;

  // Contenders & Profile
  currentUserPlayer: Player;
  players: Player[];

  // Configuration & Pacing
  settings?: RoomSettings;
  timeLeftSec?: number;

  // Outgoing Callbacks (Engine -> Platform)
  onPlayerScore: (playerId: string, addedScore: number) => void;
  onActionNotification: (text: string) => void;
  onLeaveMatch?: () => void;
  onMatchResolved?: (winner: Player, reason: string, finalPlayers?: Player[]) => void;
}
```

### 3.1 Main Frame -> Game Engine (Inbound Data)

| Property | Type | Description |
| :--- | :--- | :--- |
| `gameId` | `GameId` | Unique key identifying the active game. |
| `roomCode` | `string` | Short human-readable room code (e.g. `TB-8X2F`). Used as fallback PRNG seed. |
| `roomId` | `string` | Unique room GUID/ID in storage. |
| `currentUserPlayer` | `Player` | The authenticated local contender (avatar, name, score, host status). |
| `players` | `Player[]` | Array of all contenders currently participating in the room. |
| `settings` | `RoomSettings` | Match settings including `roundDurationSec`, `turnTimeLimitSec`, `matchSeed`, and custom settings. |
| `timeLeftSec` | `number \| undefined` | Remaining round seconds from the arena stopwatch. Omitted for turn-based games (`hasRoundTimer: false`). |

### 3.2 Game Engine -> Main Frame (Outbound Events)

| Callback | Signature | Purpose |
| :--- | :--- | :--- |
| `onPlayerScore` | `(playerId: string, addedScore: number) => void` | Increment player score. Platform updates scoreboard, triggers score animations, and checks achievements. |
| `onActionNotification` | `(text: string) => void` | Send system notification to the arena match chat feed (e.g. "Player played The Boss!"). |
| `onLeaveMatch` | `() => void` | Trigger platform forfeit/leave modal flow and return player to browser. |
| `onMatchResolved` | `(winner: Player, reason: string, finalPlayers?: Player[]) => void` | Conclude match, open platform `VictoryModal`, record stats, unlock champion achievements. |

---

## 4. Platform Data Types Specification

### 4.1 Room Settings Model (`RoomSettings`)
Platform settings must remain game-agnostic. Game-specific parameters belong in `customSettings` or indexed properties:

```typescript
export interface RoomSettings {
  /** Match duration in seconds for timed games (e.g. 60, 120, 180, 240) */
  roundDurationSec: number;

  /** Turn limit per contender in seconds for turn-based games (e.g. 30, 45, 60) */
  turnTimeLimitSec: number;

  /** Deterministic seed string shared by all room contenders */
  matchSeed?: string;

  /** Optional dictionary language for word games ('en' | 'es') */
  dictionaryLang?: 'en' | 'es';

  /** Extensible custom settings bag for individual game parameters */
  customSettings?: Record<string, unknown>;

  /** Indexed accessor for game-specific properties (e.g. bonegleGridSize) */
  [key: string]: unknown;
}
```

### 4.2 Player Model (`Player`)
```typescript
export interface Player {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  isBot?: boolean;
  hasLeft?: boolean;

  /** Extensible custom payload for match breakdowns and stats */
  customData?: Record<string, unknown>;

  /** Optional game breakdown items rendered in VictoryModal standings */
  breakdownItems?: Array<{ label: string; value: string | number }>;

  /** Backwards-compatible breakdown for word search games */
  wordsBreakdown?: {
    uniqueWords: { word: string; pts: number }[];
    sharedWords: { word: string; pts: number; sharedWith?: string[] }[];
  };
}
```

### 4.3 Network Synchronization Model (`NetworkEvent`)
Cross-device WebSocket and same-origin BroadcastChannel events:

```typescript
export type NetworkEvent =
  | { type: 'SYNC_ROOM'; room: Room; kickedPlayerId?: string; leftPlayerId?: string }
  | { type: 'START_GAME'; roomId: string }
  | { type: 'ROOM_CLOSED'; roomId: string }
  | { type: 'CHAT_MESSAGE'; roomId: string; chatMessage: ChatMessage }
  | { type: 'GAME_MESSAGE'; roomId: string; playerId: string; messageType: string; payload: unknown }
  | { type: 'BONEGLE_WORDS'; roomId: string; playerId: string; words: string[] }; // legacy alias
```

---

## 5. The Game Manifest Contract (`GameManifest`)

Every game declares a single manifest object that TableSkull imports:

```typescript
export interface GameManifest<TState = unknown, TAction = unknown> {
  /** Unique game identifier matching GameId union */
  id: GameId;

  /** Catalog entry with title, player quorum, estimated duration, icon */
  definition: GameDefinition;

  /** Format badge displayed in room cards (e.g. "10 Rounds", "Timed Duel") */
  formatBadge?: string;

  /** If false, hides the top HUD stopwatch countdown (for turn-based games) */
  hasRoundTimer?: boolean;

  /** If true, hides the top running scoreboard strip in GameArena */
  hideContinuousScoreboard?: boolean;

  /** Optional CSS class applied to GameArena root layout */
  arenaLayoutClass?: string;

  /** The React Component that renders the game inside GameStageFrame */
  engine: React.ComponentType<BaseGameEngineProps>;

  /** Optional component rendered in RulesModal */
  rulesComponent?: React.ComponentType;

  /** Optional form controls rendered in CreateRoomModal & RoomSettingsModal */
  settingsComponent?: React.ComponentType<GameSettingsFormProps>;

  /** Optional custom metadata chips rendered in PreGameLobby */
  lobbyMetaChips?: (room: Room) => React.ReactNode;

  /** Optional headless state logic engine */
  logic?: AbstractGameEngine<TState, TAction>;
}
```

---

## 6. Stability & Anti-Loop Rules

Because `App.tsx` re-renders when scores or room states update, game engines **MUST** follow these stability rules to prevent infinite render loops:

### Rule 1: Stabilize External Callbacks with `useRef`
Never pass parent callbacks (`onPlayerScore`, `onActionNotification`, `onMatchResolved`) directly to dependency arrays of `useEffect` or interval timers:

```typescript
// Correct Pattern in Game Engines:
const onScoreRef = useRef(onPlayerScore);
onScoreRef.current = onPlayerScore;

const onNotifyRef = useRef(onActionNotification);
onNotifyRef.current = onActionNotification;

const onMatchResolvedRef = useRef(onMatchResolved);
onMatchResolvedRef.current = onMatchResolved;
```

### Rule 2: Decouple Timer Ticks from Internal Engine State
If `timeLeftSec` is passed from the arena stopwatch:
* Do NOT run heavy state recalculations on every second tick.
* Only trigger end-game or warning checks when `timeLeftSec === 0` using a ref guard (`hasResolvedRef.current = true`).

### Rule 3: Deterministic Mulberry32 PRNG
Never generate random game setups on client mount with `Math.random()`. Contenders in the same room will see different setups.
Always use a seeded PRNG:

```typescript
export function createPrng(seedString: string) {
  let h = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
```

---

## 7. Step-by-Step Guide: Adding a New Game

To add a new game (e.g. `goblin-mine`) without modifying core platform logic:

### Step 1: Add the Game ID
In [src/types/index.ts](file:///c:/Users/juana/Desktop/Proyectos/table-bones/src/types/index.ts):
```typescript
export type GameId = 'bonegle' | 'midnight-alley' | 'vortilex' | 'skull-bones' | 'royal-checkers' | 'mystery-manor' | 'goblin-mine';
```

### Step 2: Create the Game Directory
Create `src/games/goblin-mine/` with:
- `types.ts`: Game-specific state, card/tile models.
- `goblinMineLogic.ts`: Rules, state transitions, scoring logic.
- `GoblinMineRules.tsx`: Visual rules dialog.
- `GoblinMineSettings.tsx`: (Optional) Custom room options.
- `GoblinMineEngine.tsx`: Main React component implementing `BaseGameEngineProps`.
- `manifest.tsx`: Exporting `goblinMineManifest: GameManifest`.
- `index.ts`: Public module exports.

### Step 3: Implement Engine Component
In `GoblinMineEngine.tsx`:
```typescript
import React, { useRef } from 'react';
import { BaseGameEngineProps } from '../../types';

export const GoblinMineEngine: React.FC<BaseGameEngineProps> = ({
  currentUserPlayer,
  players,
  settings,
  onPlayerScore,
  onActionNotification,
  onLeaveMatch,
  onMatchResolved,
}) => {
  const onScoreRef = useRef(onPlayerScore);
  onScoreRef.current = onPlayerScore;

  // Game UI & Interaction...
  return <div className="goblin-mine-stage cel-card">...</div>;
};
```

### Step 4: Register in `src/games/registry.ts`
```typescript
import { goblinMineManifest } from './goblin-mine';

export const GAME_REGISTRY: Record<GameId, GameManifest> = {
  // Existing games...
  'goblin-mine': goblinMineManifest,
};
```

**Done!** TableSkull will automatically include the game in:
- Room browser catalog with icons and player quorums.
- Room creation modal with custom settings and durations.
- Pre-game lobby with metadata chips and rules modal.
- Game Arena stage frame and end-of-round victory ceremonies.
