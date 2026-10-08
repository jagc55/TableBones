---
name: tableskull-game-creator
description: 'Use when designing, adding, scaffolding, or integrating multiplayer games in TableSkull. Covers authoritative Node engines, React manifests, shared contracts, WebSocket transport, bots, timers, private-state projection, breakdown expanders, and regression tests.'
---

# TableSkull Game Creator

Implement new multiplayer games across `src/frontend`, `src/server`, and `src/shared` without modifying core platform services or existing games. The architecture uses an **agnostic Adapter Pattern**: games encapsulate their own rules, bot AI, scoring, and breakdown details, while the platform handles sessions, rooms, transport, and victory presentation generically.

## Read First

- [Integration guide](../../../docs/ANADIR_JUEGO.md): step-by-step walkthrough, file placement, adapter contracts, and verification.
- [Architecture reference](./reference/architecture.md): boundaries, decoupled lifecycles, and registry contracts.
- [Component catalog](./reference/component-catalog.md): current reusable UI, assets, and audio.
- [Templates](./reference/templates.md): server adapter and client skeletons.

## Architecture & Integration Principles

1. **Plug-and-Play Backend Adapter (`GAME_ENGINES` in `src/server/games/index.js`)**:
   All game lifecycle hooks (creation, action handling, deadlines, bot turns, walkovers, scoring, and podium breakdowns) are handled via the engine adapter object. Never write `if (gameId === 'my-game')` in `matches.js`, `roomLifecycle.js`, `handlers.js`, or HTTP routes.
2. **Plug-and-Play Frontend Manifest (`GAME_REGISTRY` in `src/frontend/games/registry.ts`)**:
   Lobby options, rules modals, settings components, and gameplay engines are mounted dynamically through the manifest.
3. **Database Agnosticism**:
   `rooms` and `matches` store `game_id` as `VARCHAR(32)` without restrictive `CHECK` constraints. Adding a new game requires **zero database migrations**.
4. **Generic Victory Podium & Expanders**:
   Games provide `getScores(state)` and `getPlayerBreakdowns(state)` (with `sections: [{ title, badge, items: [{ label, value, detail, variant }] }]`). The global `VictoryModal` and `App.tsx` render match scores and expandable player details completely agnostically.
5. **Private State Projection**:
   Always project state per recipient via `engine.projectState(state, userId)`. Never transmit secret information (hidden hands, private cards, unredacted history) to other players.
6. **Authoritative Server**:
   The backend creates boards/decks, manages timers, validates action legality, executes bot moves, calculates points, and declares winners. The browser engine only renders projected state and dispatches user intent via `onGameAction(action)`.

---

## Exact Steps to Add a New Game

To introduce a new game `<game-id>`, follow these exact steps:

### Step 1: Encapsulate Game Types (`src/frontend/games/<game-id>/types.ts`)
1. Create `src/frontend/games/<game-id>/types.ts` containing:
   - All internal game pieces, cards, and domain models.
   - `<GameName>MatchState` (extending or adhering to `{ gameId: '<game-id>'; roomId: string; ... }`).
   - `<GameName>Action` types.
2. In `src/shared/types/index.ts`:
   - Add your ID to `GameId` (e.g. `'bonegle' | 'midnight-alley' | 'doomed-mine' | '<my-game>' | (string & {})`).
3. In `src/shared/types/network.ts`:
   - Import `<GameName>MatchState` from `../../frontend/games/<game-id>/types` and include it in `MatchState`.
   - The platform network layer uses generic `BaseMatchState` and `GameAction` contracts; games do NOT pollute shared types with internal structures.

### Step 2: Implement the Server Engine Adapter (`src/server/games/<game-id>/`)
Create `src/server/games/<game-id>/engine.js` (and auxiliary modules like `rules.js` or `bot.js` as needed).
Export an adapter object adhering to the engine contract:

