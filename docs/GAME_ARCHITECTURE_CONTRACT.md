# TableSkull Game Architecture Contract

This document describes the current TableSkull runtime contract. It is the source of truth for the React client, Node.js server, PostgreSQL persistence, and room-scoped WebSocket protocol.

## 1. Runtime Architecture

```
React + Vite client
  |- App, rooms, lobby, arena, modals, chat
  |- GameStageFrame iframe -> active game engine
  `- authenticated room-scoped WebSocket
             |
             v
Node.js server
  |- HTTP API: sessions, profiles, rooms, chat, achievements
  |- WebSocket: room events and game actions
  |- authoritative match state, timers, bots, scoring, winners
  `- src/server/games/: Bonegle and Midnight Alley rules
             |
             v
PostgreSQL
  |- users, sessions, rooms, room players, chat
  |- active match checkpoints and completed match history
  `- achievements and player statistics
```

Development PostgreSQL runs in Docker through `docker compose up -d postgres`. The server defaults to `postgresql://tableskull:tableskull@localhost:5432/tableskull`.

The runtime entry point is `src/server/index.js`; it composes routes, services, database initialization, and the WebSocket server. Browser code lives in `src/frontend`. Transport-independent data contracts live in `src/shared/types` and must not import browser or server modules. `src/frontend/websocket` and `src/server/websocket` implement the two ends of the same connection.

## 2. Ownership Rules

- The server is authoritative for game setup, timers, turn legality, dictionaries, score calculation, bots, match completion, and walkovers.
- The client only renders the state supplied by the server and sends declared game actions.
- Active match state is kept in server memory for responsiveness and checkpointed to PostgreSQL after each action.
- Clients must not generate boards, decks, scores, or winners locally.
- Current games are `bonegle` and `midnight-alley`. Removed games must not be added back to types, manifests, or room creation controls without a complete server implementation.

## 3. Main Frame and Game Engines

`App.tsx` owns authenticated user state, room navigation, chat history, WebSocket subscription, match state, and application-level feedback.

`GameArena.tsx` owns the room HUD, countdown display, chat panel, leaving a match, and mounts the active engine through `GameStageFrame`.

`GameStageFrame.tsx` renders engines through a React portal in an isolated iframe. Engines must use their `ownerDocument` for pointer hit testing because the iframe has a different document from the main application.

Game engines receive `BaseGameEngineProps`:

```typescript
interface BaseGameEngineProps {
  gameId?: GameId;
  roomCode?: string;
  roomId?: string;
  currentUserPlayer: Player;
  players: Player[];
  settings?: RoomSettings;
  timeLeftSec?: number;
  matchState?: MatchState | null;
  onGameAction?: (action: GameAction) => void;

  // Legacy platform callbacks retained for generic engine compatibility.
  onPlayerScore: (playerId: string, addedScore: number) => void;
  onActionNotification: (text: string) => void;
  onLeaveMatch?: () => void;
  onMatchResolved?: (winner: Player, reason: string, finalPlayers?: Player[]) => void;
}
```

New engines must use `matchState` and `onGameAction` for gameplay. The legacy callbacks do not make the client authoritative.

## 4. Match State and Actions

The action union is defined in `src/shared/types/network.ts`:

```typescript
type GameAction =
  | { type: 'SUBMIT_WORD'; word: string; path: Array<{ row: number; col: number }> }
  | { type: 'PLACE_BID'; bid: number }
  | { type: 'PLAY_CARD'; cardId: string; chameleonChoice?: 'gangster' | 'alibi' }
  | { type: 'ADVANCE_TRICK' }
  | { type: 'NEXT_ROUND' };
```

### Bonegle

- The server creates the board from the match ID, validates every contiguous path, checks the selected dictionary, detects duplicates, and resolves scoring at the deadline.
- The client may draw a local drag path for immediate interaction, but it must submit the path for validation when released.
- A private `BONEGLE_WORD_RESULT` event reports `valid`, `duplicate`, or `invalid` feedback to the submitting player. This feedback belongs in the Bonegle engine, not in a global toast.

