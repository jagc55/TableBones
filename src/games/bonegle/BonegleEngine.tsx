import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, BaseGameEngineProps } from '../../types';
import { soundstage } from '../../utils/audio';
import {
  generatePlayableBoard,
  calculateWordPoints,
  calculateBonegleBreakdowns,
} from './bonegleLogic';
import {
  BonegleGridSize,
  BonegleLang,
  BoardSolution,
  BoneglePathStep,
  BonegleSubmissionFeedback,
} from './types';
import {
  BonegleWordBanner,
  BonegleRevelationView,
} from './BonegleComponents';
import { Flame } from 'lucide-react';

export const BonegleEngine: React.FC<BaseGameEngineProps> = ({
  currentUserPlayer,
  players,
  settings,
  timeLeftSec = 0,
  onPlayerScore,
  onActionNotification,
  onMatchResolved,
}) => {
  const size: BonegleGridSize = (settings?.bonegleGridSize || 5) as BonegleGridSize;
  const lang: BonegleLang = (settings?.dictionaryLang || 'es') as BonegleLang;

  // Board and Solution State
  const [board, setBoard] = useState<string[][] | null>(null);
  const [solution, setSolution] = useState<BoardSolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User input state
  const [currentPath, setCurrentPath] = useState<BoneglePathStep[]>([]);
  const [myFoundWords, setMyFoundWords] = useState<Map<string, number>>(new Map());
  const [submissionFeedback, setSubmissionFeedback] = useState<BonegleSubmissionFeedback | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Callback refs to prevent re-render feedback loops
  const onActionNotificationRef = useRef(onActionNotification);
  onActionNotificationRef.current = onActionNotification;

  const onPlayerScoreRef = useRef(onPlayerScore);
  onPlayerScoreRef.current = onPlayerScore;

  const onMatchResolvedRef = useRef(onMatchResolved);
  onMatchResolvedRef.current = onMatchResolved;

  const timeLeftSecRef = useRef(timeLeftSec);
  timeLeftSecRef.current = timeLeftSec;

  // Bot words storage: botId -> Set of words
  const botWordsRef = useRef<Map<string, Set<string>>>(new Map());

  // Revealed Results State at end of match
  const [isResolved, setIsResolved] = useState(false);
  const [breakdownResults, setBreakdownResults] = useState<ReturnType<typeof calculateBonegleBreakdowns> | null>(null);

  // Drag interaction refs
  const boardFrameRef = useRef<HTMLDivElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);
  const currentPointerIdRef = useRef<number | null>(null);
  const cachedCentersRef = useRef<
    { r: number; c: number; el: HTMLElement; cx: number; cy: number; radius: number }[]
  >([]);
  const cursorCoordsRef = useRef({ x: 0, y: 0 });

  // Key to track active configuration and prevent regeneration loops
  const lastGeneratedKeyRef = useRef<string>('');

  // 1. Generate Board on Mount or when size/lang explicitly changes
  useEffect(() => {
    const configKey = `${size}-${lang}`;
    if (lastGeneratedKeyRef.current === configKey && board !== null) {
      return;
    }
    lastGeneratedKeyRef.current = configKey;

    let isMounted = true;
    setIsLoading(true);

    generatePlayableBoard(size, lang).then(({ board: newBoard, solution: newSolution }) => {
      if (!isMounted) return;
      setBoard(newBoard);
      setSolution(newSolution);
      setIsLoading(false);
      onActionNotificationRef.current?.(
        lang === 'es'
          ? `¡Las letras han caído en el tablero! Hay ${newSolution.totalPossibleWords} palabras escondidas.`
          : `The letters rattled into place! ${newSolution.totalPossibleWords} words hidden in the grid.`
      );
    });

    return () => {
      isMounted = false;
    };
  }, [size, lang]);

  // Update cached tile positions for fast collision detection
  const updateTileCenters = useCallback(() => {
    if (!boardFrameRef.current) return;
    const tiles = boardFrameRef.current.querySelectorAll<HTMLElement>('.bonegle-die');
    if (tiles.length === 0) {
      cachedCentersRef.current = [];
      return;
    }
    cachedCentersRef.current = Array.from(tiles).map((tile) => {
      const rect = tile.getBoundingClientRect();
      const diameter = Math.min(rect.width, rect.height);
      return {
        r: parseInt(tile.dataset.r || '0', 10),
        c: parseInt(tile.dataset.c || '0', 10),
        el: tile,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        radius: (diameter / 2) * 0.65,
      };
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateTileCenters);
    window.addEventListener('scroll', updateTileCenters, true);
    return () => {
      window.removeEventListener('resize', updateTileCenters);
      window.removeEventListener('scroll', updateTileCenters, true);
    };
  }, [updateTileCenters]);

  useEffect(() => {
    if (!isLoading && board) {
      setTimeout(updateTileCenters, 50);
    }
  }, [isLoading, board, updateTileCenters]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // 2. Simulated Bot Activity
  useEffect(() => {
    if (!solution || solution.words.length === 0 || isResolved) return;

    const botPlayers = players.filter((p) => p.isBot && p.id !== currentUserPlayer.id);
    if (botPlayers.length === 0) return;

    const interval = setInterval(() => {
      if (timeLeftSecRef.current <= 0 || isResolved) return;

      botPlayers.forEach((bot) => {
        if (Math.random() > 0.4) {
          if (!botWordsRef.current.has(bot.id)) {
            botWordsRef.current.set(bot.id, new Set());
          }
          const botSet = botWordsRef.current.get(bot.id)!;
          const candidates = solution.words.filter((w) => !botSet.has(w) && w.length <= 6);
          if (candidates.length > 0) {
            const picked = candidates[Math.floor(Math.random() * candidates.length)];
            botSet.add(picked);
          }
        }
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [solution, players, currentUserPlayer.id, isResolved]);

  // 3. Final Round Revelation
  const resolveRoundRevelation = useCallback(() => {
    if (isResolved || !solution) return;
    setIsResolved(true);

    const breakdowns = calculateBonegleBreakdowns(
      players,
      myFoundWords,
      currentUserPlayer.id,
      botWordsRef.current
    );
    setBreakdownResults(breakdowns);

    onActionNotificationRef.current?.(
      lang === 'es'
        ? `🔔 ¡HA SONADO LA CAMPANA! Puntuaciones finales reveladas:`
        : `🔔 THE BELL HAS SOUNDED! Final scores revealed:`
    );

    breakdowns.forEach((b, idx) => {
      const uniquePts = b.uniqueWords.reduce((acc, w) => acc + w.pts, 0);
      const sharedPts = b.sharedWords.reduce((acc, w) => acc + w.pts, 0);
      onActionNotificationRef.current?.(
        `#${idx + 1} ${b.player.name}: ${b.totalScore} PTS (${b.uniqueWords.length} ${
          lang === 'es' ? 'únicas' : 'unique'
        } x2 = +${uniquePts} pts, ${b.sharedWords.length} ${
          lang === 'es' ? 'compartidas' : 'shared'
        } = +${sharedPts} pts)`
      );
    });

    if (solution.longestWord) {
      onActionNotificationRef.current?.(
        `🏆 ${
          lang === 'es' ? 'Palabra más larga en el tablero' : 'Longest word on board'
        }: "${solution.longestWord}" (${solution.longestWordLength} ${lang === 'es' ? 'letras' : 'letters'}).`
      );
    }

    breakdowns.forEach((b) => {
      onPlayerScoreRef.current?.(b.player.id, b.totalScore);
    });

    const finalPlayers: Player[] = players.map((p) => {
      const b = breakdowns.find((item) => item.player.id === p.id);
      return {
        ...p,
        score: b ? b.totalScore : p.score,
        wordsBreakdown: b
          ? {
              uniqueWords: b.uniqueWords,
              sharedWords: b.sharedWords,
            }
          : undefined,
      };
    });

    const champ = breakdowns[0]?.player || currentUserPlayer;
    const champWithScore = finalPlayers.find((p) => p.id === champ.id) || {
      ...champ,
      score: breakdowns[0]?.totalScore || 0,
      wordsBreakdown: breakdowns[0]
        ? {
            uniqueWords: breakdowns[0].uniqueWords,
            sharedWords: breakdowns[0].sharedWords,
          }
        : undefined,
    };

    if (onMatchResolvedRef.current) {
      setTimeout(() => {
        onMatchResolvedRef.current?.(
          champWithScore,
          lang === 'es'
            ? `¡Fin del asalto! Campeón: 1º ${champ.name} (${breakdowns[0]?.totalScore || 0} pts)`
            : `Time's up! Final scores: 1st ${champ.name} (${breakdowns[0]?.totalScore || 0} pts)`,
          finalPlayers
        );
      }, 500);
    }
  }, [
    isResolved,
    solution,
    players,
    myFoundWords,
    currentUserPlayer,
    lang,
  ]);

  useEffect(() => {
    if (timeLeftSec <= 0 && !isResolved && solution) {
      resolveRoundRevelation();
    }
  }, [timeLeftSec, isResolved, solution, resolveRoundRevelation]);

  // 4. Draw Rubberhose Trail in SVG
  const drawTrail = useCallback((path: { r: number; c: number }[], trailStatus?: 'valid' | 'invalid' | 'duplicate') => {
    const svg = svgOverlayRef.current;
    const frame = boardFrameRef.current;
    if (!svg || !frame) return;

    const frameRect = frame.getBoundingClientRect();
    svg.innerHTML = '';

    if (path.length === 0) return;

    const points = path.map((step) => {
      const item = cachedCentersRef.current.find((c) => c.r === step.r && c.c === step.c);
      if (!item) {
        return { x: 0, y: 0 };
      }
      return {
        x: item.cx - frameRect.left,
        y: item.cy - frameRect.top,
      };
    });

    if (points.length >= 2) {
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }

      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      outer.setAttribute('d', d);
      outer.setAttribute('class', 'bonegle-trail-outer');
      svg.appendChild(outer);

      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      inner.setAttribute('d', d);
      const innerClass = trailStatus ? `bonegle-trail-inner trail-${trailStatus}` : 'bonegle-trail-inner';
      inner.setAttribute('class', innerClass);
      svg.appendChild(inner);
    }

    if (isDraggingRef.current && points.length > 0) {
      const last = points[points.length - 1];
      const curX = cursorCoordsRef.current.x - frameRect.left;
      const curY = cursorCoordsRef.current.y - frameRect.top;

      const cursorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      cursorLine.setAttribute('x1', String(last.x));
      cursorLine.setAttribute('y1', String(last.y));
      cursorLine.setAttribute('x2', String(curX));
      cursorLine.setAttribute('y2', String(curY));
      cursorLine.setAttribute('class', 'bonegle-trail-cursor');
      svg.appendChild(cursorLine);
    }
  }, []);

  const clearTrail = useCallback(() => {
    if (svgOverlayRef.current) {
      svgOverlayRef.current.innerHTML = '';
    }
  }, []);

  // 5. Circular Hitbox Tile Lookup
  const getTileFromCoords = (x: number, y: number): BoneglePathStep | null => {
    if (cachedCentersRef.current.length === 0) {
      updateTileCenters();
    }
    const lastStep = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
    const prevStep = currentPath.length > 1 ? currentPath[currentPath.length - 2] : null;

    let bestTile: BoneglePathStep | null = null;
    let minDist = Infinity;

    for (const item of cachedCentersRef.current) {
      const dist = Math.hypot(x - item.cx, y - item.cy);
      let effectiveRadius = item.radius;

      if (lastStep) {
        const isNeighbor = Math.abs(item.r - lastStep.r) <= 1 && Math.abs(item.c - lastStep.c) <= 1;
        const isBacktrack = prevStep && item.r === prevStep.r && item.c === prevStep.c;
        if (isNeighbor || isBacktrack) {
          effectiveRadius = item.radius * 1.1;
        }
      }

      if (dist <= effectiveRadius && dist < minDist) {
        minDist = dist;
        bestTile = {
          r: item.r,
          c: item.c,
          letter: board ? board[item.r][item.c] : '',
        };
      }
    }

    return bestTile;
  };

  // 6. Word Submission Logic
  const handleWordSubmission = (path = currentPath) => {
    const word = path.map((p) => p.letter).join('').toUpperCase();
    if (!word || word.length < 3) {
      setCurrentPath([]);
      clearTrail();
      return;
    }

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    if (myFoundWords.has(word)) {
      soundstage.playBulbHorn();
      setSubmissionFeedback({ word, status: 'duplicate' });
      clearTrail();
      setCurrentPath([]);

      feedbackTimeoutRef.current = setTimeout(() => {
        setSubmissionFeedback(null);
      }, 900);
      return;
    }

    if (!solution || !solution.wordsSet.has(word)) {
      soundstage.playSlideDown();
      setSubmissionFeedback({ word, status: 'invalid' });
      clearTrail();
      setCurrentPath([]);

      feedbackTimeoutRef.current = setTimeout(() => {
        setSubmissionFeedback(null);
      }, 900);
      return;
    }

    const basePts = calculateWordPoints(word);
    soundstage.playScoreTrumpet();
    setMyFoundWords((prev) => new Map(prev).set(word, basePts));
    setSubmissionFeedback({ word, status: 'valid', pts: basePts });
    clearTrail();
    setCurrentPath([]);

    feedbackTimeoutRef.current = setTimeout(() => {
      setSubmissionFeedback(null);
    }, 900);
  };

  // 7. Pointer Events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (timeLeftSec <= 0 || isResolved) return;
    updateTileCenters();
    const tile = getTileFromCoords(e.clientX, e.clientY);
    if (!tile) return;

    if (submissionFeedback) {
      setSubmissionFeedback(null);
      clearTrail();
    }

    isDraggingRef.current = true;
    currentPointerIdRef.current = e.pointerId;
    boardFrameRef.current?.setPointerCapture(e.pointerId);

    cursorCoordsRef.current = { x: e.clientX, y: e.clientY };
    const newPath = [tile];
    setCurrentPath(newPath);
    soundstage.playTileSelect(0);
    drawTrail(newPath);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || e.pointerId !== currentPointerIdRef.current) return;
    cursorCoordsRef.current = { x: e.clientX, y: e.clientY };

    const tile = getTileFromCoords(e.clientX, e.clientY);
    if (!tile) {
      drawTrail(currentPath);
      return;
    }

    if (currentPath.length >= 2) {
      const prev = currentPath[currentPath.length - 2];
      if (prev.r === tile.r && prev.c === tile.c) {
        const nextPath = currentPath.slice(0, -1);
        setCurrentPath(nextPath);
        soundstage.playTileBacktrack();
        drawTrail(nextPath);
        return;
      }
    }

    const isVisited = currentPath.some((p) => p.r === tile.r && p.c === tile.c);
    if (isVisited) {
      drawTrail(currentPath);
      return;
    }

    const last = currentPath[currentPath.length - 1];
    if (last) {
      const dr = Math.abs(tile.r - last.r);
      const dc = Math.abs(tile.c - last.c);
      if (dr <= 1 && dc <= 1 && dr + dc > 0) {
        const nextPath = [...currentPath, tile];
        setCurrentPath(nextPath);
        soundstage.playTileSelect(nextPath.length);
        drawTrail(nextPath);
      } else {
        drawTrail(currentPath);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || (e && e.pointerId !== currentPointerIdRef.current)) return;
    isDraggingRef.current = false;
    currentPointerIdRef.current = null;
    handleWordSubmission(currentPath);
  };

  const handlePointerCancel = () => {
    isDraggingRef.current = false;
    currentPointerIdRef.current = null;
    setCurrentPath([]);
    clearTrail();
  };

  // Keyboard / Click fallback
  const handleTileClick = (r: number, c: number) => {
    if (timeLeftSec <= 0 || isResolved || isDraggingRef.current || !board) return;

    if (
      currentPath.length > 0 &&
      currentPath[currentPath.length - 1].r === r &&
      currentPath[currentPath.length - 1].c === c
    ) {
      const nextPath = currentPath.slice(0, -1);
      setCurrentPath(nextPath);
      soundstage.playTileBacktrack();
      drawTrail(nextPath);
      return;
    }

    const already = currentPath.some((p) => p.r === r && p.c === c);
    if (already) {
      soundstage.playSlideDown();
      return;
    }

    if (currentPath.length > 0) {
      const last = currentPath[currentPath.length - 1];
      const dr = Math.abs(last.r - r);
      const dc = Math.abs(last.c - c);
      if (dr > 1 || dc > 1) {
        soundstage.playSlideDown();
        return;
      }
    }

    const nextPath = [...currentPath, { r, c, letter: board[r][c] }];
    setCurrentPath(nextPath);
    soundstage.playTileSelect(nextPath.length);
    drawTrail(nextPath);
  };

  const currentConstructedWord = currentPath.map((p) => p.letter).join('');
  const potentialPoints = calculateWordPoints(currentConstructedWord);

  if (isLoading || !board) {
    return (
      <div className="bonegle-loading-card cel-card">
        <Flame size={32} className="spin-slow" style={{ color: 'var(--color-cuphead-red)' }} />
        <h3 className="woodcut-title">PREPARING THE BOARD...</h3>
        <p>Loading lexicon ({lang.toUpperCase()}) & laying out the letters.</p>
      </div>
    );
  }

  return (
    <div className="bonegle-engine-wrapper">
      {/* Word Input Banner */}
      <BonegleWordBanner
        currentWord={currentConstructedWord}
        potentialPoints={potentialPoints}
        lang={lang}
        feedback={submissionFeedback}
        onClear={() => {
          soundstage.playTap();
          setCurrentPath([]);
          clearTrail();
        }}
        onSubmit={() => handleWordSubmission(currentPath)}
      />

      {/* Main Board Arena Stage */}
      <div className="bonegle-arena-body">
        <div className="bonegle-board-container">
          <div
            ref={boardFrameRef}
            className={`bonegle-board-grid grid-size-${size}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <svg ref={svgOverlayRef} className="bonegle-svg-overlay" />

            {board.map((row, rIdx) =>
              row.map((letter, cIdx) => {
                const pathIdx = currentPath.findIndex((p) => p.r === rIdx && p.c === cIdx);
                const isSelected = pathIdx !== -1;
                const isHead = isSelected && pathIdx === currentPath.length - 1;

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    data-r={rIdx}
                    data-c={cIdx}
                    onClick={() => handleTileClick(rIdx, cIdx)}
                    className={`bonegle-die ${isSelected ? 'die-selected' : ''} ${
                      isHead ? 'die-head' : ''
                    }`}
                  >
                    <span className="die-letter-char">{letter}</span>
                    {isSelected && <span className="die-step-badge">{pathIdx + 1}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Post-Match Revelation View */}
      {isResolved && breakdownResults && (
        <BonegleRevelationView
          breakdowns={breakdownResults}
          longestWord={solution?.longestWord}
          lang={lang}
        />
      )}

      <style>{`
        .bonegle-engine-wrapper {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          user-select: none;
          touch-action: none;
        }
        .bonegle-loading-card {
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
          background-color: var(--color-canvas-parchment);
        }
        .spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .bonegle-word-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: var(--radius-cel-box);
          box-shadow: var(--shadow-cel-sm);
          height: 64px;
          min-height: 64px;
          max-height: 64px;
          box-sizing: border-box;
          overflow: hidden;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .feedback-banner-valid {
          background-color: #e6f7ec !important;
          border-color: #278848 !important;
        }
        .feedback-banner-invalid {
          background-color: #fdeeee !important;
          border-color: var(--color-cuphead-red) !important;
        }
        .feedback-banner-duplicate {
          background-color: #fff6e5 !important;
          border-color: #d9822b !important;
        }
        .word-banner-left {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
          flex: 1;
          min-width: 0;
          height: 100%;
        }
        .word-banner-top-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .banner-subtag {
          font-family: var(--font-theatre-rye);
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
        }
        .lang-indicator-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 1px 6px;
          background: var(--color-parchment-deep);
          border-radius: 4px;
          font-family: var(--font-comic-fredoka);
          font-size: 11px;
          font-weight: 700;
        }
        .word-banner-display-line {
          height: 28px;
          min-height: 28px;
          max-height: 28px;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .constructed-word-bold {
          font-family: var(--font-luckiest-guy);
          font-size: 24px;
          letter-spacing: 0.08em;
          color: var(--color-ink-black);
          line-height: 1;
          margin: 0;
          white-space: nowrap;
        }
        .word-placeholder {
          font-family: var(--font-comic-fredoka);
          font-size: 14px;
          color: var(--color-text-muted);
          font-style: italic;
          line-height: 1;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .feedback-content-row {
          height: 28px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .feedback-icon-ok {
          color: #278848;
        }
        .feedback-icon-dup {
          color: #d9822b;
        }
        .feedback-icon-err {
          color: var(--color-cuphead-red);
        }
        .feedback-word-text {
          font-family: var(--font-luckiest-guy);
          font-size: 24px;
          color: var(--color-ink-black);
          letter-spacing: 0.06em;
          line-height: 1;
        }
        .feedback-pts-tag {
          font-family: var(--font-luckiest-guy);
          font-size: 16px;
          color: #278848;
          background-color: rgba(39, 136, 72, 0.15);
          padding: 1px 8px;
          border-radius: 6px;
          line-height: 1.2;
        }
        .word-banner-actions {
          height: 36px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .submit-word-btn {
          height: 34px;
          min-width: 105px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 14px;
          padding: 0 14px;
        }
        .clear-word-btn {
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          padding: 0 12px;
        }
        .bonegle-arena-body {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }
        .bonegle-board-container {
          background-color: #241712;
          padding: 18px;
          border: var(--border-ink-thick);
          border-radius: var(--radius-cel-box);
          box-shadow: var(--shadow-cel-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin: 0 auto;
        }
        .bonegle-board-grid {
          position: relative;
          display: grid;
          width: 100%;
          max-width: 480px;
          aspect-ratio: 1 / 1;
        }
        .grid-size-4 {
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(4, 1fr);
          gap: 12px;
        }
        .grid-size-5 {
          grid-template-columns: repeat(5, 1fr);
          grid-template-rows: repeat(5, 1fr);
          gap: 9px;
        }
        .grid-size-6 {
          grid-template-columns: repeat(6, 1fr);
          grid-template-rows: repeat(6, 1fr);
          gap: 7px;
        }
        .bonegle-svg-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }
        .bonegle-trail-outer {
          stroke: var(--color-ink-black);
          stroke-width: 14px;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }
        .bonegle-trail-inner {
          stroke: var(--color-golden-buttercup);
          stroke-width: 8px;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }
        .bonegle-trail-cursor {
          stroke: var(--color-golden-buttercup);
          stroke-width: 5px;
          stroke-dasharray: 6 4;
          stroke-linecap: round;
          opacity: 0.85;
        }
        .bonegle-revelation-card {
          padding: 20px;
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thick);
          box-shadow: var(--shadow-cel-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }
        .revelation-header-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .revelation-subtitle {
          font-family: var(--font-comic-fredoka);
          font-size: 15px;
          font-weight: 600;
          color: var(--color-cuphead-red);
        }
        .revelation-podium-strip {
          padding: 12px 24px;
          background-color: var(--color-golden-buttercup);
          border: var(--border-ink-standard);
          border-radius: 8px;
          box-shadow: var(--shadow-cel-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .champ-label {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--color-ink-black);
        }
        .champ-name {
          font-family: var(--font-luckiest-guy);
          font-size: 26px;
          color: var(--color-ink-black);
        }
        .champ-score {
          font-family: var(--font-luckiest-guy);
          font-size: 20px;
          color: var(--color-cuphead-red);
        }
        .longest-word-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background-color: var(--color-glove-ivory);
          border: 2px solid var(--color-ink-black);
          border-radius: 6px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};
