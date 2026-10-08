# Authoritative Game Templates

These are structural examples for a hypothetical `my-game`, not a playable implementation or pre-verified boilerplate. Replace the sample contracts and implement rule helpers from the agreed rules. Extend the current unions and backend dispatch before compiling or registering the UI. See [the integration guide](../../../../docs/ANADIR_JUEGO.md) for every wiring point.

## 1. Shared Contracts

Declare game-specific domain data in `src/shared/types/my-game.ts` when useful, then import and add its state/actions to `src/shared/types/network.ts`. Add the ID to `GameId` in `src/shared/types/index.ts`.

```typescript
export interface MyGameMatchState {
  gameId: 'my-game';
  roomId: string;
  phase: 'active' | 'resolved';
  turnPlayerId: string | null;
  scores: Record<string, number>;
  deadline: number | null;
  winnerId?: string | null;
  winReason?: string;
}

export type MyGameAction = {
  type: 'MY_GAME_MOVE';
  moveId: string;
};
```

These are visible fields only. Define private server data separately and project it explicitly; never transmit all internal state simply to satisfy a UI type.

## 2. Backend Engine

`src/server/games/my-game/engine.js` imports game-specific pure rule helpers that must be implemented and tested. In this example, `applyMove` returns `{ finished: boolean }` and sets the terminal state/winner when appropriate. It does not write SQL or emit events.

```javascript
import { initializePosition, isLegalMove, applyMove } from './rules.js';

export const createMyGameState = (room, matchId) => {
  const players = room.players.map((player) => ({
    id: player.id,
    name: player.name,
    avatarId: player.avatarId,
    isBot: player.isBot,
  }));
  return {
    id: matchId,
    roomId: room.id,
    gameId: 'my-game',
    players,
    phase: 'active',
    turnPlayerId: players[0]?.id ?? null,
    scores: Object.fromEntries(players.map((player) => [player.id, 0])),
    position: initializePosition(room.settings, players),
    deadline: null,
    startedAt: Date.now(),
  };
};

export const submitMyGameAction = (state, userId, action) => {
  if (state.phase !== 'active') throw new Error('Match is no longer active.');
  if (!state.players.some((player) => player.id === userId)) throw new Error('Match membership required.');
  if (state.turnPlayerId !== userId) throw new Error('It is not your turn.');
  if (action.type !== 'MY_GAME_MOVE' || typeof action.moveId !== 'string') {
    throw new Error('Invalid move action.');
  }
  if (!isLegalMove(state, userId, action.moveId)) throw new Error('Illegal move.');
  return applyMove(state, userId, action.moveId);
};
```

Validate before mutating. Define deadlines with the server deadline helper and connect them in the match service; `deadline: null` means this skeleton has no scheduled expiry yet. Add removal, scoring and bot helpers as the game's rules require. Never accept `userId` from the action payload.

## 3. Projection

`src/server/games/my-game/projection.js` can return an explicit allowlist of visible fields. Extend both this function and the visible contract with a sanitized board/hand only when needed.

```javascript
export const projectMyGameState = (state, userId) => ({
  gameId: state.gameId,
  roomId: state.roomId,
  phase: state.phase,
  turnPlayerId: state.turnPlayerId,
  scores: { ...state.scores },
  deadline: state.deadline,
  winnerId: state.winnerId,
  winReason: state.winReason,
});
```

`userId` selects private visible data if the game has it; remove the unused parameter for entirely public games. Do not include internal `position` until its contents are projected safely. Filter nested history as well.

## 4. React Engine

`src/frontend/games/my-game/MyGameEngine.tsx` renders the projected state and requests a move. The sample move ID is a placeholder; expose legal controls based on the game's visible data.

```tsx
import type { FC } from 'react';
import { Play } from 'lucide-react';
import type { BaseGameEngineProps } from '../../types';
import { soundstage } from '../../utils/audio';

export const MyGameEngine: FC<BaseGameEngineProps> = ({
  currentUserPlayer,
  matchState,
  onGameAction,
}) => {
  const match = matchState?.gameId === 'my-game' ? matchState : null;
  if (!match) return <div className="cel-card">WAITING FOR THE MATCH</div>;
  const canMove = match.phase === 'active' && match.turnPlayerId === currentUserPlayer.id;
  return (
    <div className="my-game-engine">
      <button
        type="button"
        className="btn-cel btn-brawl-primary"
        disabled={!canMove}
        onClick={() => {
          soundstage.playTap();
          onGameAction?.({ type: 'MY_GAME_MOVE', moveId: 'replace-with-selected-move' });
        }}
      >
        <Play size={16} />
        Play Move
      </button>
    </div>
  );
};
```

No client-side rules instance, canonical board initialization, bot interval, score callback or winner callback is involved. Local selection and animation state may be added without replacing `matchState`.

## 5. Manifest and UI Exports

`src/frontend/games/my-game/manifest.tsx` connects the UI and player-facing rules to the shell. The example min/max must also be implemented in the room route validation.

```tsx
import type { GameManifest } from '../../types';
import { MyGameEngine } from './MyGameEngine';
import { MyGameRules } from './MyGameRules';

export const myGameManifest: GameManifest = {
  id: 'my-game',
  definition: {
    id: 'my-game',
    title: 'My Game',
    subtitle: 'Replace with the game category',
    description: 'Replace with the game objective.',
    minPlayers: 2,
    maxPlayers: 4,
    estimatedTimeMin: 5,
    iconName: 'Swords',
    badge: 'NEW',
  },
  hasRoundTimer: false,
  hideContinuousScoreboard: false,
  engine: MyGameEngine,
  rulesComponent: MyGameRules,
};
```

Implement `MyGameRules.tsx` using neighboring rules views. Add a `GameSettingsFormProps` component only when there are custom controls, and validate those settings on the backend. Do not attach a legacy `logic: new AbstractGameEngineSubclass()` and assume it registers a server engine.

`src/frontend/games/my-game/index.ts`:

```typescript
export { myGameManifest } from './manifest';
export { MyGameEngine } from './MyGameEngine';
```

Import the manifest into `src/frontend/games/registry.ts` and add `'my-game': myGameManifest` to `GAME_REGISTRY`. Export the game from `src/frontend/games/index.ts` if following the existing barrel convention.

## 6. Backend Wiring Is Required

Import the new functions in `src/server/games/index.js` and add explicit dispatch for initialization, projection, score extraction and removal. Update the match service action/deadline/bot branches, room lifecycle, allowed IDs, limits, settings, both SQL CHECKs, and an installed-database migration. The templates do not install those branches automatically.

The existing `GAME_ACTION` handler can remain generic. For normal actions, the match service applies the game action and invokes `commitMatchAction(match, result.finished)`. Projection is called by the broadcaster per user. Extend transport only for new event semantics, not for game rules.

Adapt frontend `MATCH_FINISHED` score mapping if this game's `scores` field does not match the existing `cumulativeScores` format. Update state/action unions before compiling the TSX example. Add focused game and backend tests before marking the game complete.