### Midnight Alley

- The server owns the deck, hands, bids, legal card checks, trick results, bots, round transitions, and final scores.
- The server projects each state so a player only receives their own hand and public information about others.

## 5. WebSocket Protocol

Sockets authenticate with a server-issued session token. Match state and chat are scoped to subscribed rooms; public room announcements can also reach authenticated clients outside those rooms.

```typescript
type NetworkEvent =
  | { type: 'CONNECTED'; userId: string }
  | { type: 'ROOM_UPDATED'; room: Room }
  | { type: 'MATCH_STARTED'; room: Room }
  | { type: 'MATCH_STATE'; roomId: string; state: MatchState }
  | { type: 'MATCH_FINISHED'; roomId: string; state: MatchState; room?: Room }
  | { type: 'BONEGLE_WORD_RESULT'; roomId: string; word: string; status: 'valid' | 'duplicate' | 'invalid' }
  | { type: 'ROOM_CLOSED'; roomId: string }
  | { type: 'CHAT_MESSAGE'; roomId: string; chatMessage: ChatMessage }
  | { type: 'ERROR'; message: string };
```

Clients send `SUBSCRIBE_ROOM`, `UNSUBSCRIBE_ROOM`, `GAME_ACTION`, and `CHAT_SEND`. The server rejects actions from non-members and broadcasts projected state only to subscribed room members. Transport handlers in `src/server/websocket/handlers.js` call services; game rules run in `src/server/games`, not in the WebSocket layer.

## 6. Room Lifecycle

Room status transitions are:

```
waiting -> in_progress -> finished
waiting/in_progress/finished -> closed
```

- A public browser lists public `waiting` and `in_progress` rooms.
- Rooms in progress are visible but locked: clients cannot join them even if player capacity remains.
- The browser offers an explicit filter for waiting rooms only; the open-slots filter shows only rooms that are actually joinable.
- Returning to the room browser refreshes the public room list from the server.
- When the final human leaves, a room closes even if bots remain. Active matches are abandoned and timers are cleaned up.
- If an active room still has enough human or bot contenders after a leave, the server updates the match. If it drops below quorum with one contender, it resolves as a walkover where appropriate.

## 7. Interaction and Feedback Requirements

Bonegle renders local selection feedback inside the iframe:

- Each letter uses an invisible circular hit target smaller than the visible square tile.
- Adjacent horizontal, vertical, and diagonal cells are valid selections.
- A yellow SVG path connects selected cells only while a pointer drag is active.
- Pointer release, cancellation, or lost capture must clear the local path line.
- The current word appears in `TRACE A WORD`. Server feedback turns it green for valid, orange for duplicate, and red for invalid before returning to the idle label.
- Bonegle selection, backtracking, submission, success, duplicate, and invalid states use the shared procedural soundstage when audio is enabled.

## 8. Adding a Game

See [Adding a New Game](ANADIR_JUEGO.md) for the complete integration guide and adapter templates.

Thanks to the decoupled adapter architecture:
1. Add the game ID to `src/shared/types/index.ts` and declare state/action types in `src/shared/types/network.ts`.
2. Implement the authoritative server engine adapter in `src/server/games/<game-id>/engine.js` (`createState`, `applyAction`, `onDeadline`, `getAutomaticAction`, `removePlayer`, `getScores`, `getPlayerBreakdowns`, `projectState`).
3. Register the adapter in `src/server/games/index.js` under `GAME_ENGINES`.
4. Create the client UI in `src/frontend/games/<game-id>/` (`manifest.tsx`, engine, rules).
5. Register the manifest in `src/frontend/games/registry.ts` under `GAME_REGISTRY`.
6. Verify via `npm run test:server` and `npm run build`.

No modifications are needed to core match services, room lifecycle, WebSocket handlers, HTTP routes, or database tables.