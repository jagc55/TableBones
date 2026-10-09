import React, { useState, useEffect, useMemo } from 'react';
import type { BaseGameEngineProps, Player } from '../../types';
import type { DoomedMineMatchState } from './types';
import { PokerCardView, PressureTokenChip } from './DoomedMineCards';
import {
  playTokenSelectSound,
  playSuccessSound,
  playCaveInSound,
  computePlayerShowdownStatuses,
} from './doomedMineLogic';
import { soundstage } from '../../utils/audio';
import { AvatarIcon } from '../../utils/avatars';
import {
  Pickaxe,
  AlertTriangle,
  Trophy,
  CheckCircle2,
  Clock,
  Crown,
  ChevronRight,
  Zap,
  BookOpen,
  X,
} from 'lucide-react';

interface PokerHandGuideItem {
  rank: number;
  name: string;
  desc: string;
  exampleCards: Array<{ rank: string; suit: 'spades' | 'hearts' | 'diamonds' | 'clubs' }>;
}

const POKER_HAND_HIERARCHY: PokerHandGuideItem[] = [
  {
    rank: 1,
    name: 'Royal Flush',
    desc: 'A, K, Q, J, 10 of identical suit',
    exampleCards: [
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'spades' },
      { rank: 'Q', suit: 'spades' },
      { rank: 'J', suit: 'spades' },
      { rank: '10', suit: 'spades' },
    ],
  },
  {
    rank: 2,
    name: 'Straight Flush',
    desc: 'Five consecutive cards of identical suit',
    exampleCards: [
      { rank: '9', suit: 'hearts' },
      { rank: '8', suit: 'hearts' },
      { rank: '7', suit: 'hearts' },
      { rank: '6', suit: 'hearts' },
      { rank: '5', suit: 'hearts' },
    ],
  },
  {
    rank: 3,
    name: 'Four of a Kind',
    desc: 'Four cards of identical rank',
    exampleCards: [
      { rank: 'Q', suit: 'spades' },
      { rank: 'Q', suit: 'hearts' },
      { rank: 'Q', suit: 'diamonds' },
      { rank: 'Q', suit: 'clubs' },
      { rank: '7', suit: 'spades' },
    ],
  },
  {
    rank: 4,
    name: 'Full House',
    desc: 'Three of a kind combined with a pair',
    exampleCards: [
      { rank: 'J', suit: 'spades' },
      { rank: 'J', suit: 'hearts' },
      { rank: 'J', suit: 'diamonds' },
      { rank: '8', suit: 'clubs' },
      { rank: '8', suit: 'diamonds' },
    ],
  },
  {
    rank: 5,
    name: 'Flush',
    desc: 'Any five cards of identical suit',
    exampleCards: [
      { rank: 'A', suit: 'diamonds' },
      { rank: 'J', suit: 'diamonds' },
      { rank: '8', suit: 'diamonds' },
      { rank: '6', suit: 'diamonds' },
      { rank: '2', suit: 'diamonds' },
    ],
  },
  {
    rank: 6,
    name: 'Straight',
    desc: 'Five consecutive ranks, mixed suits',
    exampleCards: [
      { rank: '10', suit: 'spades' },
      { rank: '9', suit: 'diamonds' },
      { rank: '8', suit: 'clubs' },
      { rank: '7', suit: 'hearts' },
      { rank: '6', suit: 'spades' },
    ],
  },
  {
    rank: 7,
    name: 'Three of a Kind',
    desc: 'Three cards of identical rank',
    exampleCards: [
      { rank: '7', suit: 'spades' },
      { rank: '7', suit: 'hearts' },
      { rank: '7', suit: 'diamonds' },
      { rank: 'K', suit: 'clubs' },
      { rank: '2', suit: 'spades' },
    ],
  },
  {
    rank: 8,
    name: 'Two Pair',
    desc: 'Two separate pairs of equal rank',
    exampleCards: [
      { rank: '9', suit: 'spades' },
      { rank: '9', suit: 'diamonds' },
      { rank: '4', suit: 'hearts' },
      { rank: '4', suit: 'clubs' },
      { rank: 'A', suit: 'spades' },
    ],
  },
  {
    rank: 9,
    name: 'One Pair',
    desc: 'Two cards of identical rank',
    exampleCards: [
      { rank: '10', suit: 'hearts' },
      { rank: '10', suit: 'diamonds' },
      { rank: 'A', suit: 'spades' },
      { rank: '8', suit: 'clubs' },
      { rank: '3', suit: 'hearts' },
    ],
  },
  {
    rank: 10,
    name: 'High Card',
    desc: 'No matching combinations; highest card plays',
    exampleCards: [
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'diamonds' },
      { rank: '9', suit: 'clubs' },
      { rank: '7', suit: 'hearts' },
      { rank: '4', suit: 'spades' },
    ],
  },
];

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS: Record<string, string> = {
  spades: '#1c1511',
  hearts: '#c92a2a',
  diamonds: '#c92a2a',
  clubs: '#1c1511',
};

