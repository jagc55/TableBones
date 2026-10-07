import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, RoomSettings } from '../types';
import { soundstage } from '../utils/audio';
import { generatePlayableBoard, calculateWordPoints, BoardSolution } from '../utils/bonegleSolver';
import { Flame } from 'lucide-react';

interface BonegleEngineProps {
  currentUserPlayer: Player;
  players: Player[];
  settings: RoomSettings;
  timeLeftSec: number;
  onPlayerScore: (playerId: string, addedScore: number) => void;
  onActionNotification: (text: string) => void;
  onMatchResolved?: (winner: Player, reason: string, finalPlayers?: Player[]) => void;
}

export const BonegleEngine: React.FC<BonegleEngineProps> = ({
  currentUserPlayer,
  players,
  settings,
  timeLeftSec,
  onPlayerScore,
  onActionNotification,
  onMatchResolved,
}) => {
  const size = settings.bonegleGridSize || 5;
  const lang = settings.dictionaryLang || 'es';

  // Board and Solution State
  const [board, setBoard] = useState<string[][] | null>(null);
  const [solution, setSolution] = useState<BoardSolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User input state
  const [currentPath, setCurrentPath] = useState<{ r: number; c: number; letter: string }[]>([]);
  const [myFoundWords, setMyFoundWords] = useState<Map<string, number>>(new Map());
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'warn' | 'error' } | null>(null);

  // Submission feedback state: word, status ('valid' | 'invalid' | 'duplicate')
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    word: string;
    status: 'valid' | 'invalid' | 'duplicate';
    pts?: number;
  } | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Bot words storage: botId -> Set of words
  const botWordsRef = useRef<Map<string, Set<string>>>(new Map());

  // Revealed Results State at end of match
  const [isResolved, setIsResolved] = useState(false);

  // Drag interaction refs
  const boardFrameRef = useRef<HTMLDivElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);
  const currentPointerIdRef = useRef<number | null>(null);
  const cachedCentersRef = useRef<
    { r: number; c: number; el: HTMLElement; cx: number; cy: number; radius: number }[]
  >([]);
  const cursorCoordsRef = useRef({ x: 0, y: 0 });

  // 1. Generate Board on Mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    generatePlayableBoard(size, lang).then(({ board: newBoard, solution: newSolution }) => {
      if (!isMounted) return;
      setBoard(newBoard);
      setSolution(newSolution);
      setIsLoading(false);
      onActionNotification(`The letters have rattled into place! ${newSolution.totalPossibleWords} words hidden in the grid.`);
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
        // Circular hitbox smaller than the square container (65% of half-width)
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

  // 2. Simulated Bot Activity (Realistic word finding from solution)
  useEffect(() => {
    if (!solution || solution.words.length === 0 || timeLeftSec <= 0 || isResolved) return;

    const botPlayers = players.filter((p) => p.isBot && p.id !== currentUserPlayer.id);
    if (botPlayers.length === 0) return;

    // Pick realistic words for bots periodically
    const interval = setInterval(() => {
      botPlayers.forEach((bot) => {
        if (Math.random() > 0.4) {
          if (!botWordsRef.current.has(bot.id)) {
            botWordsRef.current.set(bot.id, new Set());
          }
          const botSet = botWordsRef.current.get(bot.id)!;
          // Pick a word weighted towards common lengths 3-6
          const candidates = solution.words.filter((w) => !botSet.has(w) && w.length <= 6);
          if (candidates.length > 0) {
            const picked = candidates[Math.floor(Math.random() * candidates.length)];
            botSet.add(picked);
          }
        }
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [solution, players, currentUserPlayer.id, timeLeftSec, isResolved]);

  // 3. Clear Feedback Timer
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2000);
    return () => clearTimeout(t);
  }, [feedback]);

  // 4. Final Round Revelation (Unique words x2 bonus calculation)
  const resolveRoundRevelation = useCallback(() => {
    if (isResolved || !solution) return;
    setIsResolved(true);

    // Build word frequency map: word -> player names
    const wordFrequency = new Map<string, string[]>();

    // Add user's words
    myFoundWords.forEach((_, word) => {
      if (!wordFrequency.has(word)) wordFrequency.set(word, []);
      wordFrequency.get(word)!.push(currentUserPlayer.name);
    });

    // Add bots' words
    botWordsRef.current.forEach((wordsSet, botId) => {
      const bot = players.find((p) => p.id === botId);
      const name = bot ? bot.name : 'Bot';
      wordsSet.forEach((word) => {
        if (!wordFrequency.has(word)) wordFrequency.set(word, []);
        wordFrequency.get(word)!.push(name);
      });
    });

    // Score breakdowns
    const breakdowns = players.map((p) => {
      const wordsSet: Set<string> =
        p.id === currentUserPlayer.id
          ? new Set(myFoundWords.keys())
          : botWordsRef.current.get(p.id) || new Set();

      const uniqueWords: { word: string; pts: number }[] = [];
      const sharedWords: { word: string; pts: number; sharedWith: string[] }[] = [];
      let totalScore = 0;

      wordsSet.forEach((word) => {
        const occurrences = wordFrequency.get(word) || [];
        const isShared = occurrences.length > 1;
        const basePoints = calculateWordPoints(word);

        if (isShared) {
          const others = occurrences.filter((n) => n !== p.name);
          sharedWords.push({ word, pts: basePoints, sharedWith: others });
          totalScore += basePoints;
        } else {
          // UNIQUE WORD: DOUBLE POINTS (x2)!
          const doubled = basePoints * 2;
          uniqueWords.push({ word, pts: doubled });
          totalScore += doubled;
        }
      });

      return {
        player: p,
        uniqueWords,
        sharedWords,
        totalScore,
      };
    });

    breakdowns.sort((a, b) => b.totalScore - a.totalScore);

    // 1. Post final revelation summary directly into match chat!
    onActionNotification(`🔔 THE BELL HAS SOUNDED! Final scores revealed:`);
    breakdowns.forEach((b, idx) => {
      const uniquePts = b.uniqueWords.reduce((acc, w) => acc + w.pts, 0);
      const sharedPts = b.sharedWords.reduce((acc, w) => acc + w.pts, 0);
      onActionNotification(
        `#${idx + 1} ${b.player.name}: ${b.totalScore} PTS (${b.uniqueWords.length} unique x2 = +${uniquePts} pts, ${b.sharedWords.length} shared = +${sharedPts} pts)`
      );
    });

    if (solution.longestWord) {
      onActionNotification(
        `🏆 Longest word on board: "${solution.longestWord}" (${solution.longestWordLength} letters).`
      );
    }

    // 2. Set official final scores on players and announce champion
    breakdowns.forEach((b) => {
      onPlayerScore(b.player.id, b.totalScore);
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

    if (onMatchResolved) {
      setTimeout(() => {
        onMatchResolved(
          champWithScore,
          `Time's up! Final scores: 1st ${champ.name} (${breakdowns[0]?.totalScore || 0} pts)`,
          finalPlayers
        );
      }, 500);
    }
  }, [isResolved, solution, myFoundWords, currentUserPlayer, players, onActionNotification, onPlayerScore, onMatchResolved]);

  // Trigger revelation when time runs out
  useEffect(() => {
    if (timeLeftSec <= 0 && !isResolved && solution) {
      resolveRoundRevelation();
    }
  }, [timeLeftSec, isResolved, solution, resolveRoundRevelation]);

  // 5. Draw Rubberhose Drag Trail Lines in SVG
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

      // Outer ink stroke
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      outer.setAttribute('d', d);
      outer.setAttribute('class', 'bonegle-trail-outer');
      svg.appendChild(outer);

      // Inner glowing core
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

  // 6. Circular Hitbox Tile Lookup
  const getTileFromCoords = (x: number, y: number) => {
    if (cachedCentersRef.current.length === 0) {
      updateTileCenters();
    }
    const lastStep = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
    const prevStep = currentPath.length > 1 ? currentPath[currentPath.length - 2] : null;

    let bestTile: { r: number; c: number; letter: string } | null = null;
    let minDist = Infinity;

    for (const item of cachedCentersRef.current) {
      const dist = Math.hypot(x - item.cx, y - item.cy);
      let effectiveRadius = item.radius;

      if (lastStep) {
        const isNeighbor = Math.abs(item.r - lastStep.r) <= 1 && Math.abs(item.c - lastStep.c) <= 1;
        const isBacktrack = prevStep && item.r === prevStep.r && item.c === prevStep.c;
        if (isNeighbor || isBacktrack) {
          // Slight magnetism towards valid adjacent neighbors while staying strictly within the circular tile body
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

  // 7. Word Submission Logic
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
      // Duplicate / Already submitted -> Orange/Amber (only in top banner)
      soundstage.playBulbHorn();
      setSubmissionFeedback({
        word,
        status: 'duplicate',
      });
      clearTrail();
      setCurrentPath([]);

      feedbackTimeoutRef.current = setTimeout(() => {
        setSubmissionFeedback(null);
      }, 900);
      return;
    }

    if (!solution || !solution.wordsSet.has(word)) {
      // Invalid / Not in dictionary -> Red (only in top banner)
      soundstage.playSlideDown();
      setSubmissionFeedback({
        word,
        status: 'invalid',
      });
      clearTrail();
      setCurrentPath([]);

      feedbackTimeoutRef.current = setTimeout(() => {
        setSubmissionFeedback(null);
      }, 900);
      return;
    }

    // Word is valid! -> Green (only in top banner)
    const basePts = calculateWordPoints(word);
    soundstage.playScoreTrumpet();
    setMyFoundWords((prev) => new Map(prev).set(word, basePts));
    setSubmissionFeedback({
      word,
      status: 'valid',
      pts: basePts,
    });
    clearTrail();
    setCurrentPath([]);

    feedbackTimeoutRef.current = setTimeout(() => {
      setSubmissionFeedback(null);
    }, 900);
  };

  // 8. Drag and Pointer Events
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

    // Check backtrack
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

    // Check if already visited
    const isVisited = currentPath.some((p) => p.r === tile.r && p.c === tile.c);
    if (isVisited) {
      drawTrail(currentPath);
      return;
    }

    // Check 8-way adjacency
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

  // Keyboard / Click fallback for accessibility or mouse clicks
  const handleTileClick = (r: number, c: number) => {
    if (timeLeftSec <= 0 || isResolved || isDraggingRef.current || !board) return;

    // Check backtrack
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

    // Check already selected
    const already = currentPath.some((p) => p.r === r && p.c === c);
    if (already) {
      soundstage.playSlideDown();
      setFeedback({ text: 'Die already connected in current word!', type: 'warn' });
      return;
    }

    // Check adjacency
    if (currentPath.length > 0) {
      const last = currentPath[currentPath.length - 1];
      const dr = Math.abs(last.r - r);
      const dc = Math.abs(last.c - c);
      if (dr > 1 || dc > 1) {
        soundstage.playSlideDown();
        setFeedback({ text: 'Must connect to an adjacent die!', type: 'warn' });
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
      {/* Word Input & Submission Banner - Automatic submission on drag release */}
      <div className={`bonegle-word-banner cel-card ${
        submissionFeedback ? `feedback-banner-${submissionFeedback.status}` : ''
      }`}>
        <div className="word-banner-left">
          <div className="word-banner-top-row">
            <span className="banner-subtag">
              {submissionFeedback
                ? submissionFeedback.status === 'valid'
                  ? (lang === 'es' ? 'PALABRA CORRECTA' : 'VALID WORD')
                  : submissionFeedback.status === 'duplicate'
                  ? (lang === 'es' ? 'PALABRA REPETIDA' : 'ALREADY FOUND')
                  : (lang === 'es' ? 'NO ESTÁ EN EL DICCIONARIO' : 'NOT IN DICTIONARY')
                : (lang === 'es' ? 'CONECTA LETRAS CONTIGUAS (DESLIZA O HAZ CLIC):' : 'CONNECT ADJACENT LETTERS (DRAG OR CLICK):')}
            </span>
            <span className="banner-words-count-badge">
              {lang === 'es' ? 'PALABRAS' : 'WORDS'}: <strong>{myFoundWords.size}</strong>
            </span>
          </div>
          <div className="constructed-word-wrap">
            {submissionFeedback ? (
              <div className={`constructed-word-text feedback-word-${submissionFeedback.status}`}>
                <span>{submissionFeedback.word}</span>
                {submissionFeedback.status === 'valid' && submissionFeedback.pts && (
                  <span className="potential-pts-badge feedback-badge valid-badge">+{submissionFeedback.pts} PTS</span>
                )}
                {submissionFeedback.status === 'duplicate' && (
                  <span className="potential-pts-badge feedback-badge duplicate-badge">{lang === 'es' ? 'REPETIDA' : 'DUPLICATE'}</span>
                )}
                {submissionFeedback.status === 'invalid' && (
                  <span className="potential-pts-badge feedback-badge invalid-badge">{lang === 'es' ? 'NO VÁLIDA' : 'INVALID'}</span>
                )}
              </div>
            ) : currentConstructedWord ? (
              <>
                <span className="constructed-word-text">{currentConstructedWord}</span>
                {potentialPoints > 0 && (
                  <span className="potential-pts-badge">+{potentialPoints} PTS</span>
                )}
              </>
            ) : (
              <span className="constructed-word-placeholder">
                {lang === 'es'
                  ? 'Desliza sobre letras contiguas para formar palabras...'
                  : 'Drag across adjacent letters to form words...'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Board Arena Stage - maximized to fill the available space */}
      <div className="bonegle-board-center-area">
        <div
          ref={boardFrameRef}
          className={`bonegle-board-frame grid-size-${size}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* Rubberhose SVG line connector */}
          <svg ref={svgOverlayRef} className="bonegle-trail-overlay" aria-hidden="true" />

          {/* Letter Dice Grid */}
          <div className="bonegle-grid-layout" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
            {board.map((row, r) =>
              row.map((letter, c) => {
                const stepIdx = currentPath.findIndex((p) => p.r === r && p.c === c);
                const isSelected = stepIdx !== -1;
                const isHead = stepIdx === currentPath.length - 1;

                return (
                  <div
                    key={`${r}-${c}`}
                    data-r={r}
                    data-c={c}
                    onClick={() => handleTileClick(r, c)}
                    className={`bonegle-die ${isSelected ? 'die-selected' : ''} ${
                      isHead ? 'die-head' : ''
                    }`}
                  >
                    <span className="die-letter">{letter}</span>
                    {isSelected && (
                      <span className="die-step-badge">{stepIdx + 1}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>



      <style>{`
        .bonegle-engine-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          align-items: center;
        }
        .bonegle-loading-card {
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
        }
        .bonegle-word-banner {
          width: 100%;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .word-banner-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .word-banner-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .banner-subtag {
          font-family: var(--font-theatre-rye);
          font-size: 9.5px;
          letter-spacing: 0.08em;
          color: var(--color-cuphead-red);
        }
        .banner-words-count-badge {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          color: var(--color-ink-stroke);
          background-color: var(--color-parchment-deep);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 999px;
          padding: 1px 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .banner-words-count-badge strong {
          font-family: var(--font-luckiest-guy);
          font-size: 13px;
          color: var(--color-cuphead-red);
        }
        .constructed-word-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 32px;
        }
        .constructed-word-text {
          font-family: var(--font-luckiest-guy);
          font-size: 26px;
          letter-spacing: 0.12em;
          color: var(--color-text-main);
          line-height: 1;
        }
        .potential-pts-badge {
          background-color: var(--color-golden-buttercup);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 999px;
          padding: 2px 8px;
          font-family: var(--font-luckiest-guy);
          font-size: 13px;
          color: var(--color-ink-black);
        }
        .constructed-word-placeholder {
          font-family: var(--font-typewriter-elite);
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .feedback-banner-valid {
          border-color: #2e7d32 !important;
          background-color: #e8f5e9 !important;
        }
        .feedback-banner-invalid {
          border-color: #c62828 !important;
          background-color: #ffebee !important;
        }
        .feedback-banner-duplicate {
          border-color: #ef6c00 !important;
          background-color: #fff3e0 !important;
        }
        .feedback-word-valid {
          color: #2e7d32 !important;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .feedback-word-invalid {
          color: #c62828 !important;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .feedback-word-duplicate {
          color: #ef6c00 !important;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .feedback-badge.valid-badge {
          background-color: #4caf50;
          color: white;
          border-color: #2e7d32;
        }
        .feedback-badge.invalid-badge {
          background-color: #e53935;
          color: white;
          border-color: #b71c1c;
        }
        .feedback-badge.duplicate-badge {
          background-color: #fb8c00;
          color: white;
          border-color: #e65100;
        }

        .bonegle-feedback-toast {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: var(--font-comic-fredoka);
          font-size: 13.5px;
          font-weight: 700;
          box-shadow: var(--shadow-cel-sm);
        }
        .feedback-success {
          background-color: var(--color-status-success-bg);
          color: var(--color-status-success-text);
          border: 1.5px solid var(--color-status-success-text);
        }
        .feedback-warn {
          background-color: var(--color-status-warn-bg);
          color: var(--color-status-warn-text);
          border: 1.5px solid var(--color-status-warn-text);
        }
        .feedback-error {
          background-color: var(--color-status-error-bg);
          color: var(--color-status-error-text);
          border: 1.5px solid var(--color-status-error-text);
        }
        .bonegle-board-center-area {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .bonegle-board-frame {
          position: relative;
          background-color: var(--color-parchment-deep);
          border: var(--border-frame);
          border-radius: 20px;
          padding: 16px;
          box-shadow: var(--shadow-cel-lg);
          user-select: none;
          touch-action: none;
        }
        .bonegle-trail-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        }
        .bonegle-trail-outer {
          stroke: var(--color-pure-black);
          stroke-width: 10px;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }
        .bonegle-trail-inner {
          stroke: var(--color-golden-buttercup);
          stroke-width: 6px;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          transition: stroke 0.15s ease;
        }
        .bonegle-trail-inner.trail-valid {
          stroke: #4caf50 !important;
        }
        .bonegle-trail-inner.trail-invalid {
          stroke: #e53935 !important;
        }
        .bonegle-trail-inner.trail-duplicate {
          stroke: #fb8c00 !important;
        }
        .bonegle-trail-cursor {
          stroke: var(--color-golden-buttercup);
          stroke-width: 4px;
          stroke-dasharray: 4 4;
          stroke-linecap: round;
          fill: none;
        }
        .bonegle-grid-layout {
          display: grid;
          gap: 12px;
          position: relative;
          z-index: 2;
        }
        .bonegle-die {
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-thick);
          border-radius: 14px;
          box-shadow: var(--shadow-cel-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          user-select: none;
          transition: transform 0.08s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .grid-size-4 .bonegle-die { width: 105px; height: 105px; }
        .grid-size-5 .bonegle-die { width: 88px; height: 88px; }
        .grid-size-6 .bonegle-die { width: 74px; height: 74px; }

        .bonegle-die:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-cel-md);
        }
        .die-selected {
          background-color: var(--color-golden-buttercup) !important;
          transform: scale(1.05) rotate(1deg);
        }
        .die-head {
          background-color: var(--color-cuphead-red) !important;
          transform: scale(1.1) rotate(-1deg);
        }
        .die-head .die-letter {
          color: var(--color-glove-ivory) !important;
        }

        /* Post-submission visual feedback on dice (Green = valid, Red = invalid, Orange = duplicate) */
        .die-feedback-valid {
          background-color: #66bb6a !important;
          border-color: #1b5e20 !important;
          box-shadow: 0 0 16px rgba(76, 175, 80, 0.7) !important;
          transform: scale(1.06) !important;
        }
        .die-feedback-valid .die-letter {
          color: #ffffff !important;
        }

        .die-feedback-invalid {
          background-color: #ef5350 !important;
          border-color: #b71c1c !important;
          box-shadow: 0 0 16px rgba(229, 57, 53, 0.7) !important;
          transform: scale(1.04) !important;
        }
        .die-feedback-invalid .die-letter {
          color: #ffffff !important;
        }

        .die-feedback-duplicate {
          background-color: #ffa726 !important;
          border-color: #e65100 !important;
          box-shadow: 0 0 16px rgba(251, 140, 0, 0.7) !important;
          transform: scale(1.05) !important;
        }
        .die-feedback-duplicate .die-letter {
          color: #ffffff !important;
        }
        .die-letter {
          font-family: var(--font-luckiest-guy);
          color: var(--color-text-main);
          line-height: 1;
          pointer-events: none;
        }
        .grid-size-4 .die-letter { font-size: 46px; }
        .grid-size-5 .die-letter { font-size: 38px; }
        .grid-size-6 .die-letter { font-size: 32px; }

        .die-step-badge {
          position: absolute;
          top: 3px;
          right: 3px;
          font-family: var(--font-theatre-rye);
          font-size: 8px;
          background-color: var(--color-ink-stroke);
          color: var(--color-glove-ivory);
          width: 14px;
          height: 14px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        /* Revelation Section */
        .bonegle-revelation-card {
          width: 100%;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          border: 3.5px solid var(--color-cuphead-red);
          background-color: var(--color-canvas-parchment);
        }
        .revelation-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .revelation-title {
          font-size: 22px;
          color: var(--color-text-main);
        }
        .revelation-longest-banner {
          background-color: var(--color-parchment-deep);
          border: 1.5px dashed var(--color-ink-stroke);
          border-radius: 8px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .longest-label {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          color: var(--color-cuphead-red);
        }
        .longest-word {
          font-family: var(--font-luckiest-guy);
          font-size: 16px;
          color: var(--color-text-main);
        }
        .longest-count {
          color: var(--color-text-muted);
          font-size: 12px;
        }
        .revelation-players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
        }
        .player-breakdown-card {
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-thin);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .breakdown-player-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid var(--color-sepia-wash);
          padding-bottom: 6px;
        }
        .breakdown-rank {
          font-family: var(--font-luckiest-guy);
          font-size: 16px;
          color: var(--color-cuphead-red);
        }
        .breakdown-name {
          font-family: var(--font-luckiest-guy);
          font-size: 15px;
          color: var(--color-text-main);
        }
        .breakdown-total-pts {
          font-family: var(--font-typewriter-elite);
          font-size: 15px;
          font-weight: 800;
          color: var(--color-cuphead-red);
        }
        .breakdown-words-split {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .words-col-title {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          color: var(--color-text-lead);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .multiplier-badge {
          background-color: var(--color-cuphead-red);
          color: var(--color-glove-ivory);
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .multiplier-badge-neutral {
          background-color: var(--color-text-muted);
          color: var(--color-glove-ivory);
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .words-chips-box {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          max-height: 70px;
          overflow-y: auto;
        }
        .words-empty {
          font-size: 11px;
          color: var(--color-text-muted);
          font-style: italic;
        }
        .word-tag {
          font-size: 11.5px;
          border-radius: 4px;
          padding: 2px 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .unique-tag {
          background-color: var(--color-golden-buttercup);
          border: 1px solid var(--color-ink-stroke);
          color: var(--color-ink-black);
          font-weight: 700;
        }
        .shared-tag {
          background-color: var(--color-parchment-deep);
          border: 1px solid var(--color-ink-stroke);
          color: var(--color-text-main);
        }
        .tag-pts {
          color: var(--color-cuphead-red);
          font-family: var(--font-typewriter-elite);
        }
        .shared-with {
          font-size: 9px;
          color: var(--color-text-muted);
        }

        @media (max-width: 600px) {
          .grid-size-4 .bonegle-die { width: 62px; height: 62px; }
          .grid-size-5 .bonegle-die { width: 52px; height: 52px; }
          .grid-size-6 .bonegle-die { width: 44px; height: 44px; }
        }
      `}</style>
    </div>
  );
};
