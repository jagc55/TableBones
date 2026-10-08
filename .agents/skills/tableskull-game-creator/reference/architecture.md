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

## Existing Integration Points

The backend is explicitly dispatched, not automatically registered by a React manifest:

1. `games/index.js`: `createMatchState`, `removePlayerFromMatch`, `matchScores`, and `projectMatchState`.
2. `services/matches.js`: `createActiveMatch`, `applyMatchAction`, `scheduleMatch`, `handleMatchDeadline`, automatic actions, `commitMatchAction`, and `finishMatch`.
3. `services/roomLifecycle.js`: departure, quorum/walkover, terminal phase, and deadline reset.
4. `routes/rooms.js`: allowed IDs, min/max players, and validated settings.
5. `db/schema.js` plus an existing-database migration: CHECK constraints in rooms and matches.
6. `frontend/games/registry.ts` and its barrel: manifest integration.
7. `frontend/App.tsx`: final score mapping and any new private event consumption.

Add explicit branches for the new ID; do not allow it to fall through to Midnight Alley behavior. Preserve existing games and platform features. New settings may use `customSettings`, but that does not bypass runtime validation.

## Privacy and Persistence

Projection must filter every secret-bearing field, including nested history. A serialized snapshot must not contain opponents' hands or private deck/seed data. Internal state stays in the match service and PostgreSQL; only projected state goes to clients.

Invalid actions must not partially mutate state. Use the existing accepted-action commit and finish pipeline so scores, room status, statistics, logs, timers, and results remain coordinated.

Do not fetch dictionaries in the browser to decide accepted submissions. Server I/O uses `ROOT_DIR` from `src/server/config.js`, independent of cwd. Imported UI assets are bundled by Vite; profile avatars have one canonical directory at `src/frontend/assets/avatars`.