export const DoomedMineEngine: React.FC<BaseGameEngineProps> = ({
  matchState,
  currentUserPlayer,
  players,
  onGameAction,
  onActionNotification,
}) => {
  const state = matchState as DoomedMineMatchState;
  const userId = currentUserPlayer?.id || '';

  // Local ticker for smooth countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const [showHandsGuide, setShowHandsGuide] = useState(false);
  const [isGuidePinned, setIsGuidePinned] = useState(false);

  const feedScrollRef = React.useRef<HTMLDivElement>(null);

  // Sound effects on showdown (called unconditionally at top level)
  useEffect(() => {
    if (state?.phase === 'showdown' && state?.showdownResult) {
      if (state.showdownResult.success) {
        playSuccessSound();
        onActionNotification?.('Shaft secured! The token order was correct.');
      } else {
        playCaveInSound();
        onActionNotification?.('Cave-in in the mine! Tokens did not match hand rankings.');
      }
    }
  }, [state?.phase, state?.expedition, state?.showdownResult, onActionNotification]);

  // Feed auto-scroll (called unconditionally at top level)
  useEffect(() => {
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTop = feedScrollRef.current.scrollHeight;
    }
  }, [state?.actionLog?.length]);

  // Active players list
  const activePlayers: Player[] = (players && players.length >= 2
    ? players
    : ((state?.players as unknown as Player[]) || [currentUserPlayer])) as Player[];

  const isShowdown = state?.phase === 'showdown';
  const otherPlayers = activePlayers.filter((p) => p.id !== userId);

  // At the end of the round (Showdown), sort teammate miners by final token ascending (1..N) to make results clear
  const displayedOtherPlayers = useMemo(() => {
    if (!isShowdown) return otherPlayers;
    return [...otherPlayers].sort((a, b) => {
      const tokenA = state?.tokens?.[a.id] ?? 999;
      const tokenB = state?.tokens?.[b.id] ?? 999;
      return tokenA - tokenB;
    });
  }, [isShowdown, otherPlayers, state?.tokens]);

  // Evaluations and individual status of each miner in Showdown
  const playerShowdownStatuses = useMemo(() => {
    if (!isShowdown || !state?.showdownResult) return {};
    return computePlayerShowdownStatuses(
      state?.players || [],
      state?.tokens || {},
      state?.showdownResult
    );
  }, [isShowdown, state?.showdownResult, state?.players, state?.tokens]);

  if (!state || state.gameId !== 'doomed-mine') {
    return (
      <div className="cel-card doomed-mine-loading-box">
        <Pickaxe size={32} className="animate-tremble" />
        <h3 className="woodcut-title">LOADING THE MINE...</h3>
        <p>Preparing cards and timber supports.</p>
        <style>{`
          .doomed-mine-loading-box {
            text-align: center;
            padding: 50px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            color: var(--color-text-main);
          }
        `}</style>
      </div>
    );
  }

  const isGameOver = state.phase === 'game_over';

  // Round naming without poker jargon: Round 1, Round 2, Round 3, Round 4, Showdown
  const getRoundLabel = () => {
    switch (state.phase) {
      case 'pre_flop':
        return 'ROUND 1';
      case 'flop':
        return 'ROUND 2';
      case 'turn':
        return 'ROUND 3';
      case 'river':
        return 'ROUND 4';
      case 'showdown':
        return 'SHOWDOWN';
      case 'game_over':
        return 'FINAL';
      default:
        return 'ROUND';
    }
  };

  const myCards = state.privateCards?.[userId] || [];
  const myToken = state.tokens?.[userId] ?? null;

  const totalPlayers = activePlayers.length || state.players?.length || 2;
  const tokenRange = Array.from({ length: totalPlayers }, (_, i) => i + 1);

  const myShowdownStatus = playerShowdownStatuses[userId];
  const myEvaluation = state.showdownResult?.evaluations?.[userId];

  const timeLeft = Math.max(0, Math.ceil(((state.deadline || 0) - now) / 1000));

  // Host identification
  const isHost = Boolean(
    currentUserPlayer?.isHost ||
    (state.hostId && state.hostId === userId) ||
    (!state.hostId && activePlayers[0]?.id === userId)
  );

  const tokensHeldCount = (state.players || []).filter(
    (p) => state.tokens?.[p.id] !== null && state.tokens?.[p.id] !== undefined
  ).length;
  const allPlayersHaveTokens =
    (state.players || []).length > 0 && tokensHeldCount === (state.players || []).length;

  const getNextRoundLabel = () => {
    switch (state.phase) {
      case 'pre_flop':
        return 'ROUND 2';
      case 'flop':
        return 'ROUND 3';
      case 'turn':
        return 'ROUND 4';
      case 'river':
        return 'SHOWDOWN';
      default:
        return 'NEXT ROUND';
    }
  };

  const getPlayerHistoryRounds = (playerId: string) => {
    const hist = state.tokenHistory?.[playerId] || {};
    const rounds = [
      { label: 'R1', token: hist.r1 ?? hist.preFlop ?? null },
      { label: 'R2', token: hist.r2 ?? hist.flop ?? null },
      { label: 'R3', token: hist.r3 ?? hist.turn ?? null },
      { label: 'R4', token: hist.r4 ?? hist.river ?? null },
    ];
    return rounds.filter((r) => r.token !== null && r.token !== undefined);
  };

  // Actions
  const handleAdvancePhase = () => {
    if (isShowdown || isGameOver || !allPlayersHaveTokens || !isHost) return;
    soundstage.playTap();
    onGameAction?.({ type: 'ADVANCE_PHASE' });
  };

  const handleSelectToken = (token: number) => {
    if (isShowdown || isGameOver) return;
    if (myToken !== null) {
      if (myToken === token) {
        onActionNotification?.(`You already hold Token ${myToken}. You cannot release it.`);
        soundstage.playTileBacktrack();
        return;
      }
      onActionNotification?.(
        `You already hold Token ${myToken}. You can only lose it if another miner steals it from you.`
      );
      soundstage.playTileBacktrack();
      return;
    }
    playTokenSelectSound(token);
    onGameAction?.({ type: 'SELECT_TOKEN', token });
  };

  const handleMinerClick = (minerPlayer: Player) => {
    if (isShowdown || isGameOver) return;
    const playerToken = state.tokens?.[minerPlayer.id];
    if (playerToken === null || playerToken === undefined) {
      onActionNotification?.(`${minerPlayer.name} does not hold any token.`);
      return;
    }

    if (myToken !== null) {
      onActionNotification?.(
        `You already hold Token ${myToken}. You can only lose it if another miner steals it from you.`
      );
      soundstage.playTileBacktrack();
      return;
    }

    handleSelectToken(playerToken);
  };

  const handleNextExpedition = () => {
    soundstage.playTap();
    onGameAction?.({ type: 'NEXT_EXPEDITION' });
  };

  return (
    <div className="doomed-mine-compact-container">
      {/* ========================================================= */}
      {/* 1. GLOBAL GAME STATUS (MINIMALIST, ICONS & METERS)        */}
      {/* ========================================================= */}
      <header className="cel-card mine-compact-header">
        {/* Shafts Secured (3 slots, trophy icons) */}
        <div className="header-icon-group" title="Shafts secured (3 to escape)">
          {[1, 2, 3].map((num) => {
            const secured = state.successes >= num;
            return (
              <div
                key={`beam-slot-${num}`}
                className={`compact-meter-slot beam-meter-slot ${secured ? 'meter-active-gold' : ''}`}
                title={secured ? `Shaft ${num} secured` : `Shaft ${num} pending`}
              >
                <Trophy size={14} className={secured ? 'icon-lit-gold' : 'icon-dim'} />
                <span className="meter-num">{num}</span>
              </div>
            );
          })}
        </div>

        {/* Cave-ins Suffered (3 slots, warning icons) */}
        <div className="header-icon-group" title="Cave-ins (3 = collapse)">
          {[1, 2, 3].map((num) => {
            const collapsed = state.failures >= num;
            return (
              <div
                key={`cavein-slot-${num}`}
                className={`compact-meter-slot cavein-meter-slot ${collapsed ? 'meter-active-red' : ''}`}
                title={collapsed ? `Cave-in ${num} suffered` : 'No cave-in'}
              >
                <AlertTriangle size={14} className={collapsed ? 'icon-lit-red' : 'icon-dim'} />
                <span className="meter-num">{num}</span>
              </div>
            );
          })}
        </div>

        {/* Current Round Badge (Round 1, 2, 3, 4 + Showdown) */}
        <div className="compact-round-badge">
          <strong className="round-badge-text">{getRoundLabel()}</strong>
        </div>


        {/* Timer - compact vertical with countdown number */}
        <div
          className={`compact-timer-badge ${isShowdown ? 'timer-showdown-paused' : ''}`}
          title={isShowdown ? 'Expedition finished - Paused for crew review' : `Round ${state.phase.replace('_', ' ') || 'pending'} - ${timeLeft}s remaining`}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: timeLeft <= 10 && !isShowdown ? 'bold' : 'normal' }}
        >
          <Clock size={13} strokeWidth={2.6} />
          <span className="timer-countdown">{isShowdown ? 'PAUSED' : `${timeLeft}s`}</span>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 1.5 ROUND ADVANCEMENT STATUS / CONTROLS                   */}
      {/* ========================================================= */}
      {!isShowdown && !isGameOver && (
        <div
          className={`mine-host-advance-bar cel-card ${allPlayersHaveTokens ? 'bar-ready-to-advance' : 'bar-waiting-tokens'
            }`}
        >
          {allPlayersHaveTokens ? (
            <div className="advance-status-row">
              <CheckCircle2 size={14} className="icon-lit-gold" />
              <span>
                All miners have claimed a token! Advancing to {getNextRoundLabel()}...
              </span>
              {isHost && (
                <button
                  type="button"
                  onClick={handleAdvancePhase}
                  className="btn-cel btn-advance-gold btn-sm"
                  title={`Advance to ${getNextRoundLabel()}`}
                  style={{ marginLeft: 'auto' }}
                >
                  <Pickaxe size={13} className="animate-tremble" />
                  <span className="advance-btn-text">ADVANCE TO {getNextRoundLabel()}</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          ) : (
            <div className="advance-status-row waiting-host">
              <Clock size={14} />
              <span>
                Waiting for all miners to claim a token ({tokensHeldCount}/{totalPlayers})...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Host Resume between Hands / Expeditions (No auto-timer) */}
      {isShowdown && !isGameOver && (
        <div className={`mine-host-advance-bar cel-card ${
          (state.pendingGameOver === 'defeat' || state.failures >= 3)
            ? 'bar-game-over-defeat'
            : isHost
            ? 'bar-ready-to-advance'
            : 'bar-waiting-tokens'
        }`}>
          <div className="advance-status-row">
            {isHost ? (
              <>
                {(state.pendingGameOver === 'defeat' || state.failures >= 3) ? (
                  <>
                    <AlertTriangle size={15} className="icon-lit-red" />
                    <span>💥 3 Cave-ins suffered! The mine collapsed. Review hands and conclude match:</span>
                    <button
                      type="button"
                      onClick={handleNextExpedition}
                      className="btn-cel btn-brawl-primary btn-sm"
                      title="Conclude Expedition & View Results"
                      style={{ marginLeft: 'auto' }}
                    >
                      <Pickaxe size={13} className="animate-tremble" />
                      <span className="advance-btn-text">CONCLUDE MATCH & VIEW RESULTS</span>
                      <ChevronRight size={13} />
                    </button>
                  </>
                ) : (state.pendingGameOver === 'victory' || state.successes >= 3) ? (
                  <>
                    <Trophy size={15} className="icon-lit-gold" />
                    <span>🏆 3 Shafts secured! Crew escaped! Review hands and conclude match:</span>
                    <button
                      type="button"
                      onClick={handleNextExpedition}
                      className="btn-cel btn-advance-gold btn-sm"
                      title="Conclude Expedition & View Results"
                      style={{ marginLeft: 'auto' }}
                    >
                      <Trophy size={13} />
                      <span className="advance-btn-text">CONCLUDE MATCH & VIEW RESULTS</span>
                      <ChevronRight size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} className="icon-lit-gold" />
                    <span>Expedition #{state.expedition} complete. Review hands and resume when ready:</span>
                    <button
                      type="button"
                      onClick={handleNextExpedition}
                      className="btn-cel btn-advance-gold btn-sm"
                      title="Start Next Expedition"
                      style={{ marginLeft: 'auto' }}
                    >
                      <Pickaxe size={13} className="animate-tremble" />
                      <span className="advance-btn-text">START NEXT EXPEDITION</span>
                      <ChevronRight size={13} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                {(state.pendingGameOver === 'defeat' || state.failures >= 3) ? (
                  <>
                    <AlertTriangle size={14} className="icon-lit-red" />
                    <span>💥 3 Cave-ins suffered! Waiting for Pit Boss (Host) to conclude match...</span>
                  </>
                ) : (state.pendingGameOver === 'victory' || state.successes >= 3) ? (
                  <>
                    <Trophy size={14} className="icon-lit-gold" />
                    <span>🏆 3 Shafts secured! Waiting for Pit Boss (Host) to conclude match...</span>
                  </>
                ) : (
                  <>
                    <Clock size={14} />
                    <span>Expedition #{state.expedition} complete. Waiting for Pit Boss (Host) to resume...</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Game Over Match Conclusion Banner */}
      {isGameOver && (
        <div className={`mine-host-advance-bar cel-card ${state.successes >= 3 ? 'bar-ready-to-advance' : 'bar-game-over-defeat'}`}>
          <div className="advance-status-row">
            {state.successes >= 3 ? (
              <>
                <Trophy size={16} className="icon-lit-gold" />
                <span>🏆 All 3 shafts secured! The crew escaped successfully!</span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="icon-lit-red" />
                <span>💥 3 Cave-ins suffered! The mine completely collapsed.</span>
              </>
            )}
            <span style={{ marginLeft: 'auto', fontStyle: 'italic', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {state.winReason || 'Match concluded — Showing final standings.'}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CENTRAL TABLE (TEXAS HOLD'EM COMMUNITY CARDS)           */}
      {/* ========================================================= */}
      <section className="mine-felt-arena">
        {/* Subtle Felt Banner with 5 community cards */}
        <div className="felt-center-banner">
          <Pickaxe size={12} className="gold-icon" />
          <span>COMMUNITY CARDS (TEXAS HOLD'EM)</span>
        </div>

        {/* The 5 Community Cards of Texas Hold'em directly on green felt */}
        <div className="community-cards-felt-row">
          {[0, 1, 2, 3, 4].map((idx) => {
            const card = state.communityCards[idx];
            const isRevealed = Boolean(card);
            let slotTag = '';
            if (idx < 3) slotTag = 'R2';
            else if (idx === 3) slotTag = 'R3';
            else if (idx === 4) slotTag = 'R4';

            return (
              <div key={`felt-comm-card-${idx}`} className="felt-card-slot">
                {isRevealed ? (
                  <PokerCardView card={card} size="md" />
                ) : (
                  <div className="felt-card-placeholder" title={`Community card for ${slotTag}`}>
                    <span className="placeholder-subtle-tag">{slotTag}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </section>

      {/* ========================================================= */}
      {/* 3. SIDE BY SIDE: YOUR HAND (1/3) & TEAMMATES (2/3)        */}
      {/* ========================================================= */}
      <section className="doomed-mine-split-arena">
        {/* SIDE A: YOUR CARDS & CLAIMABLE TOKENS (~1/3 SPACE) */}
        <div
          className={`cel-card split-panel my-hand-panel ${isShowdown && myShowdownStatus
            ? myShowdownStatus.isSuccess
              ? 'my-panel-showdown-success'
              : 'my-panel-showdown-failed'
            : ''
            }`}
        >
          <div className="split-panel-header">
            <div className="split-title-with-badge">
              <span className="woodcut-title panel-mini-title">YOUR CARDS</span>
              {isShowdown && myToken !== null && (
                <span className="my-token-badge-pill" title={`Your assigned token was ${myToken}`}>
                  ★ TOKEN {myToken}
                </span>
              )}
            </div>
          </div>

          <div className="my-hand-content">
            {/* Pocket Cards Together */}
            <div className="my-pocket-cards-fan">
              {myCards.length === 0 ? (
                <span className="empty-cards-note">Dealing cards...</span>
              ) : (
                myCards.map((card, idx) => (
                  <div key={`my-hole-card-${card.id || idx}`} className="pocket-card-holder">
                    <PokerCardView card={card} size="lg" />
                  </div>
                ))
              )}
            </div>

            {/* During Showdown: Evaluated Hand Name and explicit outcome/influence feedback */}
            {isShowdown && (
              <div className="my-eval-reveal-row">
                {myEvaluation && (
                  <span className="woodcut-title my-eval-hand-name">{myEvaluation.handName}</span>
                )}
                {myShowdownStatus?.isSuccess ? (
                  <div className="my-outcome-pill outcome-success">
                    <CheckCircle2 size={13} />
                    <span>✓ Correct order: Token {myToken} matched hand strength</span>
                  </div>
                ) : myShowdownStatus?.isFirstError ? (
                  <div className="my-outcome-pill outcome-danger is-first-break">
                    <AlertTriangle size={13} />
                    <span>⚠️ Broke sequence: {myShowdownStatus.reason || `Token ${myToken} out of order`}</span>
                  </div>
                ) : (
                  <div className="my-outcome-pill outcome-danger">
                    <AlertTriangle size={13} />
                    <span>✗ Out of sequence: Displaced by earlier sequence break</span>
                  </div>
                )}
              </div>
            )}

            {/* Token History in Previous Rounds: Round indicator on top, Chapa coin below */}
            <div className="my-history-strip">
              <span className="history-strip-label">PRIOR:</span>
              {getPlayerHistoryRounds(userId).length === 0 ? (
                <span className="history-empty-tag">None</span>
              ) : (
                <div className="prior-token-stack-row">
                  {getPlayerHistoryRounds(userId).map((item) => (
                    <div
                      key={item.label}
                      className="prior-chapa-slot"
                      title={`Round ${item.label}: Token ${item.token}`}
                    >
                      <span className="prior-round-num">{item.label}</span>
                      <div className="prior-chapa-coin">
                        <span className="prior-chapa-val">{item.token}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Pressure Tokens (1..N) in prior phases */}
            {!isShowdown && !isGameOver && (
              <div className="my-tokens-claim-box">
                <div className="claim-box-header">
                  <span className="claim-title">
                    {myToken === null
                      ? `CLAIM YOUR TOKEN (1=MIN, ${totalPlayers}=MAX):`
                      : `YOUR CURRENT TOKEN: TOKEN ${myToken} (READY TO ADVANCE)`}
                  </span>
                <small className="claim-box-subtitle" title="Click a chip to claim or steal">Select a token below</small>
                </div>

                <div className="compact-tokens-strip tokens-visibility-enhanced-row">
                  {tokenRange.map((t) => {
                    const holderId = Object.keys(state.tokens || {}).find(
                      (id) => state.tokens[id] === t
                    );
                    const holderPlayer = activePlayers.find((p) => p.id === holderId);
                    const isSelectedByMe = myToken === t;
                    const isHolderReady = holderId ? state.ready?.[holderId] : false;

                    return (
                      <PressureTokenChip
                        key={`chip-select-${t}`}
                        token={t}
                        totalTokens={totalPlayers}
                        size="md"
                        selected={isSelectedByMe}
                        confirmed={isHolderReady}
                        disabled={myToken !== null && !isSelectedByMe}
                        holderName={
                          holderPlayer
                            ? holderPlayer.id === userId
                              ? 'YOU'
                              : holderPlayer.name
                            : undefined
                        }
                        onClick={() => handleSelectToken(t)}
                      />
                    );
                  })}
                </div>

                {/* Instant Ready State (no voluntary drop) */}
                <div className="my-status-action-area">
                  {myToken === null ? (
                    <span className="choose-token-hint">
                      ⛏ Claim an available token or click a teammate to steal theirs
                    </span>
                  ) : (
                    <div className="confirmed-ready-state">
                      <span className="ready-indicator-text">
                        <CheckCircle2 size={14} /> READY WITH TOKEN {myToken}!
                      </span>
                      <span className="ready-sub-hint">
                        Locked in; can only change if another miner steals it
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDE B: TEAMMATES (~2/3 SPACE) */}
        <div className="cel-card split-panel team-miners-panel">
          <div className="split-panel-header">
            <div className="miners-header-title-box">
              <span className="woodcut-title panel-mini-title">MINERS</span>
              <span className="miners-count-pill">{displayedOtherPlayers.length} TEAMMATES</span>
            </div>

            {/* Hand Rankings Guide Button in Miners Header */}
            <div
              className="miners-hands-guide-trigger"
              onMouseEnter={() => setShowHandsGuide(true)}
              onMouseLeave={() => {
                if (!isGuidePinned) setShowHandsGuide(false);
              }}
            >
              <button
                type="button"
                className={`compact-guide-btn ${showHandsGuide || isGuidePinned ? 'guide-btn-active' : ''}`}
                onClick={() => {
                  setIsGuidePinned((prev) => !prev);
                  setShowHandsGuide((prev) => !prev);
                }}
                title="Hover or click to lock Poker Hand Rankings (#1 Best to #10 Lowest)"
                aria-label="Poker hand rankings hierarchy"
              >
                <BookOpen size={13} strokeWidth={2.4} />
                <span className="guide-btn-label">HAND RANKINGS</span>
              </button>
            </div>
          </div>

          <div className="miners-roster-grid">
            {displayedOtherPlayers.map((player) => {
              const playerToken = state.tokens?.[player.id];
              const isReady = state.ready?.[player.id];
              const evaluation = state.showdownResult?.evaluations?.[player.id];
              const revealedCards = state.privateCards?.[player.id] || [];
              const hasToken = playerToken !== null && playerToken !== undefined;
              const canSteal = !isShowdown && !isGameOver && myToken === null && hasToken;
              const pastRounds = getPlayerHistoryRounds(player.id);

              const showdownStatus = playerShowdownStatuses[player.id];
              const cardStatusClass = isShowdown
                ? showdownStatus?.isSuccess
                  ? 'miner-showdown-success'
                  : 'miner-showdown-failed'
                : isReady
                  ? 'miner-ready'
                  : '';

              return (
                <div
                  key={player.id}
                  onClick={() => canSteal && handleMinerClick(player)}
                  className={`miner-roster-chip cel-card ${cardStatusClass} ${canSteal ? 'miner-clickable-steal' : ''
                    }`}
                  title={
                    isShowdown
                      ? showdownStatus?.isSuccess
                        ? `${player.name}: Token ${playerToken} in correct order`
                        : `${player.name}: Token ${playerToken} in incorrect order`
                      : canSteal
                        ? `Click to steal Token ${playerToken} from ${player.name}`
                        : hasToken
                          ? `Token ${playerToken} held by ${player.name}`
                          : `${player.name} does not have a token yet`
                  }
                >
                  <div className="miner-main-row">
                    <div className="miner-avatar-box">
                      <AvatarIcon id={player.avatarId} size={28} />
                      {player.isHost && (
                        <div className="miner-crown" title="Pit Boss">
                          <Crown size={8} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="miner-info-col">
                      <div className="miner-name-line">
                        <strong className="miner-name">{player.name}</strong>
                        {player.isBot && <span className="bot-tag">BOT</span>}
                      </div>

                      <div className="miner-status-line">
                        {!isShowdown && (
                          isReady ? (
                            <span className="miner-ready-text">✓ READY</span>
                          ) : (
                            <span className="miner-thinking-text">⏳ THINKING...</span>
                          )
                        )}
                      </div>

                      {canSteal && (
                        <span className="miner-steal-tip">⛏ Click to steal</span>
                      )}
                    </div>

                    {/* Held Token */}
                    <div className="miner-token-dock">
                      {hasToken ? (
                        <PressureTokenChip
                          token={playerToken}
                          totalTokens={totalPlayers}
                          size="sm"
                          confirmed={isShowdown ? showdownStatus?.isSuccess : isReady}
                        />
                      ) : (
                        <div className="token-empty-circle">?</div>
                      )}
                    </div>
                  </div>

                  {/* Previous tokens for this miner: Round indicator on top, Chapa coin below */}
                  <div className="miner-history-row">
                    <span className="miner-hist-title">PRIOR:</span>
                    {pastRounds.length === 0 ? (
                      <span className="miner-hist-empty">—</span>
                    ) : (
                      <div className="prior-token-stack-row">
                        {pastRounds.map((item) => (
                          <div
                            key={item.label}
                            className="prior-chapa-slot"
                            title={`${player.name} in ${item.label}: Token ${item.token}`}
                          >
                            <span className="prior-round-num">{item.label}</span>
                            <div className="prior-chapa-coin">
                              <span className="prior-chapa-val">{item.token}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ONLY in Showdown: Reveal other players' cards, hand ranking and outcome influence callout */}
                  {isShowdown && (
                    <div className="miner-showdown-reveal">
                      <div className="miner-cards-row">
                        {revealedCards.map((card, cIdx) => (
                          <PokerCardView key={`${player.id}-rev-${cIdx}`} card={card} size="sm" />
                        ))}
                      </div>
                      {evaluation && (
                        <span className="miner-eval-text">{evaluation.handName}</span>
                      )}
                      {showdownStatus?.isSuccess ? (
                        <div className="miner-outcome-callout outcome-success">
                          <span>✓ Order preserved (Token {playerToken})</span>
                        </div>
                      ) : showdownStatus?.isFirstError ? (
                        <div className="miner-outcome-callout outcome-danger is-first-break">
                          <span>⚠️ {showdownStatus.reason || `Broke sequence with Token ${playerToken}`}</span>
                        </div>
                      ) : (
                        <div className="miner-outcome-callout outcome-danger">
                          <span>✗ Displaced after sequence break</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hand Rankings Overlay over Miners panel (leaves table and your hand completely visible) */}
          {(showHandsGuide || isGuidePinned) && (
            <div
              className="hands-guide-miners-overlay cel-card"
              onMouseEnter={() => setShowHandsGuide(true)}
              onMouseLeave={() => {
                if (!isGuidePinned) setShowHandsGuide(false);
              }}
            >
              <div className="hands-guide-header">
                <div className="guide-header-title-row">
                  <BookOpen size={14} className="gold-icon" />
                  <strong className="woodcut-title guide-popover-title">POKER HAND HIERARCHY</strong>
                  <span className="guide-popover-sub">(Best #1 to Lowest #10)</span>
                  <button
                    type="button"
                    className="guide-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsGuidePinned(false);
                      setShowHandsGuide(false);
                    }}
                    title="Close rankings"
                    aria-label="Close"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              </div>
              <div className="hands-guide-grid">
                {POKER_HAND_HIERARCHY.map((item) => (
                  <div key={item.rank} className="hands-guide-row">
                    <div className="guide-rank-header">
                      <span className={`guide-rank-pill ${item.rank === 1 ? 'rank-pill-best' : ''}`}>
                        #{item.rank}
                      </span>
                      <strong className="guide-hand-name">{item.name}</strong>
                      <div className="guide-cards-row">
                        {item.exampleCards.map((c, cIdx) => (
                          <span
                            key={`c-${item.rank}-${cIdx}`}
                            className="guide-mini-card"
                            style={{ color: SUIT_COLORS[c.suit] }}
                          >
                            <span className="g-card-rank">{c.rank}</span>
                            <span className="g-card-suit">{SUIT_SYMBOLS[c.suit]}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="guide-hand-desc">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. DISPUTE & TOKEN ROTATION FEED (BOTTOM)                 */}
      {/* ========================================================= */}
      <footer className="cel-card-deep dispute-feed-card">
        <div className="feed-header-line">
          <Zap size={13} className="gold-icon" />
          <strong className="feed-title-text">TOKEN DISPUTE & ROTATION FEED:</strong>
          <span className="feed-badge-count">{(state.actionLog || []).length}</span>
        </div>

        <div className="feed-scroll-list" ref={feedScrollRef}>
          {!state.actionLog || state.actionLog.length === 0 ? (
            <span className="feed-row-empty">No moves recorded yet...</span>
          ) : (
            state.actionLog.map((entry) => (
              <div key={entry.id} className="feed-row-item">
                <span className="feed-item-bullet">•</span>
                <span className="feed-item-text">{entry.text}</span>
              </div>
            ))
          )}
        </div>
      </footer>

      {/* ========================================================= */}
      {/* COMPACT SPECIFIC CSS (NO-SCROLL LAYOUT)                  */}
      {/* ========================================================= */}
      <style>{`
        .doomed-mine-compact-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          user-select: none;
        }

        /* 1. COMPACT TOP HEADER */
        .mine-compact-header {
          padding: 6px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: var(--radius-cel-box);
          box-shadow: var(--shadow-cel-sm);
          gap: 10px;
          flex-wrap: wrap;
        }
        .header-icon-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .compact-meter-slot {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 3px 6px;
          border-radius: 6px;
          border: 1.5px solid var(--color-ink-stroke);
          background-color: var(--color-parchment-deep);
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: bold;
          line-height: 1;
        }
        .meter-active-gold {
          background-color: var(--color-golden-buttercup);
          box-shadow: var(--shadow-cel-sm);
        }
        .meter-active-red {
          background-color: var(--color-cuphead-red);
          color: #ffffff;
          box-shadow: var(--shadow-cel-sm);
        }
        .icon-lit-gold { color: #854d0e; }
        .icon-lit-red { color: #ffffff; }
        .icon-dim { color: var(--color-text-muted); opacity: 0.35; }
        .meter-num { font-size: 11px; }

        .compact-round-badge {
          background-color: var(--color-golden-buttercup);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 999px;
          padding: 2px 10px;
          font-family: var(--font-accent);
          font-size: 11px;
          font-weight: bold;
          color: #1c1511;
          box-shadow: var(--shadow-cel-sm);
        }

        /* 1.25 POKER HANDS HIERARCHY HOVER GUIDE */
        .compact-hands-guide-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .compact-guide-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background-color: var(--color-parchment-deep);
          color: var(--color-text-main);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 6px;
          padding: 3px 8px;
          font-family: var(--font-accent);
          font-size: 10.5px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
          box-shadow: 1px 1px 0 var(--color-ink-stroke);
          user-select: none;
        }
        .compact-guide-btn:hover {
          background-color: var(--color-golden-buttercup);
          transform: translateY(-1px);
          box-shadow: 2px 2px 0 var(--color-ink-stroke);
        }
        .compact-guide-btn:active {
          transform: translateY(1px);
          box-shadow: none;
        }
        .guide-btn-label {
          font-size: 10px;
          letter-spacing: 0.03em;
        }

        .miners-header-title-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .miners-hands-guide-trigger {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .hands-guide-miners-overlay,
        .hands-guide-popover {
          position: absolute;
          top: 36px;
          left: 6px;
          right: 6px;
          bottom: 6px;
          z-index: 100;
          background-color: var(--color-glove-ivory);
          border: 2px solid var(--color-ink-stroke);
          border-radius: var(--radius-cel-box);
          box-shadow: 4px 6px 0 rgba(28, 21, 17, 0.4);
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: guideFadeSlide 0.16s ease-out;
          overflow-y: auto;
          min-height: 220px;
        }
        @keyframes guideFadeSlide {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hands-guide-header {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-bottom: 5px;
          border-bottom: 1.5px dashed var(--color-ink-stroke);
        }
        .guide-header-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .guide-popover-title {
          font-size: 11.5px;
          letter-spacing: 0.04em;
          color: var(--color-text-main);
          margin: 0;
        }
        .guide-popover-sub {
          font-family: var(--font-body);
          font-size: 8.5px;
          color: var(--color-text-muted);
          font-style: italic;
        }
        .guide-close-btn {
          margin-left: auto;
          background: var(--color-canvas-parchment);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 4px;
          cursor: pointer;
          padding: 2px 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-main);
          transition: all 0.12s ease;
        }
        .guide-close-btn:hover {
          background-color: var(--color-cuphead-red);
          color: #ffffff;
        }
        .hands-guide-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 8px;
        }
        .hands-guide-row {
          display: flex;
          flex-direction: column;
          gap: 1.5px;
          padding: 3px 6px;
          background-color: var(--color-canvas-parchment);
          border: 1px solid rgba(28, 21, 17, 0.18);
          border-radius: 4px;
          transition: background-color 0.12s ease;
        }
        .hands-guide-row:hover {
          background-color: #fefce8;
          border-color: #854d0e;
        }
        .guide-rank-header {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .guide-rank-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 8.5px;
          font-weight: 800;
          background-color: var(--color-parchment-deep);
          color: var(--color-text-main);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 3px;
          padding: 0 3px;
          min-width: 20px;
          text-align: center;
          line-height: 1.2;
        }
        .guide-rank-pill.rank-pill-best {
          background-color: var(--color-golden-buttercup);
          color: #854d0e;
          border-color: #854d0e;
        }
        .guide-hand-name {
          font-family: var(--font-heading);
          font-size: 10.5px;
          font-weight: 800;
          color: var(--color-text-main);
          white-space: nowrap;
        }
        .guide-cards-row {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-left: auto;
        }
        .guide-mini-card {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 1px;
          background-color: #ffffff;
          border: 1px solid var(--color-ink-stroke);
          border-radius: 2px;
          padding: 0 2.5px;
          font-family: var(--font-mono);
          font-size: 8.5px;
          font-weight: bold;
          line-height: 1.1;
          box-shadow: 0.5px 0.5px 0 rgba(0, 0, 0, 0.12);
        }
        .g-card-rank {
          font-size: 8.5px;
          font-weight: 800;
        }
        .g-card-suit {
          font-size: 8.5px;
        }
        .guide-hand-desc {
          font-family: var(--font-body);
          font-size: 8.5px;
          color: var(--color-text-muted);
          line-height: 1.15;
        }

        .compact-timer-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thin);
          border-radius: 6px;
          padding: 3px 8px;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-main);
        }
        .timer-urgent-pulse {
          background-color: var(--color-cuphead-red);
          color: #ffffff;
          border-color: #1c1511;
        }
        .compact-rules-btn {
          font-size: 11px;
          padding: 4px 10px;
        }

        /* 1.5 ROUND ADVANCEMENT CONTROLS (PIT BOSS) */
        .mine-host-advance-bar {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-cel-box);
          border: var(--border-ink-standard);
          background-color: var(--color-glove-ivory);
          box-shadow: var(--shadow-cel-sm);
        }
        .mine-host-advance-bar.bar-ready-to-advance {
          background-color: #fef9c3;
          border-color: #854d0e;
        }
        .mine-host-advance-bar.bar-game-over-defeat {
          background-color: #fee2e2;
          border-color: var(--color-cuphead-red);
          color: #881337;
        }
        .btn-advance-gold {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
          font-family: var(--font-heading);
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.04em;
          padding: 6px 18px;
          border-radius: 6px;
          border: 2px solid #1c1511;
          box-shadow: 2px 3px 0px #1c1511;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .btn-advance-gold:hover {
          transform: translateY(-2px);
          box-shadow: 3px 5px 0px #1c1511;
        }
        .btn-advance-gold:active {
          transform: translateY(1px);
          box-shadow: 1px 1px 0px #1c1511;
        }
        .advance-status-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-body);
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-text-main);
          text-align: center;
        }
        .advance-status-row.waiting-host {
          color: var(--color-status-warn-text);
        }

        /* 2. THE FELT POKER TABLE (DIRECTLY ON GREEN FELT, NO BROWN FRAME) */
        .mine-felt-arena {
          background: radial-gradient(circle at center, #1b4d32 0%, #0d281a 100%);
          border: 4px solid #2b1e17;
          border-radius: 14px;
          box-shadow: inset 0 0 35px rgba(0, 0, 0, 0.7), var(--shadow-cel-sm);
          min-height: 140px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 14px 16px;
          gap: 8px;
        }
        .community-cards-felt-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          z-index: 2;
        }
        .felt-card-slot {
          position: relative;
        }
        /* Card placeholder on felt: subtle integrated card outline with fine white dashed border */
        .felt-card-placeholder {
          width: 72px;
          height: 104px;
          border-radius: 8px;
          border: 1px dashed rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.02);
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }
        .placeholder-subtle-tag {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.35);
          letter-spacing: 0.06em;
          user-select: none;
        }

        /* Barra de Veredicto / Showdown (arriba de la mesa, sin tapar el tapete) */
        .mine-showdown-bar {
          padding: 8px 14px;
          border: var(--border-ink-thick);
          border-radius: var(--radius-cel-box);
          box-shadow: var(--shadow-cel-sm);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .showdown-bar-success {
          background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);
          border-color: #10b981;
        }
        .showdown-bar-failure {
          background: linear-gradient(180deg, #fff1f2 0%, #fee2e2 100%);
          border-color: var(--color-cuphead-red);
        }
        .showdown-bar-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 240px;
        }
        .showdown-bar-icon-box {
          width: 34px;
          height: 34px;
          background: rgba(255, 255, 255, 0.85);
          border: var(--border-ink-thin);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.15);
        }
        .showdown-bar-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .showdown-bar-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .showdown-bar-title {
          font-size: 13.5px;
          color: var(--color-text-main);
          letter-spacing: 0.02em;
        }
        .showdown-outcome-chip {
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          border: var(--border-ink-thin);
          letter-spacing: 0.03em;
        }
        .showdown-outcome-chip.chip-success {
          background-color: #10b981;
          color: #ffffff;
        }
        .showdown-outcome-chip.chip-failure {
          background-color: var(--color-cuphead-red);
          color: #ffffff;
        }
        .showdown-bar-desc {
          margin: 0;
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--color-text-lead);
          font-weight: 600;
          line-height: 1.3;
        }
        .showdown-bar-right {
          flex-shrink: 0;
        }
        .showdown-advance-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          font-size: 12px;
          white-space: nowrap;
        }

        .felt-center-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.55);
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        /* 3. PARALLEL SPLIT ARENA: 1/3 (TUS CARTAS) VS 2/3 (MINEROS) */
        .doomed-mine-split-arena {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 10px;
          align-items: stretch;
        }
        @media (max-width: 780px) {
          .doomed-mine-split-arena {
            grid-template-columns: 1fr;
          }
        }

        .split-panel {
          padding: 10px 12px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: var(--radius-cel-box);
          box-shadow: var(--shadow-cel-sm);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .split-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid var(--color-ink-stroke);
          padding-bottom: 4px;
        }
        .panel-mini-title {
          font-size: 13px;
          letter-spacing: 0.03em;
          color: var(--color-text-main);
        }

        /* SIDE A: YOUR CARDS & TOKENS */
        .my-hand-panel {
          min-width: 0;
        }
        .my-hand-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .my-pocket-cards-fan {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .pocket-card-holder {
          transition: transform 0.12s ease;
        }
        .pocket-card-holder:hover {
          transform: translateY(-4px) scale(1.03);
        }
        .empty-cards-note {
          font-family: var(--font-body);
          font-size: 12px;
          color: var(--color-text-muted);
        }

        /* User Panel Showdown States */
        .my-hand-panel.my-panel-showdown-success {
          border-color: #10b981 !important;
          background-color: #f7fee7 !important;
          box-shadow: 3px 3px 0px #047857 !important;
        }
        .my-hand-panel.my-panel-showdown-failed {
          border-color: var(--color-cuphead-red) !important;
          background-color: #fff1f2 !important;
          box-shadow: 3px 3px 0px #9f1239 !important;
        }
        .split-title-with-badge {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .my-token-badge-pill {
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 800;
          padding: 1px 6px;
          background: var(--color-golden-buttercup);
          color: #1c1511;
          border: var(--border-ink-thin);
          border-radius: 4px;
        }
        .my-showdown-status-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          border: var(--border-ink-thin);
        }
        .my-showdown-status-tag.status-tag-success {
          background: #d1fae5;
          color: #047857;
          border-color: #10b981;
        }
        .my-showdown-status-tag.status-tag-danger {
          background: #ffe4e6;
          color: #be123c;
          border-color: var(--color-cuphead-red);
        }
        .my-eval-reveal-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin: 4px 0;
        }
        .my-eval-hand-name {
          font-size: 13px;
          color: var(--color-text-main);
          text-align: center;
          background: var(--color-parchment-deep);
          padding: 2px 10px;
          border-radius: 4px;
          border: var(--border-ink-thin);
        }
        .my-break-reason-pill {
          font-size: 9.5px;
          font-weight: 700;
          color: #9f1239;
          background: #ffe4e6;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px dashed var(--color-cuphead-red);
        }
        /* OUTCOME / INFLUENCE VERDICT CALLOUTS */
        .my-outcome-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 700;
          line-height: 1.25;
          text-align: center;
          max-width: 100%;
        }
        .miner-outcome-callout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          margin-top: 3px;
          padding: 2px 5px;
          border-radius: 4px;
          font-family: var(--font-body);
          font-size: 9px;
          font-weight: 700;
          line-height: 1.2;
          text-align: center;
        }
        .outcome-success {
          background-color: #dcfce7;
          color: #166534;
          border: 1px solid #16a34a;
        }
        .outcome-danger {
          background-color: #ffe4e6;
          color: #9f1239;
          border: 1px solid var(--color-cuphead-red);
        }
        .outcome-danger.is-first-break {
          background-color: #fecdd3;
          border: 1.5px dashed var(--color-cuphead-red);
          font-weight: 800;
        }
        .my-showdown-summary-dock {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: var(--color-parchment-deep);
          border: var(--border-ink-thin);
          border-radius: 6px;
          margin-top: 6px;
          text-align: center;
        }
        .my-dock-chip-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .my-dock-label {
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 800;
          color: var(--color-text-lead);
        }
        .my-dock-msg {
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 600;
          color: var(--color-text-main);
          margin: 0;
        }

        .my-tokens-claim-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-thin);
          border-radius: 8px;
          padding: 8px;
        }
        .claim-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .claim-title {
          font-family: var(--font-accent);
          font-size: 9.5px;
          color: var(--color-text-lead);
          letter-spacing: 0.04em;
        }
        /* PLAYER PREVIOUS ROUND TOKEN HISTORY */
        .my-history-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--color-parchment-deep);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 6px;
          padding: 4px 8px;
          flex-wrap: wrap;
        }
        .history-strip-label {
          font-family: var(--font-accent);
          font-size: 8.5px;
          color: var(--color-text-muted);
          letter-spacing: 0.04em;
          font-weight: bold;
        }
        .history-empty-tag {
          font-family: var(--font-body);
          font-size: 10px;
          color: var(--color-text-muted);
          font-style: italic;
        }
        /* STACKED ROUND INDICATOR + CHAPA COIN (SHARED BY YOU & TEAMMATES) */
        .prior-token-stack-row {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }
        .prior-chapa-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .prior-round-num {
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 800;
          color: var(--color-text-muted);
          letter-spacing: 0.04em;
          line-height: 1;
          background: var(--color-canvas-parchment);
          border: 1px solid rgba(28, 21, 17, 0.25);
          border-radius: 3px;
          padding: 1px 3px;
        }
        .prior-chapa-coin {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fff1b8 0%, #facc15 50%, #ca8a04 100%);
          border: 1.5px solid #1c1511;
          box-shadow: 1px 1px 0 #1c1511, inset 0 0 0 1px rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s ease;
          user-select: none;
        }
        .prior-chapa-coin:hover {
          transform: scale(1.15);
        }
        .prior-chapa-val {
          font-family: var(--font-accent);
          font-size: 10.5px;
          font-weight: 900;
          color: #1c1511;
          line-height: 1;
          text-shadow: 0.5px 0.5px 0 rgba(255, 255, 255, 0.6);
        }

        .compact-tokens-strip {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .my-status-action-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-top: 4px;
        }
        .choose-token-hint {
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--color-status-warn-text);
          font-weight: 700;
          text-align: center;
        }
        .confirmed-ready-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          gap: 2px;
        }
        .ready-indicator-text {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-heading);
          font-size: 12px;
          color: var(--color-status-success-text);
        }
        .ready-sub-hint {
          font-family: var(--font-body);
          font-size: 9.5px;
          color: var(--color-text-muted);
          font-style: italic;
        }

        /* LADO B: EL RESTO DE LOS MINEROS */
        .team-miners-panel {
          position: relative;
          min-width: 0;
          min-height: 220px;
        }
        .miners-count-pill {
          font-family: var(--font-accent);
          font-size: 8.5px;
          background-color: var(--color-parchment-deep);
          color: var(--color-text-muted);
          padding: 1px 6px;
          border-radius: 999px;
          border: 1px solid var(--color-ink-stroke);
        }
        .miners-roster-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 6px;
        }
        .miner-roster-chip {
          padding: 6px 8px;
          background-color: var(--color-canvas-parchment);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .miner-roster-chip.miner-ready {
          border-color: #10b981;
          background-color: var(--color-status-success-bg);
        }
        .miner-roster-chip.miner-showdown-success {
          border-color: #10b981 !important;
          background-color: #ecfdf5 !important;
          box-shadow: 2px 2px 0px #047857 !important;
        }
        .miner-roster-chip.miner-showdown-failed {
          border-color: var(--color-cuphead-red) !important;
          background-color: #fff1f2 !important;
          box-shadow: 2px 2px 0px #9f1239 !important;
        }
        .miner-status-chip-success {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 800;
          color: #047857;
          background: #d1fae5;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid #10b981;
        }
        .miner-status-chip-danger {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 9.5px;
          font-weight: 800;
          color: #be123c;
          background: #ffe4e6;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid var(--color-cuphead-red);
        }
        .miner-status-chip-danger.is-first-break {
          background: #fecdd3;
          border: 1.5px solid var(--color-cuphead-red);
        }
        .miner-break-callout {
          margin-top: 3px;
          padding: 3px 5px;
          background: rgba(225, 29, 72, 0.08);
          border: 1px dashed var(--color-cuphead-red);
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: 700;
          color: #9f1239;
          text-align: center;
          line-height: 1.25;
        }
        /* Clickable miner card for stealing tokens */
        .miner-clickable-steal {
          cursor: pointer;
          transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
        }
        .miner-clickable-steal:hover {
          transform: translateY(-2px);
          border-color: var(--color-cuphead-red);
          box-shadow: 2px 3px 0px #1c1511;
        }
        .miner-main-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .miner-avatar-box {
          position: relative;
          width: 28px;
          height: 28px;
          background-color: var(--color-golden-buttercup);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .miner-crown {
          position: absolute;
          top: -2px;
          right: -2px;
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
          border: 1px solid #1c1511;
          border-radius: 999px;
          width: 12px;
          height: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .miner-info-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .miner-name-line {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .miner-name {
          font-family: var(--font-heading);
          font-size: 12px;
          color: var(--color-text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bot-tag {
          font-family: var(--font-accent);
          font-size: 7.5px;
          background-color: var(--color-parchment-deep);
          color: var(--color-text-muted);
          padding: 0 3px;
          border-radius: 2px;
          border: 1px solid var(--color-ink-stroke);
        }
        .miner-status-line {
          font-family: var(--font-body);
          font-size: 9.5px;
          font-weight: 700;
        }
        .miner-ready-text { color: var(--color-status-success-text); }
        .miner-thinking-text { color: var(--color-status-warn-text); }
        .miner-steal-tip {
          font-family: var(--font-accent);
          font-size: 8px;
          color: var(--color-cuphead-red);
          font-weight: bold;
          letter-spacing: 0.02em;
          margin-top: 1px;
        }
        .miner-token-dock {
          flex-shrink: 0;
        }
        .token-empty-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1.5px dashed var(--color-ink-stroke);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-heading);
          font-size: 11px;
          color: var(--color-text-muted);
        }

        /* Teammate token history in prior rounds */
        .miner-history-row {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
          padding-top: 3px;
          border-top: 1px dashed var(--color-ink-stroke);
          flex-wrap: wrap;
        }
        .miner-hist-title {
          font-family: var(--font-accent);
          font-size: 8px;
          color: var(--color-text-muted);
          letter-spacing: 0.03em;
        }
        .miner-hist-empty {
          font-family: var(--font-body);
          font-size: 9px;
          color: var(--color-text-muted);
        }
        .miner-hist-pills {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-wrap: wrap;
        }

        /* Showdown Reveal for Opponents */
        .miner-showdown-reveal {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 4px;
          border-top: 1px dashed var(--color-ink-stroke);
        }
        .miner-cards-row {
          display: flex;
          gap: 4px;
          justify-content: center;
        }
        .miner-eval-text {
          font-family: var(--font-body);
          font-size: 9.5px;
          font-weight: 800;
          color: var(--color-text-main);
          text-align: center;
          background: rgba(255, 255, 255, 0.6);
          padding: 1px 4px;
          border-radius: 3px;
        }

        /* 4. DISPUTE / ROTATION COMPACT FEED (SCROLLABLE DOWNWARD) */
        .dispute-feed-card {
          padding: 6px 12px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thin);
        }
        .feed-header-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .feed-title-text {
          font-family: var(--font-accent);
          font-size: 10px;
          letter-spacing: 0.04em;
          color: var(--color-text-main);
        }
        .feed-badge-count {
          font-family: var(--font-mono);
          font-size: 9px;
          padding: 0 5px;
          border-radius: 999px;
          background-color: var(--color-glove-ivory);
          border: 1px solid var(--color-ink-stroke);
          color: var(--color-text-muted);
          font-weight: 700;
        }

        .feed-scroll-list {
          max-height: 72px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding-right: 4px;
        }
        .feed-row-item {
          display: flex;
          align-items: baseline;
          gap: 6px;
          background-color: var(--color-canvas-parchment);
          border: 1px solid rgba(28, 21, 17, 0.16);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--color-text-main);
          line-height: 1.3;
        }
        .feed-item-bullet {
          color: var(--color-cuphead-red);
          font-weight: 900;
          font-size: 11px;
        }
        .feed-item-text {
          flex: 1;
        }
        .feed-row-empty {
          font-family: var(--font-body);
          font-size: 10.5px;
          color: var(--color-text-muted);
          font-style: italic;
          padding: 2px 4px;
        }

        /* ========================================================= */
        /* POKER CARD & BRASS TOKEN SPECIFIC CSS                     */
        /* ========================================================= */
        .poker-card-view {
          background-color: #fdfbf5;
          border: 2.5px solid #2b1e17;
          border-radius: 8px;
          box-shadow: 2.5px 2.5px 0px #1c1511;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          user-select: none;
          overflow: hidden;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .poker-card-view.size-sm {
          width: 48px;
          height: 70px;
          padding: 2px;
        }
        .poker-card-view.size-md {
          width: 72px;
          height: 104px;
          padding: 4px;
        }
        .poker-card-view.size-lg {
          width: 82px;
          height: 118px;
          padding: 5px;
        }
        .poker-card-view.is-clickable:hover {
          transform: translateY(-4px);
          cursor: pointer;
        }

        /* Face Down */
        .card-face-down {
          background-color: #b72722;
          border-color: #2b1e17;
        }
        .card-back-pattern {
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            45deg,
            #8c1d18,
            #8c1d18 3px,
            #a82620 3px,
            #a82620 6px
          );
          border: 1.5px solid #ffd043;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-back-center-badge {
          background-color: #1c1511;
          border: 1px solid #ffd043;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .back-pickaxe-icon {
          color: #ffd043;
          font-size: 11px;
        }

        /* Face Up */
        .corner-index {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }
        .corner-top { align-self: flex-start; }
        .corner-bottom {
          align-self: flex-end;
          transform: rotate(180deg);
        }
        .rank-text {
          font-family: 'Calistoga', serif, sans-serif;
          font-weight: 900;
          line-height: 1;
        }
        .size-sm .rank-text { font-size: 11px; }
        .size-md .rank-text { font-size: 14px; }
        .size-lg .rank-text { font-size: 17px; }

        .card-center-stage {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .number-card-suit-badge {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-label-tag {
          position: absolute;
          bottom: 2px;
          background-color: #ffd043;
          color: #1c1511;
          border: 1px solid #1c1511;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 7px;
          font-weight: 700;
          padding: 0 3px;
        }

        /* BRASS PRESSURE TOKENS */
        .brass-token-chip {
          background: linear-gradient(135deg, #ffd043 0%, #e5a720 100%);
          border: 2px solid #1c1511;
          border-radius: 50%;
          box-shadow: 2px 2px 0px #1c1511;
          cursor: pointer;
          user-select: none;
          transition: transform 0.08s ease, box-shadow 0.08s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0;
        }
        .brass-token-chip.chip-sm {
          width: 28px;
          height: 28px;
        }
        .brass-token-chip.chip-md {
          width: 44px;
          height: 44px;
        }
        .brass-token-chip.chip-lg {
          width: 56px;
          height: 56px;
        }
        .brass-token-chip:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 2px 4px 0px #1c1511;
        }
        .brass-token-chip:active:not(:disabled) {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px #1c1511;
        }
        .brass-token-chip:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .chip-outer-rim {
          width: 86%;
          height: 86%;
          border: 1px dashed #1c1511;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chip-inner-face {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .chip-number {
          font-family: 'Calistoga', serif, sans-serif;
          font-weight: 900;
          color: #1c1511;
          line-height: 1;
        }
        .chip-sm .chip-number { font-size: 13px; }
        .chip-md .chip-number { font-size: 17px; }
        .chip-lg .chip-number { font-size: 22px; }
        .chip-stars-row {
          font-size: 7px;
          color: #78350f;
          letter-spacing: 0.5px;
          line-height: 1;
          margin-top: 1px;
        }
        .chip-holder-tag {
          position: absolute;
          bottom: -6px;
          background-color: #1c1511;
          color: #ffd043;
          border: 1px solid #1c1511;
          border-radius: 999px;
          font-family: var(--font-heading);
          font-size: 7.5px;
          padding: 0 4px;
          white-space: nowrap;
          max-width: 50px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chip-selected {
          border-color: var(--color-cuphead-red);
          box-shadow: 0 0 0 2.5px var(--color-cuphead-red), 2px 2px 0px #1c1511;
        }
        .chip-confirmed {
          border-color: #10b981;
          box-shadow: 0 0 0 2.5px #10b981, 2px 2px 0px #1c1511;
        }
      `}</style>
    </div>
  );
};
