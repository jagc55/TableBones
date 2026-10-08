# Adding a New Game to TableSkull

TableSkull uses a **decoupled Adapter Pattern** for multiplayer games. The platform handles authentication, lobby rooms, WebSocket transport, database persistence, and the end-of-match victory podium completely agnostically. 

When introducing a new game, **you only touch your game's folders and two central registries**:
1. Backend: Register your engine adapter in `src/server/games/index.js` (`GAME_ENGINES`).
2. Frontend: Register your manifest in `src/frontend/games/registry.ts` (`GAME_REGISTRY`).

---

## Directory Structure

```text
src/
  shared/types/
    index.ts                         GameId and shared platform models
    network.ts                       MatchState, GameAction, and NetworkEvent
    <my-game>.ts                     (Optional) Domain models and piece definitions
  server/games/<my-game>/
    engine.js                        Engine adapter, initial state, action validation & resolution
    rules.js                         (Optional) Pure game rules and scoring calculations
    bot.js                           (Optional) Automated bot move decisions
    projection.js                    (Optional) State sanitization / per-player projection
  frontend/games/<my-game>/
    <MyGame>Engine.tsx               React component rendering board and dispatching actions
    <MyGame>Rules.tsx                Player-facing rules modal
    <MyGame>Settings.tsx             (Optional) Custom room options in create room modal
    manifest.tsx                     GameManifest definition and metadata
    index.ts                         Barrel exports for manifest and components
tests/
  games.test.js                      Engine logic, transitions, and scoring unit tests
  backend.test.js                    End-to-end HTTP, WebSocket, and lifecycle tests
```

---

## Step-by-Step Implementation Guide

### Step 1: Define Contracts in `src/shared/types`

1. **Game ID**: `src/shared/types/index.ts` allows any registered string ID (`GameId`).
2. **Match State & Actions**: In `src/shared/types/network.ts`:
   - Define `<MyGame>MatchState` (projected state visible to the client).
   - Add `<MyGame>MatchState` to `MatchState`.
   - Add game action variants to `GameAction`.

```typescript
// Example: src/shared/types/network.ts
export interface TicTacToeMatchState {
  gameId: 'tictactoe';
  roomId: string;
  board: Array<string | null>;
  turnPlayerId: string | null;
  phase: 'active' | 'resolved';
  winnerId?: string | null;
  winReason?: string;
  deadline?: number | null;
}

export type TicTacToeAction = {
  type: 'PLACE_MARK';
  cellIndex: number;
};
```

---

### Step 2: Implement the Server Engine Adapter in `src/server/games/<my-game>/`

Create `src/server/games/<my-game>/engine.js`. The engine must export an adapter object matching the engine contract:

```javascript
// src/server/games/<my-game>/engine.js
export const myGameEngine = {
  id: 'my-game',
  minPlayers: 2,
  maxPlayers: 4,

  // 1. Create initial server state
  createState: (room, matchId) => {
    const players = room.players.map((p) => ({ id: p.id, name: p.name, avatarId: p.avatarId, isBot: p.isBot }));
    return {
      id: matchId,
      roomId: room.id,
      gameId: room.gameId,
      players,
      phase: 'active',
      turnPlayerId: players[0]?.id || null,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      startedAt: Date.now(),
    };
  },

  // 2. Validate and apply a player action
  applyAction: (state, userId, action, rootDir) => {
    if (state.phase !== 'active') throw new Error('Match is no longer active.');
    if (state.turnPlayerId !== userId) throw new Error('It is not your turn.');

    // Mutate state according to game rules...
    const finished = checkWinCondition(state);
    return {
      finished,
      clientResult: null, // (Optional) Private feedback object sent back to the acting user
    };
  },

  // 3. Handle timer deadline expiration
  onDeadline: (state, rootDir) => {
    // If deadline causes match completion or turn timeout:
    return { finished: false };
  },

  // 4. Automated bot action generator
  getAutomaticAction: (state) => {
    if (state.phase !== 'active') return null;
    const current = state.players.find((p) => p.id === state.turnPlayerId);
    if (!current?.isBot) return null;
    return {
      userId: current.id,
      action: { type: 'PLACE_MARK', cellIndex: pickBestMove(state) },
    };
  },

  // 5. Bot pacing delay (ms)
  getBotDelay: (state) => {
    const current = state.players.find((p) => p.id === state.turnPlayerId);
    return current?.isBot ? 500 : null;
  },

  // 6. Handle match abandonment / walkover
  onWalkover: (state, winnerId) => {
    state.phase = 'resolved';
    state.winnerId = winnerId;
    state.winReason = 'Walkover victory: opponents left the match.';
    state.finishedAt = Date.now();
  },

  // 7. Adjust state when a player leaves active game
  removePlayer: (state, userId) => {
    delete state.scores[userId];
    return true;
  },

  // 8. Final match scores
  getScores: (state) => ({ ...state.scores }),

  // 9. Structured breakdowns for the Victory Podium expanders
  getPlayerBreakdowns: (state) => {
    const result = {};
    for (const player of state.players) {
      result[player.id] = {
        score: state.scores[player.id] || 0,
        sections: [
          {
            title: 'Round Highlights',
            badge: 'STATS',
            items: [
              { label: 'Moves Made', value: 8, variant: 'primary' },
              { label: 'Accuracy', value: '100%', variant: 'neutral' },
            ],
          },
        ],
      };
    }
    return result;
  },

  // 10. Sanitize state per player (hide opponent hands/cards/secrets)
  projectState: (state, userId) => {
    // Return sanitized view visible to userId
    return state;
  },
};
```

