import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BaseGameEngineProps } from '../../types';
import { soundstage } from '../../utils/audio';
import { Flame } from 'lucide-react';

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
}) => {
  const match = matchState?.gameId === 'bonegle' ? matchState : null;
  const board = match?.board || [];
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

  if (!match) {
    return <div className="bonegle-status-card cel-card"><Flame size={30} /><strong className="woodcut-title">WAITING FOR THE BONEGLE BOARD</strong></div>;
  }

  const currentWord = path.map((step) => step.letter).join('');
  const isActive = match.phase === 'active';
  const displayedWord = currentWord || feedback?.word || submittedWord;
  const feedbackClass = feedback ? `word-feedback-${feedback.status}` : '';

  return (
    <div className="bonegle-authoritative-engine">
      <div className="bonegle-authoritative-header cel-card">
        <div>
          <span className="bonegle-status-label">{isActive ? 'WORD HUNT ACTIVE' : 'SERVER REVELATION'}</span>
          <strong className={`bonegle-current-word ${feedbackClass}`} aria-live="polite">{displayedWord || 'TRACE A WORD'}</strong>
        </div>
      </div>
      <div className="bonegle-authoritative-layout">
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
      <style>{`
        .bonegle-authoritative-engine { display: flex; flex-direction: column; gap: 14px; width: 100%; user-select: none; }
        .bonegle-status-card, .bonegle-authoritative-header { display: flex; align-items: center; gap: 12px; padding: 16px; }
        .bonegle-status-label { display: block; font-family: var(--font-theatre-rye); font-size: 11px; letter-spacing: .08em; color: var(--color-cuphead-red); }
        .bonegle-current-word { display: block; font-family: var(--font-luckiest-guy); font-size: 24px; letter-spacing: .04em; min-height: 28px; }
        .bonegle-current-word.word-feedback-valid { color: #1f9d55; }
        .bonegle-current-word.word-feedback-duplicate { color: #e2821a; }
        .bonegle-current-word.word-feedback-invalid { color: var(--color-cuphead-red); }
        .bonegle-authoritative-layout { min-width: 0; }
        .bonegle-board-container { display: grid; gap: 9px; padding: 16px; position: relative; overflow: hidden; background: #241712; border: var(--border-ink-thick); border-radius: 12px; box-shadow: var(--shadow-cel-lg); touch-action: none; }
        .bonegle-die { aspect-ratio: 1; border: 3px solid var(--color-ink-black); border-radius: 10px; background: var(--color-cuphead-red); box-shadow: 0 3px 0 var(--color-ink-black); color: var(--color-glove-ivory); font-family: var(--font-luckiest-guy); font-size: clamp(24px, 6vw, 44px); position: relative; z-index: 2; touch-action: none; }
        .bonegle-die.die-selected { background: var(--color-golden-buttercup); color: var(--color-ink-black); transform: translateY(2px); box-shadow: 0 1px 0 var(--color-ink-black); }
        .die-step-badge { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; background: var(--color-ink-black); color: var(--color-golden-buttercup); font-size: 11px; }
        .bonegle-path-line { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; pointer-events: none; filter: drop-shadow(0 0 3px rgba(255, 216, 72, .8)); }
        .bonegle-path-line polyline { fill: none; stroke: var(--color-golden-buttercup); stroke-width: 10; stroke-linecap: round; stroke-linejoin: round; }
        .bonegle-path-line circle { fill: var(--color-golden-buttercup); }
      `}</style>
    </div>
  );
};