```javascript
export const myGameEngine = {
  id: 'my-game',
  minPlayers: 2,
  maxPlayers: 4,
  createState: (room, matchId) => { /* Return initial authoritative state */ },
  // (Optional) Game-specific settings validation/sanitization when host updates room settings:
  validateSettings: (settings, currentSettings) => {
    return settings;
  },
  // (Optional) Initialize turn timers or custom deadlines upon match start:
  initDeadline: (state) => { /* setDeadline(state, limitSec) */ },
  applyAction: (state, userId, action, rootDir) => {
    /* Validate and apply action. Return { finished: boolean, clientResult?: object } */
  },
  onDeadline: (state, rootDir) => {
    /* Handle turn/round expiration. Return { finished: boolean } */
  },
  getAutomaticAction: (state) => {
    /* Return bot action or automatic advance { userId, action } | null */
  },
  getBotDelay: (state) => {
    /* Return custom delay in ms before bot acts, or null */
  },
  onWalkover: (state, winnerId) => {
    /* Finalize match state if players drop below quorum */
  },
  onPlayerLeaveReschedule: (state) => {
    /* Adjust turn or timer when a player leaves an active match */
  },
  removePlayer: (state, userId) => {
    /* Clean up departed player from state */
  },
  getScores: (state) => {
    /* Return { [playerId]: scoreNumber } */
  },
  getPlayerBreakdowns: (state) => {
    /* Return { [playerId]: { score, sections: [{ title, badge, items: [{ label, value, detail, variant }] }] } } for VictoryModal expanders */
  },
  projectState: (state, userId) => {
    /* Return sanitized state visible to this specific user */
  },
};
```

Register your adapter in `src/server/games/index.js`:
```javascript
import { myGameEngine } from './my-game/engine.js';

export const GAME_ENGINES = {
  bonegle: bonegleEngine,
  'midnight-alley': midnightAlleyEngine,
  'doomed-mine': doomedMineEngine,
  'my-game': myGameEngine, // <-- Register here
};
```
*(No edits are needed in `matches.js`, `roomLifecycle.js`, `handlers.js`, or database tables!)*

### Step 3: Implement the Frontend UI (`src/frontend/games/<game-id>/`)
1. Create `src/frontend/games/<game-id>/`:
   - `types.ts`: Domain models and `<GameName>MatchState`.
   - `<GameName>Engine.tsx`: React component receiving `BaseGameEngineProps`. Reads `matchState` and dispatches actions via `onGameAction(action)`.
   - `<GameName>Rules.tsx`: Player-facing rules explaining how to play.
   - `<GameName>Settings.tsx`: (Optional) Custom settings form for room creation and lobby modal.
   - `manifest.tsx`: Defines `GameManifest` (`id`, `definition`, `engine`, `rulesComponent`, `settingsComponent`, `hasRoundTimer`, etc.).
   - `index.ts`: Barrel export.
2. Register the manifest in `src/frontend/games/registry.ts`:
```typescript
import { myGameManifest } from './my-game';

export const GAME_REGISTRY: Record<GameId, GameManifest> = {
  bonegle: bonegleManifest,
  'midnight-alley': midnightAlleyManifest,
  'doomed-mine': doomedMineManifest,
  'my-game': myGameManifest, // <-- Register here
};
```

### Step 4: Verify
Run the test suite and production build:
```bash
npm run test:server
npm run build
```
Add unit/integration tests in `tests/games.test.js` validating legal/illegal actions, turns, bots, deadlines, projection, scoring, and breakdown outputs.

---

## Completion Gate

A game is considered complete when:
1. Room creation succeeds via HTTP with valid player limits and settings.
2. The server authoritatively validates state transitions, timers, and automatic moves.
3. Private information is withheld in `projectState`.
4. The frontend UI renders projected state, sends actions, and displays authoritative results.
5. When the match finishes, final scores and player breakdown expanders display accurately in `VictoryModal`.
6. Both `npm run test:server` and `npm run build` pass without warnings or errors.