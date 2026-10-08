# Architecture Reference

The current source of truth is [Anadir un Juego](../../../../docs/ANADIR_JUEGO.md) and the [architecture contract](../../../../docs/GAME_ARCHITECTURE_CONTRACT.md). This reference summarizes the integration boundaries, not an alternate plugin system.

## Runtime Boundaries

| Location | Owner |
| --- | --- |
| `src/frontend/games/<id>/` | React engine, manifest, rules UI, settings UI, local presentation |
| `src/frontend/websocket/client.ts` | One browser connection, subscriptions, reconnect, action transmission |
| `src/shared/types/index.ts` | Game IDs, room/player/profile models |
| `src/shared/types/network.ts` | Action, projected match state, and event contracts |
| `src/server/games/<id>/` | Authoritative state, validation, rules, scoring, projection, bots |
| `src/server/services/matches.js` | Active match Map, persisted checkpoints, deadlines, commit and finish |
| `src/server/websocket/` | Authenticated connections, message handlers, projected broadcasts |
| `src/server/db/` | PostgreSQL pool and schema |

`src/server/index.js` composes one Node process for HTTP and WebSocket. It does not start another server per game or match. Each match has its own ID, state object, and timer.

## Lifecycle

```text
HTTP session and initial data -> open authenticated WebSocket
HTTP create/join room -> WS SUBSCRIBE_ROOM -> lobby
HTTP start -> server creates match -> WS MATCH_STARTED / MATCH_STATE
WS GAME_ACTION -> handlers -> matches service -> game rules
accepted state -> commitMatchAction -> database and projected MATCH_STATE
terminal state -> finishMatch -> database and MATCH_FINISHED
HTTP rematch -> waiting lobby -> another HTTP start creates a new match
HTTP leave -> WS UNSUBSCRIBE_ROOM; socket remains open
```

Bots and timers invoke the game through the match service, not the browser. Room subscriptions and membership are separate; the backend checks membership. Public room announcements can reach users outside the room, but match-state and chat delivery are scoped to subscribers.

## Client Contracts

Read [frontend/types/game.ts](../../../../src/frontend/types/game.ts) for `BaseGameEngineProps`, `GameManifest`, and `GameSettingsFormProps` rather than copying stale interfaces.

- `matchState` is the projected server snapshot. Narrow by `gameId` before using fields.
- `onGameAction` sends player intent through the existing connection.
- `currentUserPlayer`, `players`, `settings`, and `timeLeftSec` support presentation; local clocks do not decide expiry.
- `onPlayerScore`, `onMatchResolved`, `AbstractGameEngine`, and manifest `logic` remain legacy compatibility surfaces. They do not register or execute a new authoritative backend engine.
- `GameStageFrame` hosts a portal in an iframe; use `ownerDocument` for DOM interactions.

## Decoupled Integration Points

Games integrate with the platform via plug-and-play registries rather than ad-hoc conditional branches:

1. **Backend Engine Adapter**:
   - Create `src/server/games/<id>/engine.js` implementing the engine adapter (`createState`, `applyAction`, `onDeadline`, `getAutomaticAction`, `getBotDelay`, `onWalkover`, `onPlayerLeaveReschedule`, `removePlayer`, `getScores`, `getPlayerBreakdowns`, `projectState`).
   - Register it in `src/server/games/index.js` in `GAME_ENGINES`.
   - Core services (`matches.js`, `roomLifecycle.js`, `handlers.js`, `routes/rooms.js`) automatically delegate to the registered adapter.
2. **Frontend Manifest**:
   - Create `src/frontend/games/<id>/` with engine, rules, settings, and `manifest.tsx`.
   - Register the manifest in `src/frontend/games/registry.ts` in `GAME_REGISTRY`.
3. **Database Schema**:
   - `rooms` and `matches` use unconstrained `VARCHAR(32)` for `game_id`. No migrations are required when adding new games.
4. **Scoring & Victory Podium**:
   - The engine returns final points via `getScores(state)` and expandable details via `getPlayerBreakdowns(state)`.
   - `VictoryModal` and `App.tsx` consume structured sections (`title`, `badge`, `items`) generically.

## Privacy and Persistence

Projection must filter every secret-bearing field, including nested history. A serialized snapshot must not contain opponents' hands or private deck/seed data. Internal state stays in the match service and PostgreSQL; only projected state goes to clients.

Invalid actions must not partially mutate state. Use the existing accepted-action commit and finish pipeline so scores, room status, statistics, logs, timers, and results remain coordinated.

Do not fetch dictionaries in the browser to decide accepted submissions. Server I/O uses `ROOT_DIR` from `src/server/config.js`, independent of cwd. Imported UI assets are bundled by Vite; profile avatars have one canonical directory at `src/frontend/assets/avatars`.