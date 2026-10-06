import React, { useState, useEffect } from 'react';
import { GameId, Player } from '../types';
import { soundstage } from '../utils/audio';
import { Dices, Swords, Sparkles, Check, RotateCcw, AlertCircle } from 'lucide-react';

interface GenericGameEngineProps {
  gameId: GameId;
  currentUserPlayer: Player;
  players?: Player[];
  onPlayerScore: (playerId: string, addedScore: number) => void;
  onActionNotification: (text: string) => void;
}

export const GenericGameEngine: React.FC<GenericGameEngineProps> = ({
  gameId,
  currentUserPlayer,
  onPlayerScore,
  onActionNotification,
}) => {
  // 1. Vortilex Word Dice State
  const initialLetterGrid = [
    ['B', 'O', 'N', 'E'],
    ['P', 'A', 'R', 'L'],
    ['D', 'I', 'C', 'E'],
    ['W', 'A', 'L', 'L'],
  ];

  const [grid] = useState<string[][]>(initialLetterGrid);
  const [selectedCoords, setSelectedCoords] = useState<{ r: number; c: number }[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 2. Skull & Bones Dice Duel State
  const [myDice, setMyDice] = useState<number[]>([4, 2, 6, 5, 3]);
  const [currentBid, setCurrentBid] = useState<{ count: number; face: number }>({ count: 2, face: 4 });
  const [bluffResult, setBluffResult] = useState<string | null>(null);

  // Clear feedback after delay
  useEffect(() => {
    if (!feedbackMsg) return;
    const t = setTimeout(() => setFeedbackMsg(null), 2500);
    return () => clearTimeout(t);
  }, [feedbackMsg]);

  // Handle Tile Click in Vortilex
  const handleTileClick = (r: number, c: number) => {
    soundstage.playTap();

    // Check if clicked is the last selected -> remove it (backtrack)
    if (
      selectedCoords.length > 0 &&
      selectedCoords[selectedCoords.length - 1].r === r &&
      selectedCoords[selectedCoords.length - 1].c === c
    ) {
      setSelectedCoords(selectedCoords.slice(0, -1));
      return;
    }

    // Check if already in path (cannot reuse same tile in one word)
    const alreadySelected = selectedCoords.some((coord) => coord.r === r && coord.c === c);
    if (alreadySelected) {
      soundstage.playSlideDown();
      setFeedbackMsg({ text: 'Tile already used in this word!', isError: true });
      return;
    }

    // Check adjacency if not first tile
    if (selectedCoords.length > 0) {
      const last = selectedCoords[selectedCoords.length - 1];
      const rowDiff = Math.abs(last.r - r);
      const colDiff = Math.abs(last.c - c);
      if (rowDiff > 1 || colDiff > 1) {
        soundstage.playSlideDown();
        setFeedbackMsg({ text: 'Must connect to adjacent dice!', isError: true });
        return;
      }
    }

    setSelectedCoords([...selectedCoords, { r, c }]);
  };

  const currentConstructedWord = selectedCoords
    .map((coord) => grid[coord.r][coord.c])
    .join('');

  // Submit Vortilex Word
  const handleWallopWord = () => {
    const word = currentConstructedWord;
    if (word.length < 3) {
      soundstage.playSlideDown();
      setFeedbackMsg({ text: 'Words must be at least 3 letters!', isError: true });
      return;
    }

    if (foundWords.includes(word)) {
      soundstage.playBulbHorn();
      setFeedbackMsg({ text: `Already claimed "${word}"!`, isError: true });
      setSelectedCoords([]);
      return;
    }

    // Calculate score
    const score = word.length * 2 + (word.length >= 5 ? 4 : 0);
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

  // Skull & Bones Roll Dice
  const handleRollDice = () => {
    soundstage.playRoundBell();
    const newDice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
    setMyDice(newDice);
    setBluffResult(null);
    onActionNotification(`${currentUserPlayer.name} rattled their leather dice cup!`);
  };

  const handleCallBluff = () => {
    soundstage.playScoreTrumpet();
    const matchCount = myDice.filter((d) => d === currentBid.face).length + 2; // simulated total
    const wasBluff = matchCount < currentBid.count;
    if (wasBluff) {
      onPlayerScore(currentUserPlayer.id, 8);
      setBluffResult(`BLUFF CAUGHT! Only ${matchCount} of face ${currentBid.face} existed. You scored +8 pts!`);
      onActionNotification(`${currentUserPlayer.name} exposed a treacherous liar!`);
    } else {
      setBluffResult(`BID WAS HONEST! ${matchCount} dice matched. No penalty, play continues!`);
      onActionNotification(`${currentUserPlayer.name} called an honest bid.`);
    }
  };

  return (
    <div className="game-engine-container">
      {/* VORTILEX WORD BRAWL BOARD */}
      {gameId === 'vortilex' && (
        <div className="vortilex-stage">
          {/* Top Word Capsule */}
          <div className="word-capsule-strip">
            <div className="capsule-left">
              <span className="capsule-label">CURRENT FORMATION:</span>
              <div className="capsule-word-display">
                {currentConstructedWord ? (
                  currentConstructedWord.split('').map((letter, idx) => (
                    <span key={idx} className="capsule-letter">
                      {letter}
                    </span>
                  ))
                ) : (
                  <span className="capsule-placeholder">CONNECT ADJACENT DICE TILES...</span>
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
                <span>SUBMIT</span>
              </button>
            </div>
          </div>

          {/* Toast feedback banner */}
          {feedbackMsg && (
            <div className={`engine-feedback ${feedbackMsg.isError ? 'fb-error' : 'fb-success'}`}>
              {feedbackMsg.isError ? <AlertCircle size={16} strokeWidth={3} /> : <Check size={16} strokeWidth={3} />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Letter Dice Grid */}
          <div className="dice-grid-wrap">
            <div className="dice-board-frame">
              {grid.map((row, rIdx) => (
                <div key={rIdx} className="grid-row">
                  {row.map((letter, cIdx) => {
                    const selectedIdx = selectedCoords.findIndex((coord) => coord.r === rIdx && coord.c === cIdx);
                    const isSelected = selectedIdx !== -1;
                    const isHead = selectedIdx === selectedCoords.length - 1;

                    return (
                      <button
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => handleTileClick(rIdx, cIdx)}
                        className={`die-tile ${isSelected ? 'tile-in-path' : ''} ${isHead ? 'tile-path-head' : ''}`}
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
            <span className="hits-title">YOUR WALLOPED WORDS ({foundWords.length}):</span>
            <div className="hits-chips-row">
              {foundWords.length === 0 ? (
                <span className="hits-none">No words registered yet this round.</span>
              ) : (
                foundWords.map((w, idx) => (
                  <span key={idx} className="hit-chip">
                    <strong>{w}</strong>
                    <small>+{w.length * 2}pt</small>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SKULL & BONES DICE DUEL BOARD */}
      {gameId === 'skull-bones' && (
        <div className="dice-stage">
          <div className="dice-cup-card cel-card">
            <h3 className="stage-subhead">YOUR LEATHER DICE CUP</h3>
            <div className="cup-dice-tray">
              {myDice.map((val, idx) => (
                <div key={idx} className="bone-die-face">
                  <span className="bone-die-num">{val}</span>
                </div>
              ))}
            </div>
            <button onClick={handleRollDice} className="btn-cel btn-brawl-secondary roll-cup-btn">
              <Dices size={18} strokeWidth={2.8} />
              <span>RATTLE & ROLL CUP</span>
            </button>
          </div>

          <div className="saloon-bid-card cel-card">
            <h3 className="stage-subhead">SALOON BIDDING TABLE</h3>
            <div className="current-bid-box">
              <span className="bid-label">CURRENT TABLE BID:</span>
              <strong className="bid-quote">
                "{currentBid.count} Dice showing Face {currentBid.face}"
              </strong>
            </div>

            {bluffResult && <div className="bluff-feedback-banner">{bluffResult}</div>}

            <div className="bid-actions-row">
              <button
                onClick={() => {
                  soundstage.playTap();
                  setCurrentBid({ count: currentBid.count + 1, face: currentBid.face });
                  onPlayerScore(currentUserPlayer.id, 3);
                  onActionNotification(`${currentUserPlayer.name} raised the bid to ${currentBid.count + 1}!`);
                }}
                className="btn-cel btn-brawl-neutral btn-sm"
              >
                <span>RAISE BID (+1)</span>
              </button>

              <button onClick={handleCallBluff} className="btn-cel btn-brawl-primary btn-sm">
                <Swords size={16} strokeWidth={2.8} />
                <span>CALL LIAR / BLUFF!</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERIC TABLETOP BOARD (For Checkers / Phantom Parlor) */}
      {gameId !== 'vortilex' && gameId !== 'skull-bones' && (
        <div className="generic-table-stage cel-card">
          <div className="generic-table-header">
            <h3 className="woodcut-title">TACTICAL PARLOR TABLE</h3>
            <span className="generic-turn-info">Active turn in progress</span>
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
                  title="Click to execute board move"
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
              <span>EXECUTE PARLOR MOVE (+6 PTS)</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        .game-engine-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .vortilex-stage {
          display: flex;
          flex-direction: column;
          gap: 14px;
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
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--color-cuphead-red);
        }
        .capsule-word-display {
          display: flex;
          gap: 4px;
          align-items: center;
          min-height: 32px;
        }
        .capsule-letter {
          font-family: var(--font-luckiest-guy);
          font-size: 22px;
          background-color: var(--color-golden-buttercup);
          border: 1.5px solid var(--color-ink-black);
          border-radius: 6px;
          width: 28px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-ink-black);
          box-shadow: 1px 1px 0 var(--color-ink-black);
        }
        .capsule-placeholder {
          font-family: var(--font-typewriter-elite);
          font-size: 13px;
          color: #887766;
        }
        .capsule-actions {
          display: flex;
          gap: 8px;
        }
        .wallop-btn {
          font-size: 16px;
          padding: 6px 16px;
        }
        .engine-feedback {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 8px;
          font-family: var(--font-comic-fredoka);
          font-size: 13px;
          font-weight: 700;
          box-shadow: var(--shadow-cel-sm);
        }
        .fb-success {
          background-color: #d4edd2;
          color: #1f5e1f;
          border: 2px solid #1f5e1f;
        }
        .fb-error {
          background-color: #fce8e6;
          color: var(--color-cuphead-red);
          border: 2px solid var(--color-cuphead-red);
        }
        .dice-grid-wrap {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .dice-board-frame {
          background-color: var(--color-parchment-deep);
          border: var(--border-frame);
          border-radius: 18px;
          padding: 14px;
          box-shadow: var(--shadow-cel-lg);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .grid-row {
          display: flex;
          gap: 10px;
        }
        .die-tile {
          width: 64px;
          height: 64px;
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
        .die-tile::before {
          content: '';
          position: absolute;
          width: 76%;
          height: 76%;
          border: 1.5px dashed rgba(28, 21, 17, 0.18);
          border-radius: 50%;
          pointer-events: none;
        }
        .die-tile:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-cel-md);
        }
        .tile-in-path {
          background-color: var(--color-golden-buttercup);
          transform: scale(1.08) rotate(1deg);
        }
        .tile-path-head {
          background-color: var(--color-cuphead-red) !important;
          color: var(--color-glove-ivory) !important;
          transform: scale(1.14) rotate(-2deg);
        }
        .tile-path-head .die-letter {
          color: var(--color-glove-ivory);
        }
        .die-letter {
          font-family: var(--font-luckiest-guy);
          font-size: 28px;
          color: var(--color-ink-black);
          line-height: 1;
        }
        .tile-step-indicator {
          position: absolute;
          top: 3px;
          right: 3px;
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          background-color: var(--color-ink-black);
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
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--color-ink-black);
          flex-shrink: 0;
        }
        .hits-chips-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .hits-none {
          font-size: 12px;
          color: #887766;
          font-style: italic;
        }
        .hit-chip {
          background-color: var(--color-golden-buttercup);
          border: 1.5px solid var(--color-ink-black);
          border-radius: 6px;
          padding: 2px 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-luckiest-guy);
          font-size: 13px;
          color: var(--color-ink-black);
        }
        .hit-chip small {
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          color: var(--color-cuphead-red);
        }
        .dice-stage {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .dice-cup-card, .saloon-bid-card {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }
        .stage-subhead {
          font-family: var(--font-theatre-rye);
          font-size: 12px;
          letter-spacing: 0.1em;
          color: var(--color-cuphead-red);
        }
        .cup-dice-tray {
          display: flex;
          gap: 12px;
        }
        .bone-die-face {
          width: 52px;
          height: 52px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: 12px;
          box-shadow: var(--shadow-cel-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bone-die-num {
          font-family: var(--font-luckiest-guy);
          font-size: 26px;
          color: var(--color-ink-black);
        }
        .current-bid-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background-color: var(--color-parchment-deep);
          border: 2px dashed var(--color-ink-black);
          border-radius: 10px;
          padding: 10px 20px;
        }
        .bid-label {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--color-ink-stroke);
        }
        .bid-quote {
          font-family: var(--font-luckiest-guy);
          font-size: 18px;
          color: var(--color-cuphead-red);
        }
        .bluff-feedback-banner {
          background-color: #fff9e6;
          border: 2px solid var(--color-ink-black);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-ink-black);
        }
        .bid-actions-row {
          display: flex;
          gap: 10px;
        }
        .generic-table-stage {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .generic-board-visual {
          display: flex;
          justify-content: center;
        }
        .board-mat {
          display: grid;
          grid-template-columns: repeat(4, 60px);
          grid-template-rows: repeat(4, 60px);
          border: var(--border-ink-thick);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: var(--shadow-cel-md);
        }
        .board-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.1s ease;
        }
        .board-cell:hover {
          filter: brightness(0.9);
        }
        .cell-light {
          background-color: var(--color-glove-ivory);
        }
        .cell-dark {
          background-color: #8c5b1b;
        }
        .cell-num {
          font-family: var(--font-typewriter-elite);
          font-size: 12px;
          font-weight: bold;
          color: rgba(28, 21, 17, 0.4);
        }
      `}</style>
    </div>
  );
};
