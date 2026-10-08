---
name: tableskull-game-creator
description: 'Use when designing, adding, scaffolding, or integrating multiplayer games in TableSkull. Covers authoritative Node engines, React manifests, shared contracts, WebSocket transport, PostgreSQL migrations, bots, timers, private-state projection, and regression tests.'
---

# TableSkull Game Creator

Implement new multiplayer games across `src/frontend`, `src/server`, and `src/shared` without changing existing games. The server decides outcomes; the browser renders projected state and sends actions.

## Read First

- [Integration guide](../../../docs/ANADIR_JUEGO.md): file placement, connections, registration, database migrations, and verification.
- [Architecture reference](./reference/architecture.md): actual boundaries and backend integration points.
- [Component catalog](./reference/component-catalog.md): current reusable UI, assets, and audio.
- [Templates](./reference/templates.md): server and client skeletons; adapt them to the agreed rules.

Only Bonegle and Midnight Alley currently exist. Do not reference removed games or the old `src/games` / root `server.js` layout.

## Non-Negotiable Boundaries

1. Game rules run in `src/server/games/<game-id>/`. WebSocket handlers transport actions to the match service; they do not decide rules.
2. `src/frontend/games/<game-id>/` holds UI, player-facing rules, settings, and the manifest. Its engine reads `matchState` and invokes `onGameAction`.
3. Shared platform models and action/state/event contracts live in `src/shared/types`. They must not import React, browser globals, Node APIs, or either runtime layer.
4. Board creation, shuffling, bots, authoritative deadlines, score calculation, and winners belong to the backend. Do not seed or initialize a match from a React mount.
5. Do not use `onPlayerScore` or `onMatchResolved` to control authoritative results. Those callbacks and `AbstractGameEngine` remain for legacy compatibility, not as the current integration mechanism.
6. Project state per recipient. Never send another player's hidden hand, private deck, secrets, or unredacted history through the socket.
7. Identify the actor from the authenticated session; do not accept client-supplied identity, points, or winner as authoritative. Validate JSON at runtime even when TypeScript contracts exist.
8. Preserve existing manifest-driven shell components where possible. Change explicit score mapping or feedback handling when a new contract requires it; do not promise integration by two registry edits.

## Workflow

### 1. Clarify Rules

Resolve player counts, phases, legal actions, turn order, deadlines, score visibility, hidden information, scoring/ties, bots, disconnects, walkovers, and room settings. Ask concise questions using the available clarification tool only when mechanics remain ambiguous. Do not invent important rules.

Define which data is internal to the server and which fields each player can see before implementing the state.

### 2. Define Contracts and State Transitions

- Add the ID to `src/shared/types/index.ts` (`GameId`).
- Add the projected state to `MatchState` and actions to `GameAction` in `src/shared/types/network.ts`.
- Keep `gameId` as the state discriminator; use distinct action names and minimal intent payloads.
- Add `NetworkEvent` variants only when feedback cannot be represented in the standard state. Wire any private event through both emission and frontend consumption.
- Write down transitions, validation failures, deadlines, terminal phase, and winner resolution.

### 3. Implement the Backend First

Create `src/server/games/<game-id>/engine.js`. Split rules, deck/board, bots, and projection into neighboring modules only when this removes real complexity. Backend code currently uses JavaScript ESM with `.js` imports.

Implement initialization, action validation/application, score extraction, finalization, per-player projection, player removal, and automatic actions. Validate before mutating state. Keep SQL and socket writes in services/transport, not pure game rules.

Connect all applicable control points:

| File | Required integration |
| --- | --- |
| `src/server/games/index.js` | Initialization, score extraction, player removal, and projection dispatch |
| `src/server/services/matches.js` | Action dispatch, accepted-action commit, deadlines, scheduling, bots, finish handling |
| `src/server/services/roomLifecycle.js` | Removal, quorum, walkover, phase termination, rescheduling |
| `src/server/routes/rooms.js` | Allowed IDs, player limits, settings validation on create/update |
| `src/server/config.js` | New shared defaults if needed |
| `src/server/db/schema.js` | Both game_id CHECK constraints for new installations |

Existing dispatch often treats non-Bonegle states as Midnight Alley. Add explicit handling before those fallbacks. Reuse `commitMatchAction` and `finishMatch`; do not implement another persistence pipeline.

For installed databases, prepare a non-destructive migration for both `rooms` and `matches` CHECK constraints. `CREATE TABLE IF NOT EXISTS` does not modify an existing CHECK. Preserve all current IDs and verify the migration before deploying a new ID.

### 4. Build and Register the UI

Create the engine, manifest, index exports, rules view, and optional settings/components under `src/frontend/games/<game-id>/`. Reuse the current visual language, Lucide icons, `AvatarIcon`, and shared `soundstage`.

Register the manifest in `src/frontend/games/registry.ts` and export it from `src/frontend/games/index.ts`. Align its player limits with backend limits.

Review `src/frontend/App.tsx` score mapping in `MATCH_FINISHED`: it currently distinguishes Bonegle breakdowns from `cumulativeScores`. Adapt only the necessary mapping if the new state uses a different format. Connect any new private feedback event as well.

The engine is rendered through a React portal inside `GameStageFrame`'s iframe. Use element `ownerDocument` and its window for pointer events and geometry. Local state is for selection, animation, sorting, and modals, not canonical match state. Effects must not restart the server board or apply gameplay on rerenders. Key presentation effects to meaningful match/phase changes and clean up listeners/timers; do not blindly omit dependencies or require callback refs everywhere.

### 5. Verify and Document

```bash
npm run build
npm run test:server
```

Extend the existing tests rather than creating a test file for every helper:

- `tests/games.test.js`: initialization, legal/illegal actions, turn order, scoring/ties, private-state projection, bots, deadlines, player removal, and finish idempotence where applicable.
- `tests/backend.test.js`: allowed ID, room creation/join, subscriptions, actions, finish, persistence, rematch, quorum and bot-only closure, plus unauthorized actions and isolation.

Build first: the static-serving test uses `dist`. Set `TABLEBONES_TEST_DATABASE_URL` only to a suitable test connection for database integration. The existing test creates/drops an isolated schema and requires schema creation privileges. Database checks are skipped without this variable; report skipped checks instead of claiming full coverage. `BASELINE_ENGINE_FILE` is optional for refactor comparisons and is not needed to add a game.

Respect user limits on manual/browser testing. Update game rules, integration docs, and relevant manifests; do not add unrelated features or refactor the platform as a prerequisite.

## Completion Gate

A game is complete only when its ID is accepted by installed and fresh databases, HTTP creation succeeds, the server owns legal state transitions and timers, private data stays private, the registered UI sends actions and renders authoritative results, and focused tests pass. Appearing in the catalog alone is not completion.