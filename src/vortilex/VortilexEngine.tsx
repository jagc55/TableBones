import React, { useState, useEffect } from 'react';
import { BaseGameEngineProps } from '../types';
import { soundstage } from '../utils/audio';
import { RotateCcw, Check, AlertCircle } from 'lucide-react';
import { INITIAL_VORTILEX_GRID, calculateVortilexWordScore } from './vortilexLogic';
import { VortilexCoord, VortilexFeedback } from './types';

export const VortilexEngine: React.FC<BaseGameEngineProps> = ({
  currentUserPlayer,
  onPlayerScore,
  onActionNotification,
}) => {
  const [grid] = useState<string[][]>(INITIAL_VORTILEX_GRID);
  const [selectedCoords, setSelectedCoords] = useState<VortilexCoord[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<VortilexFeedback | null>(null);

  useEffect(() => {
    if (!feedbackMsg) return;
    const t = setTimeout(() => setFeedbackMsg(null), 2500);
    return () => clearTimeout(t);
  }, [feedbackMsg]);

  const handleTileClick = (r: number, c: number) => {
    soundstage.playTap();

    if (
      selectedCoords.length > 0 &&
      selectedCoords[selectedCoords.length - 1].r === r &&
      selectedCoords[selectedCoords.length - 1].c === c
    ) {
      setSelectedCoords(selectedCoords.slice(0, -1));
      return;
    }

    const alreadySelected = selectedCoords.some((coord) => coord.r === r && coord.c === c);
    if (alreadySelected) {
      soundstage.playSlideDown();
      setFeedbackMsg({ text: 'Tile already connected in current word!', isError: true });
      return;
    }

    if (selectedCoords.length > 0) {
      const last = selectedCoords[selectedCoords.length - 1];
      const rowDiff = Math.abs(last.r - r);
      const colDiff = Math.abs(last.c - c);
      if (rowDiff > 1 || colDiff > 1) {
        soundstage.playSlideDown();
        setFeedbackMsg({ text: 'Must connect to an adjacent die!', isError: true });
        return;
      }
    }

    setSelectedCoords([...selectedCoords, { r, c }]);
  };

  const currentConstructedWord = selectedCoords
    .map((coord) => grid[coord.r][coord.c])
    .join('');

  const handleWallopWord = () => {
    const word = currentConstructedWord;
    if (word.length < 3) {
      soundstage.playSlideDown();
      setFeedbackMsg({ text: 'Words require at least 3 letters!', isError: true });
      return;
    }

    if (foundWords.includes(word)) {
      soundstage.playBulbHorn();
      setFeedbackMsg({ text: `Already claimed "${word}" this round!`, isError: true });
      setSelectedCoords([]);
      return;
    }

    const score = calculateVortilexWordScore(word);
    soundstage.playScoreTrumpet();
    setFoundWords([word, ...foundWords]);
    setSelectedCoords([]);
    onPlayerScore(currentUserPlayer.id, score);
    onActionNotification(`${currentUserPlayer.name} walloped "${word}" for +${score} pts!`);
    setFeedbackMsg({ text: `WALLOP! "${word}" scored +${score} PTS!` });
  };

  const handleClearPath = () => {
    soundstage.playTap();
    setSelectedCoords([]);
  };

  return (
    <div className="vortilex-stage">
      {/* Top Word Capsule */}
      <div className="word-capsule-strip">
        <div className="capsule-left">
          <span className="capsule-label">CONNECTED TILES:</span>
          <div className="capsule-word-display">
            {currentConstructedWord ? (
              <span className="constructed-word-text">{currentConstructedWord}</span>
            ) : (
              <span className="capsule-placeholder">Tap adjacent letter dice to build words...</span>
            )}
          </div>
        </div>

        <div className="capsule-actions">
          <button
            onClick={handleClearPath}
            disabled={selectedCoords.length === 0}
            className="btn-cel btn-brawl-neutral btn-sm"
            title="Clear current tile path"
          >
            <RotateCcw size={14} strokeWidth={2.8} />
            <span>CLEAR</span>
          </button>
          <button
            onClick={handleWallopWord}
            disabled={selectedCoords.length < 3}
            className="btn-cel btn-brawl-primary btn-sm wallop-btn"
            title="Submit word"
          >
            <Check size={16} strokeWidth={2.8} />
            <span>
              SUBMIT (
              {currentConstructedWord.length >= 3
                ? `+${calculateVortilexWordScore(currentConstructedWord)} PTS`
                : '3+ LTRS'}
              )
            </span>
          </button>
        </div>
      </div>

      {/* Toast feedback banner */}
      {feedbackMsg && (
        <div className={`engine-feedback ${feedbackMsg.isError ? 'fb-error' : 'fb-success'}`}>
          {feedbackMsg.isError ? <AlertCircle size={15} strokeWidth={3} /> : <Check size={15} strokeWidth={3} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Letter Dice Grid */}
      <div className="dice-grid-wrap">
        <div className="dice-board-frame">
          {grid.map((row, rIdx) => (
            <div key={rIdx} className="grid-row">
              {row.map((letter, cIdx) => {
                const selectedIdx = selectedCoords.findIndex(
                  (coord) => coord.r === rIdx && coord.c === cIdx
                );
                const isSelected = selectedIdx !== -1;
                const isHead = selectedIdx === selectedCoords.length - 1;

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => handleTileClick(rIdx, cIdx)}
                    className={`die-tile ${isSelected ? 'tile-in-path' : ''} ${
                      isHead ? 'tile-path-head' : ''
                    }`}
                    aria-label={`Letter ${letter}`}
                  >
                    <span className="die-letter">{letter}</span>
                    {isSelected && <span className="tile-step-indicator">{selectedIdx + 1}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Word Hit List */}
      <div className="hits-strip">
        <span className="hits-title">ROUND WORDS ({foundWords.length}):</span>
        <div className="hits-chips-row">
          {foundWords.length === 0 ? (
            <span className="hits-none">No words registered yet this round.</span>
          ) : (
            foundWords.map((w, idx) => (
              <span key={idx} className="hit-chip">
                <strong>{w}</strong>
                <small>+{calculateVortilexWordScore(w)}pt</small>
              </span>
            ))
          )}
        </div>
      </div>

      <style>{`
        .vortilex-stage {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          width: 100%;
        }
        .word-capsule-strip {
          width: 100%;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: 12px;
          padding: 10px 16px;
          box-shadow: var(--shadow-cel-sm);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .capsule-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .capsule-label {
          font-family: var(--font-theatre-rye);
          font-size: 9.5px;
          letter-spacing: 0.08em;
          color: var(--color-cuphead-red);
        }
        .capsule-word-display {
          display: flex;
          align-items: center;
          min-height: 30px;
        }
        .constructed-word-text {
          font-family: var(--font-luckiest-guy);
          font-size: 24px;
          letter-spacing: 0.12em;
          color: var(--color-text-main);
          line-height: 1;
        }
        .capsule-placeholder {
          font-family: var(--font-typewriter-elite);
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .capsule-actions {
          display: flex;
          gap: 8px;
        }
        .wallop-btn {
          font-size: 14.5px;
          padding: 6px 14px;
        }
        .engine-feedback {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 8px;
          font-family: var(--font-comic-fredoka);
          font-size: 13px;
          font-weight: 700;
          box-shadow: var(--shadow-cel-sm);
        }
        .fb-success {
          background-color: var(--color-status-success-bg);
          color: var(--color-status-success-text);
          border: 1.5px solid var(--color-status-success-text);
        }
        .fb-error {
          background-color: var(--color-status-error-bg);
          color: var(--color-status-error-text);
          border: 1.5px solid var(--color-status-error-text);
        }
        .dice-grid-wrap {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .dice-board-frame {
          background-color: var(--color-parchment-deep);
          border: var(--border-frame);
          border-radius: 16px;
          padding: 12px;
          box-shadow: var(--shadow-cel-lg);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .grid-row {
          display: flex;
          gap: 8px;
        }
        .die-tile {
          width: 62px;
          height: 62px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: var(--radius-tile);
          box-shadow: var(--shadow-cel-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          user-select: none;
          transition: transform 0.08s ease, background-color 0.1s ease;
        }
        .die-tile:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-cel-md);
        }
        .tile-in-path {
          background-color: var(--color-golden-buttercup);
          transform: scale(1.06) rotate(1deg);
        }
        .tile-path-head {
          background-color: var(--color-cuphead-red) !important;
          color: var(--color-glove-ivory) !important;
          transform: scale(1.1) rotate(-1deg);
        }
        .tile-path-head .die-letter {
          color: var(--color-glove-ivory);
        }
        .die-letter {
          font-family: var(--font-luckiest-guy);
          font-size: 28px;
          color: var(--color-text-main);
          line-height: 1;
        }
        .tile-step-indicator {
          position: absolute;
          top: 3px;
          right: 3px;
          font-family: var(--font-theatre-rye);
          font-size: 8.5px;
          background-color: var(--color-ink-stroke);
          color: var(--color-glove-ivory);
          width: 14px;
          height: 14px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hits-strip {
          width: 100%;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-thin);
          border-radius: 10px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          overflow-x: auto;
        }
        .hits-title {
          font-family: var(--font-theatre-rye);
          font-size: 9.5px;
          letter-spacing: 0.08em;
          color: var(--color-cuphead-red);
          flex-shrink: 0;
        }
        .hits-chips-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .hit-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background-color: var(--color-parchment-deep);
          border: 1.5px solid var(--color-ink-black);
          border-radius: 6px;
          font-family: var(--font-comic-fredoka);
          font-size: 13px;
          font-weight: 700;
        }
        .hit-chip strong {
          color: var(--color-text-main);
        }
        .hit-chip small {
          color: var(--color-cuphead-red);
          font-size: 11px;
        }
        .hits-none {
          font-size: 12px;
          color: var(--color-text-muted);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
