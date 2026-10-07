import React from 'react';
import { GameId, BaseGameEngineProps } from '../types';
import { getGameManifest } from '../games';
import { soundstage } from '../utils/audio';
import { Sparkles } from 'lucide-react';

export interface GenericGameEngineProps extends BaseGameEngineProps {
  gameId: GameId;
}

export const GenericGameEngine: React.FC<GenericGameEngineProps> = (props) => {
  const { gameId, currentUserPlayer, onPlayerScore, onActionNotification } = props;

  const manifest = getGameManifest(gameId);
  if (manifest?.engine) {
    const EngineComponent = manifest.engine;
    return <EngineComponent {...props} />;
  }

  return (
    <div className="generic-table-stage cel-card">
      <div className="generic-table-header">
        <h3 className="woodcut-title">TACTICAL GAME TABLE</h3>
        <span className="generic-turn-info">Active match in progress</span>
      </div>

      <div className="generic-board-visual">
        <div className="board-mat">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              onClick={() => {
                soundstage.playTap();
                onPlayerScore(currentUserPlayer.id, 4);
                onActionNotification(`${currentUserPlayer.name} placed a tactical piece on cell #${i + 1}`);
              }}
              className={`board-cell ${i % 2 === 0 ? 'cell-light' : 'cell-dark'}`}
              title="Click to execute move"
            >
              <span className="cell-num">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="generic-actions-strip">
        <button
          onClick={() => {
            soundstage.playScoreTrumpet();
            onPlayerScore(currentUserPlayer.id, 6);
            onActionNotification(`${currentUserPlayer.name} captured an opponent piece!`);
          }}
          className="btn-cel btn-brawl-primary"
        >
          <Sparkles size={16} strokeWidth={2.8} />
          <span>EXECUTE MOVE (+6 PTS)</span>
        </button>
      </div>

      <style>{`
        .generic-table-stage {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background-color: var(--color-canvas-parchment);
          align-items: center;
          width: 100%;
        }
        .generic-table-header {
          text-align: center;
        }
        .generic-turn-info {
          font-family: var(--font-theatre-rye);
          font-size: 11px;
          color: var(--color-cuphead-red);
          letter-spacing: 0.08em;
        }
        .generic-board-visual {
          display: flex;
          justify-content: center;
          padding: 10px;
          background-color: var(--color-parchment-deep);
          border: var(--border-frame);
          border-radius: 14px;
          box-shadow: var(--shadow-cel-md);
        }
        .board-mat {
          display: grid;
          grid-template-columns: repeat(4, 56px);
          grid-template-rows: repeat(4, 56px);
          gap: 4px;
        }
        .board-cell {
          border: 2px solid var(--color-ink-black);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.08s ease;
        }
        .board-cell:hover {
          transform: scale(1.05);
        }
        .cell-light {
          background-color: var(--color-glove-ivory);
        }
        .cell-dark {
          background-color: #2b1e17;
        }
        .cell-light .cell-num {
          color: var(--color-ink-black);
        }
        .cell-dark .cell-num {
          color: var(--color-glove-ivory);
        }
        .cell-num {
          font-family: var(--font-luckiest-guy);
          font-size: 16px;
        }
        .generic-actions-strip {
          display: flex;
          justify-content: center;
          width: 100%;
        }
      `}</style>
    </div>
  );
};
