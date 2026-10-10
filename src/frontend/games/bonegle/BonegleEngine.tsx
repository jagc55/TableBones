import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BaseGameEngineProps } from '../../types';
import { soundstage } from '../../utils/audio';
import { Flame, CheckCircle2 } from 'lucide-react';
import { BonegleMatchState } from './types';

interface AuthoritativePathStep {
  row: number;
  col: number;
  letter: string;
}

interface PathPoint {
  x: number;
  y: number;
}

interface WordFeedback {
  word: string;
  status: 'valid' | 'duplicate' | 'invalid';
  id: number;
}

export const BonegleEngine: React.FC<BaseGameEngineProps> = ({
  matchState,
  onGameAction,
  currentUserPlayer,
}) => {
  const match = matchState?.gameId === 'bonegle' ? (matchState as BonegleMatchState) : null;
  const board: string[][] = match?.board || [];
  const boardKey = board.map((row) => row.join('|')).join('/');
  const [path, setPath] = useState<AuthoritativePathStep[]>([]);
  const [pathLine, setPathLine] = useState<{ width: number; height: number; points: PathPoint[] }>({ width: 0, height: 0, points: [] });
  const [feedback, setFeedback] = useState<WordFeedback | null>(null);
  const [submittedWord, setSubmittedWord] = useState('');
  const pathRef = useRef<AuthoritativePathStep[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const draggingPointerIdRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    pathRef.current = [];
    setPath([]);
    setPathLine((previous) => ({ ...previous, points: [] }));
    setFeedback(null);
    setSubmittedWord('');
  }, [boardKey, match?.phase]);

  useEffect(() => {
    const nextFeedback = match?.wordFeedback;
    if (!nextFeedback) return;

    setFeedback(nextFeedback);
    setSubmittedWord(nextFeedback.word);
    if (nextFeedback.status === 'valid') soundstage.playScoreTrumpet();
    else if (nextFeedback.status === 'duplicate') soundstage.playBulbHorn();
    else soundstage.playSlideDown();

    const timeout = window.setTimeout(() => {
      setFeedback(null);
      setSubmittedWord('');
    }, 1100);
    return () => window.clearTimeout(timeout);
  }, [match?.wordFeedback?.id]);

  const updatePath = useCallback((updater: (previous: AuthoritativePathStep[]) => AuthoritativePathStep[]) => {
    setPath((previous) => {
      const next = updater(previous);
      pathRef.current = next;
      return next;
    });
  }, []);

  const addCell = useCallback((row: number, col: number) => {
    if (!match || match.phase !== 'active') return;
    const letter = board[row]?.[col];
    if (!letter) return;

    updatePath((previous) => {
      const last = previous[previous.length - 1];
      const penultimate = previous[previous.length - 2];
      if (last?.row === row && last.col === col) return previous;
      if (penultimate?.row === row && penultimate.col === col) {
        soundstage.playTileBacktrack();
        return previous.slice(0, -1);
      }
      if (previous.some((step) => step.row === row && step.col === col)) return previous;
      if (last && (Math.abs(last.row - row) > 1 || Math.abs(last.col - col) > 1)) return previous;
      soundstage.playTileSelect(previous.length);
      return [...previous, { row, col, letter }];
    });
  }, [board, match, updatePath]);

  const cellAtPointer = (boardElement: HTMLElement, clientX: number, clientY: number): { row: number; col: number } | null => {
    let closestCell: { row: number; col: number; distance: number } | null = null;

    for (const cell of Array.from(boardElement.querySelectorAll<HTMLElement>('[data-bonegle-cell]'))) {
      const rect = cell.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(clientX - centerX, clientY - centerY);
      const radius = Math.min(rect.width, rect.height) * 0.4;
      if (distance <= radius && (!closestCell || distance < closestCell.distance)) {
        closestCell = { row: Number(cell.dataset.row), col: Number(cell.dataset.col), distance };
      }
    }

    return closestCell ? { row: closestCell.row, col: closestCell.col } : null;
  };

  const syncPathLine = useCallback(() => {
    const boardElement = boardRef.current;
    if (!boardElement) return;
    const boardRect = boardElement.getBoundingClientRect();
    const points = pathRef.current.flatMap((step) => {
      const cell = boardElement.querySelector<HTMLElement>(`[data-row="${step.row}"][data-col="${step.col}"]`);
      if (!cell) return [];
      const rect = cell.getBoundingClientRect();
      return [{ x: rect.left - boardRect.left + rect.width / 2, y: rect.top - boardRect.top + rect.height / 2 }];
    });
    setPathLine({ width: boardRect.width, height: boardRect.height, points });
  }, []);

  useLayoutEffect(() => {
    const boardElement = boardRef.current;
    if (!boardElement) return;
    syncPathLine();
    const observer = new ResizeObserver(syncPathLine);
    observer.observe(boardElement);
    boardElement.ownerDocument.defaultView?.addEventListener('resize', syncPathLine);
    return () => {
      observer.disconnect();
      boardElement.ownerDocument.defaultView?.removeEventListener('resize', syncPathLine);
    };
  }, [boardKey, path, syncPathLine]);

  const submitPath = useCallback(() => {
    const submittedPath = pathRef.current;
    const word = submittedPath.map((step) => step.letter).join('').toUpperCase();
    if (!match || match.phase !== 'active' || !word) return;
    onGameAction?.({
      type: 'SUBMIT_WORD',
      word,
      path: submittedPath.map(({ row, col }) => ({ row, col })),
    });
    soundstage.playTap();
    setSubmittedWord(word);
    pathRef.current = [];
    setPath([]);
    setPathLine((previous) => ({ ...previous, points: [] }));
  }, [match, onGameAction]);

  const cancelDrag = useCallback((pointerId: number) => {
    if (draggingPointerIdRef.current !== pointerId) return;
    draggingPointerIdRef.current = null;
    pathRef.current = [];
    setPath([]);
    setPathLine((previous) => ({ ...previous, points: [] }));
  }, []);

  const finishDrag = useCallback((pointerId: number) => {
    if (draggingPointerIdRef.current !== pointerId) return;
    draggingPointerIdRef.current = null;
    submitPath();
  }, [submitPath]);

  useEffect(() => {
    const document = boardRef.current?.ownerDocument;
    if (!document) return;
    const handlePointerUp = (event: PointerEvent) => finishDrag(event.pointerId);
    const handlePointerCancel = (event: PointerEvent) => cancelDrag(event.pointerId);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [boardKey, cancelDrag, finishDrag]);

  const guessedWordsList = useMemo(() => {
    const set = new Set<string>();
    const playerWords = match?.submittedWords?.[currentUserPlayer?.id];
    if (Array.isArray(playerWords)) {
      playerWords.forEach((item) => {
        if (item?.word) set.add(item.word);
      });
    }
    const breakdownWords = match?.breakdowns?.[currentUserPlayer?.id]?.words;
    if (Array.isArray(breakdownWords)) {
      breakdownWords.forEach((item) => {
        if (item?.word) set.add(item.word);
      });
    }
    if (feedback?.status === 'valid' && feedback.word) {
      set.add(feedback.word);
    }
    return Array.from(set).sort((a, b) => a.length - b.length || a.localeCompare(b));
  }, [match?.submittedWords, match?.breakdowns, currentUserPlayer?.id, feedback]);

  if (!match) {
    return <div className="bonegle-status-card cel-card"><Flame size={30} /><strong className="woodcut-title">WAITING FOR THE BONEGLE BOARD</strong></div>;
  }

  const currentWord = path.map((step) => step.letter).join('');
  const isActive = match.phase === 'active';
  const displayedWord = currentWord || feedback?.word || submittedWord;
  const feedbackClass = feedback ? `word-feedback-${feedback.status}` : '';

  return (
    <div className="bonegle-authoritative-engine">
      <div className="bonegle-stage-columns">
        {/* Left Column: Board and current word */}
        <div className="bonegle-board-column">
          <div className="bonegle-authoritative-header cel-card">
            <div>
              <span className="bonegle-status-label">{isActive ? 'WORD HUNT ACTIVE' : 'SERVER REVELATION'}</span>
              <strong className={`bonegle-current-word ${feedbackClass}`} aria-live="polite">{displayedWord || 'TRACE A WORD'}</strong>
            </div>
          </div>
          <div className="bonegle-board-wrapper">
            <div
              ref={boardRef}
              className="bonegle-board-container"
              style={{ gridTemplateColumns: `repeat(${board.length}, minmax(0, 1fr))` }}
              onPointerDown={(event) => {
                if (!isActive) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                suppressClickRef.current = true;
                draggingPointerIdRef.current = event.pointerId;
                const cell = cellAtPointer(event.currentTarget, event.clientX, event.clientY);
                if (cell) addCell(cell.row, cell.col);
              }}
              onPointerMove={(event) => {
                if (draggingPointerIdRef.current !== event.pointerId) return;
                const cell = cellAtPointer(event.currentTarget, event.clientX, event.clientY);
                if (cell) addCell(cell.row, cell.col);
              }}
              onPointerUp={(event) => {
                finishDrag(event.pointerId);
              }}
              onPointerCancel={(event) => {
                cancelDrag(event.pointerId);
              }}
              onLostPointerCapture={(event) => {
                finishDrag(event.pointerId);
              }}
            >
              {board.map((row, rowIndex) => row.map((letter, colIndex) => {
                const selectedIndex = path.findIndex((step) => step.row === rowIndex && step.col === colIndex);
                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    data-bonegle-cell
                    data-row={rowIndex}
                    data-col={colIndex}
                    disabled={!isActive}
                    className={`bonegle-die ${selectedIndex >= 0 ? 'die-selected' : ''}`}
                    onClick={() => {
                      if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                      }
                      addCell(rowIndex, colIndex);
                    }}
                  >
                    {letter}
                    {selectedIndex >= 0 && <span className="die-step-badge">{selectedIndex + 1}</span>}
                  </button>
                );
              }))}
              {pathLine.points.length > 1 && (
                <svg
                  aria-hidden="true"
                  className="bonegle-path-line"
                  viewBox={`0 0 ${pathLine.width} ${pathLine.height}`}
                  preserveAspectRatio="none"
                >
                  <polyline points={pathLine.points.map((point) => `${point.x},${point.y}`).join(' ')} />
                  {pathLine.points.map((point, index) => <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r="5" />)}
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Guessed Words Log (occupies the 350px space previously occupied by chat) */}
        <div className="bonegle-words-sidebar cel-card">
          <div className="words-sidebar-header">
            <div className="words-sidebar-title">
              <CheckCircle2 size={16} strokeWidth={2.8} />
              <span>GUESSED WORDS</span>
            </div>
            <span className="words-count-badge">{guessedWordsList.length}</span>
          </div>
          <div className="words-sidebar-list">
            {guessedWordsList.length === 0 ? (
              <div className="words-empty-state">
                <span>No words found yet.<br />Trace adjacent letters on the board to submit words!</span>
              </div>
            ) : (
              <div className="words-chips-grid">
                {guessedWordsList.map((word) => (
                  <div key={word} className="guessed-word-chip">
                    <span className="word-chip-text">{word}</span>
                    <span className="word-chip-len">{word.length}L</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .bonegle-authoritative-engine { display: flex; flex-direction: column; gap: 14px; width: 100%; user-select: none; }
        .bonegle-stage-columns { display: grid; grid-template-columns: 1fr 350px; gap: 14px; align-items: start; width: 100%; }
        .bonegle-board-column { display: flex; flex-direction: column; gap: 12px; min-width: 0; align-items: center; width: 100%; }
        .bonegle-status-card, .bonegle-authoritative-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; width: 100%; max-width: 520px; box-sizing: border-box; }
        .bonegle-status-label { display: block; font-family: var(--font-theatre-rye); font-size: 11px; letter-spacing: .08em; color: var(--color-cuphead-red); }
        .bonegle-current-word { display: block; font-family: var(--font-luckiest-guy); font-size: 24px; letter-spacing: .04em; min-height: 28px; }
        .bonegle-current-word.word-feedback-valid { color: #1f9d55; }
        .bonegle-current-word.word-feedback-duplicate { color: #e2821a; }
        .bonegle-current-word.word-feedback-invalid { color: var(--color-cuphead-red); }

        .bonegle-board-wrapper { display: flex; justify-content: center; width: 100%; }
        .bonegle-board-container { display: grid; gap: 8px; padding: 14px; position: relative; overflow: hidden; background: #241712; border: var(--border-ink-thick); border-radius: 12px; box-shadow: var(--shadow-cel-lg); touch-action: none; width: 100%; max-width: 520px; box-sizing: border-box; }
        .bonegle-die { aspect-ratio: 1; border: 3px solid var(--color-ink-black); border-radius: 10px; background: var(--color-cuphead-red); box-shadow: 0 3px 0 var(--color-ink-black); color: var(--color-glove-ivory); font-family: var(--font-luckiest-guy); font-size: clamp(20px, 4vw, 36px); position: relative; z-index: 2; touch-action: none; cursor: pointer; }
        .bonegle-die.die-selected { background: var(--color-golden-buttercup); color: var(--color-ink-black); transform: translateY(2px); box-shadow: 0 1px 0 var(--color-ink-black); }
        .die-step-badge { position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%; background: var(--color-ink-black); color: var(--color-golden-buttercup); font-size: 10px; }
        .bonegle-path-line { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; pointer-events: none; filter: drop-shadow(0 0 3px rgba(255, 216, 72, .8)); }
        .bonegle-path-line polyline { fill: none; stroke: var(--color-golden-buttercup); stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; }
        .bonegle-path-line circle { fill: var(--color-golden-buttercup); }

        /* Guessed Words Sidebar (350px - occupying the chat space) */
        .bonegle-words-sidebar {
          width: 350px;
          height: 100%;
          max-height: 580px;
          min-height: 480px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: var(--radius-cel-box);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-cel-sm);
        }
        .words-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background-color: var(--color-parchment-deep);
          border-bottom: var(--border-ink-thin);
          flex-shrink: 0;
        }
        .words-sidebar-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: var(--font-luckiest-guy);
          font-size: 14px;
          letter-spacing: 0.05em;
          color: var(--color-text-main);
        }
        .words-count-badge {
          background-color: var(--color-cuphead-red);
          color: var(--color-glove-ivory);
          font-family: var(--font-theatre-rye);
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid var(--color-ink-stroke);
          font-weight: 700;
        }
        .words-sidebar-list {
          flex: 1 1 0px;
          min-height: 0;
          padding: 12px;
          overflow-y: auto;
          background-color: var(--color-canvas-parchment);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .words-empty-state {
          margin: auto;
          text-align: center;
          font-size: 12.5px;
          color: var(--color-text-muted);
          font-style: italic;
          line-height: 1.4;
          padding: 20px;
        }
        .words-chips-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-content: flex-start;
        }
        .guessed-word-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--color-glove-ivory);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 6px;
          padding: 4px 8px;
          box-shadow: 1px 1px 0px var(--color-ink-black);
        }
        .word-chip-text {
          font-family: var(--font-luckiest-guy);
          font-size: 13px;
          letter-spacing: 0.04em;
          color: var(--color-text-main);
        }
        .word-chip-len {
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          background-color: var(--color-golden-buttercup);
          color: var(--color-ink-black);
          padding: 1px 5px;
          border-radius: 4px;
          font-weight: 700;
          border: 1px solid var(--color-ink-stroke);
        }

        @media (max-width: 850px) {
          .bonegle-stage-columns {
            grid-template-columns: 1fr;
          }
          .bonegle-words-sidebar {
            width: 100%;
            min-height: auto;
            max-height: 280px;
          }
          .bonegle-board-container, .bonegle-authoritative-header {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