#### Register the Server Adapter
In `src/server/games/index.js`, add your engine to `GAME_ENGINES`:

```javascript
import { myGameEngine } from './my-game/engine.js';

export const GAME_ENGINES = {
  bonegle: bonegleEngine,
  'midnight-alley': midnightAlleyEngine,
  'my-game': myGameEngine, // <-- Register here!
};
```

---

### Step 3: Implement the Frontend in `src/frontend/games/<my-game>/`

1. **Engine Component (`<MyGame>Engine.tsx`)**:
   Receives `BaseGameEngineProps`. Reads `matchState` and dispatches moves with `onGameAction(action)`.
   *Note*: The engine runs inside `GameStageFrame`'s iframe; use `event.currentTarget` or element `ownerDocument` if doing manual hit-testing or pointer capture.

2. **Rules Modal (`<MyGame>Rules.tsx`)**:
   Provides clear illustrated rules for players clicking the "RULES" button in the HUD.

3. **Manifest (`manifest.tsx`)**:
   Defines the game catalog entry:

```typescript
import { GameManifest } from '../../types';
import { MyGameEngine } from './MyGameEngine';
import { MyGameRules } from './MyGameRules';

export const myGameManifest: GameManifest = {
  id: 'my-game',
  definition: {
    id: 'my-game',
    title: 'My Game',
    subtitle: 'Tactical Showdown',
    description: 'A thrilling 2-player strategic board game.',
    minPlayers: 2,
    maxPlayers: 4,
    estimatedTimeMin: 5,
    iconName: 'Gamepad2',
    badge: 'NEW',
  },
  engine: MyGameEngine,
  rulesComponent: MyGameRules,
  hasRoundTimer: true,
  hideContinuousScoreboard: false,
};
```

4. **Register in `src/frontend/games/registry.ts`**:

```typescript
import { myGameManifest } from './my-game';

export const GAME_REGISTRY: Record<string, GameManifest> = {
  bonegle: bonegleManifest,
  'midnight-alley': midnightAlleyManifest,
  'my-game': myGameManifest, // <-- Register here!
};
```

---

### Step 4: Verification

Run tests and ensure clean compilation:

```bash
# 1. Run server tests
npm run test:server

# 2. Run TypeScript check and client build
npm run build
```

Add tests to `tests/games.test.js` validating:
- Initial state generation.
- Legal move transitions.
- Illegal move rejection.
- Bot action generation.
- Scoring and breakdown generation.
- Private state projection.

---

## What You Do NOT Need to Touch

Thanks to the decoupled architecture, adding a new game requires **zero modifications** to:
- `src/server/services/matches.js`: Handles match creation, scheduling, timers, checkpoints, and victory broadcasts automatically.
- `src/server/services/roomLifecycle.js`: Handles quorum, walkovers, and departures through the engine adapter automatically.
- `src/server/websocket/handlers.js`: Dispatches actions and relays private action feedback generically.
- `src/server/routes/rooms.js`: Validates game support and limits against `GAME_ENGINES` dynamically.
- `src/server/db/schema.js`: `game_id` is an open `VARCHAR(32)` column. No SQL migrations needed.
- `src/frontend/App.tsx`: Scores and breakdowns are mapped and passed down automatically.
- `src/frontend/components/VictoryModal.tsx`: Expander cards render whatever `sections` or `items` your game returns in `getPlayerBreakdowns`.