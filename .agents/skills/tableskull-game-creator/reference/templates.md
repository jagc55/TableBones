# TableSkull Game Scaffolding Boilerplate Templates

Use these tested templates when creating a new game under `src/games/<game-id>/`.

---

## 1. `types.ts`

```typescript
import { Player, RoomSettings, BaseGameEngineProps } from '../../types';

export interface GameState {
  currentRound: number;
  activePlayerId: string;
  isGameOver: boolean;
  scores: Record<string, number>;
  // Add game-specific fields here (e.g. board, deck, dice, hands)
}

export type GameAction =
  | { type: 'MAKE_MOVE'; playerId: string; moveData: unknown }
  | { type: 'END_TURN'; playerId: string };

export interface MyGameEngineProps extends BaseGameEngineProps {
  settings?: RoomSettings;
}
```

---

## 2. `<game>Logic.ts`

```typescript
import { Player, RoomSettings, AbstractGameEngine } from '../../types';
import { GameState, GameAction } from './types';

/**
 * Concrete game logic implementing the platform's AbstractGameEngine contract.
 */
export class MyGameLogic extends AbstractGameEngine<GameState, GameAction> {
  readonly gameId = 'my-game' as const;
  readonly title = 'My New Game';

  initialize(players: Player[], settings?: RoomSettings): GameState {
    const scores: Record<string, number> = {};
    players.forEach((p) => {
      scores[p.id] = 0;
    });

    return {
      currentRound: 1,
      activePlayerId: players[0]?.id || '',
      isGameOver: false,
      scores,
    };
  }

  processAction(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'MAKE_MOVE': {
        // Apply move logic
        return { ...state };
      }
      case 'END_TURN': {
        // Cycle active player
        return { ...state };
      }
      default:
        return state;
    }
  }

  calculateScores(state: GameState): Record<string, number> {
    return { ...state.scores };
  }

  checkGameOver(state: GameState): boolean {
    return state.isGameOver;
  }
}
```

---

## 3. `<Game>Engine.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { BaseGameEngineProps } from '../../types';
import { soundstage } from '../../utils/audio';
import { Sparkles, Trophy } from 'lucide-react';
import { MyGameLogic } from './myGameLogic';
import { GameState } from './types';

const logic = new MyGameLogic();

export const MyGameEngine: React.FC<BaseGameEngineProps> = ({
  currentUserPlayer,
  players,
  settings,
  timeLeftSec,
  onPlayerScore,
  onActionNotification,
  onMatchResolved,
}) => {
  const [state, setState] = useState<GameState>(() => logic.initialize(players, settings));

  // Handle local player action
  const handleAction = () => {
    soundstage.playScoreTrumpet();
    const pts = 5;
    onPlayerScore(currentUserPlayer.id, pts);
    onActionNotification(`${currentUserPlayer.name} executed a master stroke!`);
  };

  return (
    <div className="my-game-engine-layout cel-card">
      <div className="my-game-header">
        <h3 className="woodcut-title">MY GAME ARENA</h3>
        <span className="ribbon-banner">ROUND {state.currentRound}</span>
      </div>

      <div className="my-game-board">
        {/* Render game board, cards, dice, or interactive canvas */}
      </div>

      <div className="my-game-controls">
        <button onClick={handleAction} className="btn-cel btn-brawl-primary">
          <Sparkles size={16} strokeWidth={2.8} />
          <span>PLAY MOVE</span>
        </button>
      </div>

      <style>{`
        .my-game-engine-layout {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background-color: var(--color-canvas-parchment);
        }
        .my-game-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .my-game-board {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 280px;
          width: 100%;
          background-color: var(--color-parchment-deep);
          border: var(--border-frame);
          border-radius: 12px;
          box-shadow: var(--shadow-cel-sm);
        }
        .my-game-controls {
          display: flex;
          gap: 12px;
        }
      `}</style>
    </div>
  );
};
```

---

## 4. `<Game>Rules.tsx`

```typescript
import React from 'react';
import { HelpCircle } from 'lucide-react';

export const MyGameRules: React.FC = () => {
  return (
    <>
      <div className="codex-header">
        <HelpCircle size={32} strokeWidth={2.6} />
        <h3 className="woodcut-title codex-title">MY GAME: CODEX RULES</h3>
      </div>

      <div className="codex-body">
        <div className="codex-section">
          <h4>1. OVERVIEW & OBJECTIVE</h4>
          <p>Description of core game flow, turn order, and win conditions.</p>
        </div>

        <div className="codex-section">
          <h4>2. SCORING LEDGER</h4>
          <div className="codex-scoring-grid">
            <div className="codex-score-row">
              <span className="score-rule-badge badge-pos">STANDARD MOVE</span>
              <p>+5 Points for successful maneuver.</p>
            </div>
            <div className="codex-score-row">
              <span className="score-rule-badge badge-bonus">SPECIAL BONUS</span>
              <p>+15 Points for combo execution.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
```

---

## 5. `<Game>Settings.tsx`

```typescript
import React from 'react';
import { GameSettingsFormProps } from '../../types';
import { soundstage } from '../../utils/audio';

export const MyGameSettings: React.FC<GameSettingsFormProps> = ({
  settings,
  onUpdateSetting,
  isHost,
  stepOffset = 4,
}) => {
  return (
    <div className="form-group">
      <label className="group-label">{stepOffset}. SPECIAL GAME OPTION</label>
      <div className="clock-options-row">
        {/* Custom option chips */}
      </div>
    </div>
  );
};
```

---

## 6. `manifest.tsx`

```typescript
import { GameManifest, Room } from '../../types';
import { MyGameEngine } from './MyGameEngine';
import { MyGameRules } from './MyGameRules';
import { MyGameSettings } from './MyGameSettings';
import { MyGameLogic } from './myGameLogic';

export const myGameManifest: GameManifest = {
  id: 'my-game',
  definition: {
    id: 'my-game',
    title: 'My Game Title',
    subtitle: 'Catchy Subtitle',
    description: 'Crisp 1-2 sentence description for room cards and lobby.',
    minPlayers: 2,
    maxPlayers: 4,
    estimatedTimeMin: 5,
    iconName: 'Swords',
    badge: 'NEW',
  },
  hasRoundTimer: true,
  hideContinuousScoreboard: false,
  engine: MyGameEngine,
  rulesComponent: MyGameRules,
  settingsComponent: MyGameSettings,
  lobbyMetaChips: (room: Room) => (
    <span className="meta-chip">
      <strong>Mode:</strong> Standard
    </span>
  ),
  logic: new MyGameLogic(),
};
```

---

## 7. `index.ts`

```typescript
export * from './types';
export * from './myGameLogic';
export * from './MyGameEngine';
export * from './MyGameRules';
export * from './MyGameSettings';
export * from './manifest';
```
