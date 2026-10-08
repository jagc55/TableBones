import React, { useState, useEffect, useRef } from 'react';
import { BaseGameEngineProps, Player } from '../../types';
import {
  MidnightCard,
  PlayedTrickCard,
  RoundScoreBreakdown,
  PlayerRoundRecord,
} from './types';
import {
  getEstablishedLeadSuit,
  isCardPlayable,
  evaluateTrickWinner,
} from './midnightAlleyLogic';
import {
  MidnightCardView,
  SuitIcon,
  BossIcon,
  ChameleonIcon,
  AlibiIcon,
  GangsterIcon,
} from './MidnightCards';
import { AvatarIcon } from '../../utils/avatars';
import { soundstage } from '../../utils/audio';
import {
  Trophy,
  Play,
  CheckCircle2,
  Users,
  Crown,
  Sparkles,
  ArrowUpDown,
  Table,
  X,
  Clock,
  Swords,
  ShieldCheck,
} from 'lucide-react';

const TOTAL_ROUNDS = 10;

export const MidnightAlleyEngine: React.FC<BaseGameEngineProps> = ({
  currentUserPlayer,
  players,
  matchState,
  onGameAction,
  onActionNotification,
}) => {
  const match = matchState?.gameId === 'midnight-alley' ? matchState : null;

  // Active players list
  const activePlayers: Player[] = (players && players.length >= 2
    ? players
    : ((match?.players as unknown as Player[]) || [currentUserPlayer])) as Player[];

  // Sorting Mode for Human Player's Hand
  const [handSortMode, setHandSortMode] = useState<'suit' | 'value'>('suit');

  // UI Modals
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [chameleonCardToPlay, setChameleonCardToPlay] = useState<MidnightCard | null>(null);
  const [pendingBid, setPendingBid] = useState<number>(0);

  // Local ticker for smooth countdown synced to match.deadline
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const timeLeft = Math.max(0, Math.ceil(((match?.deadline || 0) - now) / 1000));

  // Reset pending bid and chameleon on new round
  const prevRoundRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (!match) return;

    if (prevRoundRef.current !== match.round) {
      setPendingBid(0);
      setChameleonCardToPlay(null);
      soundstage.playRoundBell();
      onActionNotification?.(`Round ${match.round} dealt! Place your Racket Bids!`);
      prevRoundRef.current = match.round;
    }

    if (prevPhaseRef.current !== match.phase) {
      if ((match.phase as string) === 'trick_resolved' && match.lastResult) {
        soundstage.playScoreTrumpet();
        const winner = activePlayers.find((p: Player) => p.id === match.lastResult?.winnerPlayerId);
        const name = winner?.name || match.lastResult.winnerPlayerName || 'Opponent';
        const notice = match.lastResult.bonusReason
          ? match.lastResult.bonusReason
          : `${name} captured trick with ${match.lastResult.winningCard.name}!`;
        onActionNotification?.(notice);
      } else if ((match.phase as string) === 'round_summary') {
        soundstage.playVictoryFanfare();
        onActionNotification?.(`Round ${match.round} Summary: Check your Underground Scores!`);
      }
      prevPhaseRef.current = match.phase;
    }
  }, [match?.round, match?.phase, match?.lastResult, activePlayers, onActionNotification]);

  if (!match) {
    return (
      <div className="midnight-waiting cel-card">
        <h3 className="woodcut-title">DEALING MIDNIGHT ALLEY...</h3>
        <p>Waiting for the server to shuffle and deal the cards.</p>
        <style>{`
          .midnight-waiting {
            text-align: center;
            padding: 80px 20px;
            background: #fdfbf5;
            border: 3px solid #1c1511;
            box-shadow: 4px 4px 0px #1c1511;
            border-radius: 12px;
          }
        `}</style>
      </div>
    );
  }

  const round = match.round || 1;
  const phase = match.phase || 'bidding';
  const myHand: MidnightCard[] = match.hands?.[currentUserPlayer.id] || [];
  const currentTrick: PlayedTrickCard[] = match.currentTrick || [];
  const isMyTurn = match.turnPlayerId === currentUserPlayer.id;
  const hasMyBid = match.bids?.[currentUserPlayer.id] !== undefined;

  // Calculate current trick number
  const tricksPlayed = Object.values(match.tricksWon || {}).reduce((acc: number, val) => acc + (Number(val) || 0), 0);
  const currentTrickNumber = Math.min(round, tricksPlayed + 1);

  // Established lead suit
  const establishedLead = getEstablishedLeadSuit(currentTrick);

  // Evaluate currently winning card in trick
  const currentWinningPlay = currentTrick.length > 0 ? evaluateTrickWinner(currentTrick) : null;

  // Sort player's hand by Suit or Value
  const sortCards = (cards: MidnightCard[], mode: 'suit' | 'value'): MidnightCard[] => {
    return [...cards].sort((a, b) => {
      if (mode === 'suit') {
        const suitOrder = (c: MidnightCard) => {
          if (c.role === 'alibi') return 1;
          if (c.suit === 'gold') return 2;
          if (c.suit === 'cyan') return 3;
          if (c.suit === 'ruby') return 4;
          if (c.suit === 'black') return 5;
          if (c.role === 'chameleon') return 6;
          if (c.role === 'femme-fatale') return 7;
          if (c.role === 'gangster') return 8;
          if (c.role === 'boss') return 9;
          return 10;
        };
        const diff = suitOrder(a) - suitOrder(b);
        if (diff !== 0) return diff;
        return (a.value || 0) - (b.value || 0);
      } else {
        const valueScore = (c: MidnightCard) => {
          if (c.role === 'alibi') return -1;
          if (c.role === 'chameleon') return 80;
          if (c.role === 'femme-fatale') return 85;
          if (c.role === 'gangster') return 90;
          if (c.role === 'boss') return 100;
          const suitBonus = c.suit === 'black' ? 14 : 0;
          return (c.value || 0) + suitBonus;
        };
        return valueScore(a) - valueScore(b);
      }
    });
  };

  const sortedMyHand = sortCards(myHand, handSortMode);

  // Human Card Click
  const handleHumanCardClick = (card: MidnightCard) => {
    if (phase !== 'playing' || !isMyTurn) return;
    if (!isCardPlayable(card, myHand, currentTrick)) {
      soundstage.playSlideDown();
      return;
    }

    if (card.role === 'chameleon') {
      soundstage.playTap();
      setChameleonCardToPlay(card);
      return;
    }

    soundstage.playTap();
    onGameAction?.({ type: 'PLAY_CARD', cardId: card.id });
  };

  const handleChameleonChoice = (choice: 'gangster' | 'alibi') => {
    if (!chameleonCardToPlay) return;
    soundstage.playTap();
    onGameAction?.({ type: 'PLAY_CARD', cardId: chameleonCardToPlay.id, chameleonChoice: choice });
    setChameleonCardToPlay(null);
  };

  const handleConfirmBid = (bid: number) => {
    soundstage.playTap();
    onGameAction?.({ type: 'PLACE_BID', bid });
  };

  const handleProceedNextRound = () => {
    soundstage.playTap();
    onGameAction?.({ type: 'NEXT_ROUND' });
  };

  const roundSummaryScores: Record<string, RoundScoreBreakdown> | null = match.roundSummaryScores || null;
  const roundHistory: Record<number, Record<string, PlayerRoundRecord>> = match.roundHistory || {};

  return (
    <div className="midnight-alley-wrapper">
      <div className="midnight-alley-layout">
        {/* Left Container: Dedicated Players Roster */}
        <div className="cel-card alley-roster-container">
          <div className="roster-header">
            <div className="roster-header-title">
              <Users size={16} strokeWidth={2.8} />
              <span className="woodcut-title roster-title">CONTENDERS</span>
            </div>
            <span className="roster-round-pill">ROUND {round}/{TOTAL_ROUNDS}</span>
          </div>

          <div className="roster-cards-list">
            {activePlayers.map((player: Player) => {
              const isTurn = (phase === 'playing' || phase === 'bidding') && match.turnPlayerId === player.id;
              const isLead = match.leadPlayerId === player.id;
              const isMe = player.id === currentUserPlayer.id;
              const playerBid = match.bids?.[player.id];
              const playerWon = match.tricksWon?.[player.id] || 0;
              const playerTotal = match.cumulativeScores?.[player.id] || 0;

              return (
                <div
                  key={player.id}
                  className={`roster-player-item ${isTurn ? 'player-item-turn' : ''} ${
                    isMe ? 'player-item-me' : ''
                  }`}
                >
                  <div className="player-item-top">
                    <div className="player-avatar-box">
                      <AvatarIcon id={player.avatarId} size={30} />
                      {player.isHost && (
                        <div className="player-crown-badge" title="Host">
                          <Crown size={9} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="player-name-col">
                      <div className="name-row">
                        <strong className="player-display-name">{player.name}</strong>
                        {isMe && <span className="player-you-tag">YOU</span>}
                        {isLead && <span className="player-lead-tag">LEAD</span>}
                      </div>
                      {isTurn && (
                        <span className="turn-pulse-indicator">
                          <Sparkles size={11} strokeWidth={3} />
                          <span>{isMe ? `${timeLeft}s LEFT` : 'THEIR TURN'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats Grid: Won, Bid, Total Score */}
                  <div className="player-stats-row">
                    <div className="stat-pill stat-won-box" title="Tricks won this round">
                      <span className="stat-label">WON</span>
                      <strong className="stat-num">{playerWon}</strong>
                    </div>

                    <div className="stat-pill stat-bid-box" title="Tricks bid for this round">
                      <span className="stat-label">BID</span>
                      <strong className="stat-num">
                        {playerBid !== null && playerBid !== undefined ? playerBid : '-'}
                      </strong>
                    </div>

                    <div className="stat-pill stat-total-box" title="Cumulative tournament score">
                      <span className="stat-label">TOTAL</span>
                      <strong className="stat-num">{playerTotal} PTS</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Main Arena: Felt Table & Player Hand */}
        <div className="alley-main-area">
          {/* Top Info Strip */}
          <div className="alley-info-strip">
            <div className="alley-trick-counter">
              <span className="trick-label">TRICK:</span>
              <strong className="trick-val">{currentTrickNumber} / {round}</strong>
            </div>

            <div className="alley-lead-suit-badge">
              {establishedLead ? (
                <div className="lead-suit-pill">
                  <span className="lead-label">ESTABLISHED SUIT:</span>
                  <SuitIcon suit={establishedLead} size={17} />
                  <strong className="lead-name">
                    {establishedLead === 'black' ? 'MIDNIGHT TRUMP' : establishedLead.toUpperCase()}
                  </strong>
                </div>
              ) : (
                <span className="lead-free-hint">Free Lead (First numbered card establishes suit)</span>
              )}
            </div>

            <button
              onClick={() => {
                soundstage.playTap();
                setShowScorecardModal(true);
              }}
              className="btn-cel btn-brawl-secondary btn-sm strip-scorecard-btn"
              title="View full tournament score table (Rounds 1 to 10)"
            >
              <Table size={14} strokeWidth={2.8} />
              <span>SCORE TABLE</span>
            </button>
          </div>

          {/* Green Felt Poker Table */}
          <div className="speakeasy-felt-table">
            {/* Center Background Watermark */}
            <div className="felt-center-watermark">
              <BossIcon size={140} className="watermark-boss-svg" />
              <span className="watermark-title">MIDNIGHT ALLEY</span>
            </div>

            {/* Center Active Trick Display */}
            <div className="felt-trick-center">
              {currentTrick.length === 0 ? (
                <div className="empty-trick-slot">
                  <span className="empty-trick-hint">
                    {phase === 'bidding'
                      ? 'Waiting for trick bids...'
                      : `${activePlayers.find((p) => p.id === match.leadPlayerId)?.name || 'Lead'} leads the trick`}
                  </span>
                </div>
              ) : (
                <div className="active-trick-cards-row">
                  {currentTrick.map((played, idx) => {
                    const isCurrentlyWinning =
                      currentWinningPlay?.winnerPlayerId === played.playerId &&
                      currentWinningPlay?.winningCard.id === played.card.id;

                    return (
                      <div
                        key={`${played.playerId}-${played.card.id}-${idx}`}
                        className={`played-trick-item animate-card-drop ${
                          isCurrentlyWinning ? 'trick-item-winning-aura' : ''
                        }`}
                      >
                        <div className="played-card-meta">
                          <AvatarIcon id={played.playerAvatarId} size={16} />
                          <span className="played-player-name" title={played.playerName}>
                            {played.playerName}
                          </span>
                        </div>

                        <MidnightCardView
                          card={played.card}
                          compact={true}
                          chameleonChoice={played.chameleonChoice}
                          isPlayable={false}
                        />

                        {isCurrentlyWinning && (
                          <div className="winning-lead-tag">
                            <Crown size={10} strokeWidth={3} />
                            <span>LEADING TRICK</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Trick Resolution Winner Overlay */}
              {(match.lastResult || (phase as string) === 'trick_resolved') && match.lastResult && (
                <div className="trick-winner-banner animate-pop">
                  <Trophy size={18} strokeWidth={2.8} className="winner-trophy-icon" />
                  <div className="winner-banner-text">
                    <strong>
                      {(
                        activePlayers.find((p: Player) => p.id === match.lastResult?.winnerPlayerId)?.name ||
                        (match.lastResult as any).winnerPlayerName ||
                        'CONTENDER'
                      ).toUpperCase()}{' '}
                      TAKES THE TRICK!
                    </strong>
                    {match.lastResult.bonusReason && <small>{match.lastResult.bonusReason}</small>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Player Hand Dock */}
          <div className="player-hand-dock">
            <div className="hand-dock-header">
              <div className="dock-header-left">
                <span className="dock-title">YOUR HAND ({myHand.length} CARDS):</span>
                {phase === 'playing' && isMyTurn && (
                  <span className={`dock-turn-callout ${timeLeft <= 10 ? 'dock-turn-urgent' : ''}`}>
                    <Clock size={12} strokeWidth={3} />
                    <span>YOUR TURN! ({timeLeft}s)</span>
                  </span>
                )}
              </div>

              {/* Card Sorting Toggle */}
              <div className="hand-sort-toggle">
                <ArrowUpDown size={13} strokeWidth={2.5} className="sort-icon" />
                <span className="sort-hint">SORT:</span>
                <button
                  type="button"
                  onClick={() => {
                    soundstage.playTap();
                    setHandSortMode('suit');
                  }}
                  className={`btn-cel btn-sort-btn ${handSortMode === 'suit' ? 'sort-active' : ''}`}
                >
                  BY SUIT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundstage.playTap();
                    setHandSortMode('value');
                  }}
                  className={`btn-cel btn-sort-btn ${handSortMode === 'value' ? 'sort-active' : ''}`}
                >
                  BY VALUE
                </button>
              </div>
            </div>

            {/* Hand Fan */}
            <div
              className="hand-cards-fan"
              style={{ gap: myHand.length > 7 ? '6px' : '10px' }}
            >
              {myHand.length === 0 ? (
                <span className="hand-empty-text">
                  {phase === 'bidding' ? 'Cards dealt for bidding.' : 'No cards in hand. Wrapping up round...'}
                </span>
              ) : (
                sortedMyHand.map((card) => {
                  const playable = phase === 'playing' && isMyTurn && isCardPlayable(card, myHand, currentTrick);
                  return (
                    <MidnightCardView
                      key={card.id}
                      card={card}
                      compact={myHand.length > 8}
                      isPlayable={playable}
                      isDimmed={phase !== 'playing' || !isMyTurn || !playable}
                      onClick={() => handleHumanCardClick(card)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bidding Phase Modal (Screenshot 2) */}
      {phase === 'bidding' && !hasMyBid && (
        <div className="modal-overlay">
          <div className="modal-content bid-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bid-modal-header">
              <div className="bid-header-left">
                <BossIcon size={52} />
                <div className="bid-header-text">
                  <span className="ribbon-banner">ROUND {round} OF {TOTAL_ROUNDS} • RACKET PREDICTION</span>
                  <h3 className="woodcut-title bid-title">DECLARE YOUR TRICK BID</h3>
                </div>
              </div>
              <div className="bid-header-right-actions">
                <div
                  className={`bid-afk-timer-badge ${timeLeft <= 10 ? 'bid-timer-urgent' : ''}`}
                  title="Turn timer"
                >
                  <Clock size={13} strokeWidth={2.8} />
                  <span>{timeLeft}s</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundstage.playTap();
                    setShowScorecardModal(true);
                  }}
                  className="btn-cel btn-brawl-secondary btn-sm bid-scorecard-quick-btn"
                  title="View full tournament score table (Rounds 1 to 10)"
                >
                  <Table size={14} strokeWidth={2.8} />
                  <span>SCORE TABLE</span>
                </button>
              </div>
            </div>

            <div className="bid-hand-preview">
              <div className="preview-top-row">
                <span className="bid-preview-label">YOUR DEALT HAND ({sortedMyHand.length} CARDS):</span>
                <div className="hand-sort-toggle-sm">
                  <span className="sort-hint-sm">Sort:</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundstage.playTap();
                      setHandSortMode('suit');
                    }}
                    className={`sort-pill-sm ${handSortMode === 'suit' ? 'pill-on' : ''}`}
                  >
                    By Suit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundstage.playTap();
                      setHandSortMode('value');
                    }}
                    className={`sort-pill-sm ${handSortMode === 'value' ? 'pill-on' : ''}`}
                  >
                    By Value
                  </button>
                </div>
              </div>

              <div
                className="preview-cards-tray"
                style={{ gap: sortedMyHand.length > 7 ? '6px' : '10px' }}
              >
                {sortedMyHand.map((c) => (
                  <MidnightCardView
                    key={c.id}
                    card={c}
                    compact={sortedMyHand.length > 6}
                    isPlayable={false}
                  />
                ))}
              </div>
            </div>

            <div className="bid-selector-group">
              <span className="bid-select-label">SELECT YOUR PREDICTED TRICKS:</span>
              <div className="bid-buttons-grid">
                {Array.from({ length: round + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      soundstage.playTap();
                      setPendingBid(idx);
                    }}
                    className={`btn-cel bid-chip-btn ${pendingBid === idx ? 'chip-selected' : ''}`}
                  >
                    <span className="chip-val">{idx}</span>
                    <span className="chip-sub">
                      {idx === 0 ? 'ZERO' : idx === 1 ? '1 TRICK' : `${idx} TRICKS`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bid-modal-footer">
              <button
                type="button"
                onClick={() => handleConfirmBid(pendingBid)}
                className="btn-cel btn-brawl-primary confirm-bid-btn"
              >
                <CheckCircle2 size={20} strokeWidth={3} />
                <span>CONFIRM BID ({pendingBid} {pendingBid === 1 ? 'TRICK' : 'TRICKS'}) • {timeLeft}s</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chameleon Choice Modal */}
      {chameleonCardToPlay && (
        <div className="modal-overlay" onClick={() => setChameleonCardToPlay(null)}>
          <div className="modal-content chameleon-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="chameleon-modal-header">
              <div className="chameleon-header-icon-box">
                <ChameleonIcon size={52} />
              </div>
              <div className="chameleon-header-text">
                <span className="ribbon-banner">SPECIAL ROLE • UNDERCOVER INFILTRATOR</span>
                <h3 className="woodcut-title chameleon-title">HOW WILL THE CHAMELEON ACT?</h3>
              </div>
              <button
                type="button"
                onClick={() => setChameleonCardToPlay(null)}
                className="btn-cel btn-icon-sq btn-brawl-neutral close-chameleon-btn"
                title="Cancel (keep card in hand)"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            <div className="chameleon-callout-banner">
              <p className="chameleon-desc">
                The mob chameleon can masquerade as a ruthless enforcer or slip out the back with a forged alibi. Select your play:
              </p>
            </div>

            <div className="chameleon-options-grid">
              {/* Option 1: Gangster */}
              <div
                onClick={() => handleChameleonChoice('gangster')}
                className="chameleon-choice-card choice-gangster"
                role="button"
                tabIndex={0}
              >
                <div className="choice-card-badge badge-gangster">
                  <span>AGGRESSIVE STRIKE</span>
                </div>
                <div className="choice-icon-wrap gangster-icon-bg">
                  <GangsterIcon size={64} />
                </div>
                <div className="choice-card-content">
                  <h4 className="choice-role-name">GANGSTER</h4>
                  <span className="choice-role-sub">MOB ENFORCER</span>
                  <p className="choice-role-detail">
                    Beats all numbered cards and captures <strong>Femme Fatales</strong>. If it&apos;s the first Gangster played in the trick, it takes the lead!
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-cel btn-brawl-primary choice-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChameleonChoice('gangster');
                  }}
                >
                  <Swords size={16} strokeWidth={2.8} />
                  <span>PLAY AS GANGSTER</span>
                </button>
              </div>

              {/* Option 2: Alibi */}
              <div
                onClick={() => handleChameleonChoice('alibi')}
                className="chameleon-choice-card choice-alibi"
                role="button"
                tabIndex={0}
              >
                <div className="choice-card-badge badge-alibi">
                  <span>STRATEGIC ESCAPE</span>
                </div>
                <div className="choice-icon-wrap alibi-icon-bg">
                  <AlibiIcon size={64} />
                </div>
                <div className="choice-card-content">
                  <h4 className="choice-role-name">ALIBI</h4>
                  <span className="choice-role-sub">CLEAN ESCAPE</span>
                  <p className="choice-role-detail">
                    Presents an airtight alibi and dodges the crossfire. Always <strong>loses the trick</strong> to protect your exact trick bid!
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-cel btn-brawl-neutral choice-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChameleonChoice('alibi');
                  }}
                >
                  <ShieldCheck size={16} strokeWidth={2.8} />
                  <span>PLAY AS ALIBI</span>
                </button>
              </div>
            </div>

            <div className="chameleon-modal-footer">
              <button
                type="button"
                onClick={() => setChameleonCardToPlay(null)}
                className="btn-cel btn-brawl-neutral btn-sm chameleon-cancel-btn"
              >
                <span>CANCEL (KEEP CARD IN HAND)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round Summary Modal (Screenshot 3) */}
      {(phase as string) === 'round_summary' && roundSummaryScores && (
        <div className="modal-overlay">
          <div className="modal-content summary-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <Trophy size={40} strokeWidth={2.8} className="summary-trophy" />
              <h3 className="woodcut-title">ROUND {round} RESULTS</h3>
            </div>

            <div className="summary-table-wrap">
              <table className="summary-score-table">
                <thead>
                  <tr>
                    <th>CONTENDER</th>
                    <th>BID</th>
                    <th>WON</th>
                    <th>BID PTS</th>
                    <th>BONUS</th>
                    <th>ROUND</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.map((player: Player) => {
                    const row = roundSummaryScores[player.id];
                    if (!row) return null;
                    const isSuccess = row.bidScore > 0;
                    const isMe = player.id === currentUserPlayer.id;

                    return (
                      <tr key={player.id} className={isMe ? 'row-is-me' : ''}>
                        <td className="contender-name-cell">
                          <AvatarIcon id={player.avatarId} size={22} />
                          <strong>{player.name}</strong>
                        </td>
                        <td>{row.bid}</td>
                        <td>{row.tricksWon}</td>
                        <td className={isSuccess ? 'pts-positive' : 'pts-negative'}>
                          {row.bidScore > 0 ? `+${row.bidScore}` : row.bidScore}
                        </td>
                        <td className="pts-bonus">+{row.bonusScore}</td>
                        <td className="pts-round-total">
                          <strong>{row.totalRoundScore > 0 ? `+${row.totalRoundScore}` : row.totalRoundScore}</strong>
                        </td>
                        <td className="pts-cumulative">
                          <strong>{row.cumulativeScore}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="summary-modal-footer">
              <button
                type="button"
                onClick={() => {
                  soundstage.playTap();
                  setShowScorecardModal(true);
                }}
                className="btn-cel btn-brawl-secondary view-scorecard-btn"
                title="View full tournament scorecard"
              >
                <Table size={16} strokeWidth={2.8} />
                <span>VIEW SCORE TABLE</span>
              </button>
              <button
                type="button"
                onClick={handleProceedNextRound}
                className="btn-cel btn-brawl-primary proceed-btn"
              >
                <Play size={16} strokeWidth={3} />
                <span>{round < TOTAL_ROUNDS ? `CONTINUE TO ROUND ${round + 1}` : 'FINISH TOURNAMENT'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Scorecard Modal */}
      {showScorecardModal && (
        <div className="modal-overlay" onClick={() => setShowScorecardModal(false)}>
          <div className="modal-content scorecard-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="scorecard-modal-header">
              <div className="scorecard-header-title">
                <Table size={26} strokeWidth={2.8} className="scorecard-table-icon" />
                <div>
                  <span className="ribbon-banner">MIDNIGHT ALLEY • TOURNAMENT RECORD</span>
                  <h3 className="woodcut-title scorecard-title">TOURNAMENT SCORE SHEET</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScorecardModal(false)}
                className="btn-cel btn-icon-sq btn-brawl-neutral close-scorecard-btn"
                title="Close score sheet"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <p className="scorecard-subtitle">
              Each round column displays the player&apos;s <strong>total score</strong> followed by the round&apos;s <strong>balance</strong> in parentheses (<span className="score-pos-sample">+pts</span> / <span className="score-neg-sample">-pts</span>).
            </p>

            <div className="scorecard-table-scroll">
              <table className="scorecard-sheet-table">
                <thead>
                  <tr>
                    <th className="th-contender">CONTENDER</th>
                    {Array.from({ length: TOTAL_ROUNDS }).map((_, idx) => (
                      <th
                        key={idx + 1}
                        className={`th-round ${round === idx + 1 ? 'th-current-round' : ''}`}
                      >
                        R{idx + 1}
                      </th>
                    ))}
                    <th className="th-final">TOTAL SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.map((player: Player) => {
                    const isMe = player.id === currentUserPlayer.id;
                    const totalScore = match.cumulativeScores?.[player.id] || 0;

                    return (
                      <tr key={player.id} className={`scorecard-row ${isMe ? 'scorecard-row-me' : ''}`}>
                        <td className="scorecard-player-cell">
                          <AvatarIcon id={player.avatarId} size={24} />
                          <div className="player-cell-info">
                            <strong className="cell-player-name">{player.name}</strong>
                            <div className="cell-player-badges">
                              {isMe && <span className="cell-tag tag-you">YOU</span>}
                              {player.isHost && <span className="cell-tag tag-host">HOST</span>}
                              {player.isBot && <span className="cell-tag tag-bot">BOT</span>}
                            </div>
                          </div>
                        </td>

                        {Array.from({ length: TOTAL_ROUNDS }).map((_, idx) => {
                          const rNum = idx + 1;
                          const rec = roundHistory[rNum]?.[player.id];

                          if (rec) {
                            const isPos = rec.roundScore > 0;
                            const isNeg = rec.roundScore < 0;
                            const formattedDelta = isPos ? `+${rec.roundScore}` : `${rec.roundScore}`;

                            return (
                              <td key={rNum} className="scorecard-round-cell completed-round-cell">
                                <span className="cell-round-total">{rec.cumulativeScore}</span>
                                <span
                                  className={`cell-round-delta ${
                                    isPos ? 'delta-positive' : isNeg ? 'delta-negative' : 'delta-zero'
                                  }`}
                                >
                                  ({formattedDelta})
                                </span>
                              </td>
                            );
                          } else if (rNum === round && (phase as string) !== 'round_summary' && phase !== 'game_over') {
                            return (
                              <td key={rNum} className="scorecard-round-cell current-round-cell" title="Round currently in play">
                                <span className="cell-in-progress">In Play</span>
                              </td>
                            );
                          } else {
                            return (
                              <td key={rNum} className="scorecard-round-cell empty-round-cell">
                                <span className="cell-dash">—</span>
                              </td>
                            );
                          }
                        })}

                        <td className="scorecard-final-cell">
                          <strong className="final-score-val">{totalScore} PTS</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="scorecard-modal-footer">
              <button
                type="button"
                onClick={() => setShowScorecardModal(false)}
                className="btn-cel btn-brawl-primary close-footer-btn"
              >
                <span>RETURN TO TABLE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .midnight-alley-wrapper {
          width: 100%;
          user-select: none;
        }

        /* 2-Column Speakeasy Layout */
        .midnight-alley-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 14px;
          align-items: start;
        }

        /* Left Container: Dedicated Players Roster */
        .alley-roster-container {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: 12px;
          box-shadow: var(--shadow-cel-sm);
        }
        .roster-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid var(--color-ink-stroke);
          padding-bottom: 8px;
        }
        .roster-header-title {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--color-text-main);
        }
        .roster-title {
          font-size: 15px;
          letter-spacing: 0.04em;
        }
        .roster-round-pill {
          font-family: var(--font-accent);
          font-size: 9px;
          letter-spacing: 0.06em;
          background-color: var(--color-cuphead-red);
          color: #fdfbf5;
          padding: 2px 7px;
          border-radius: 999px;
          border: 1px solid var(--color-ink-stroke);
          font-weight: bold;
        }
        .roster-cards-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .roster-player-item {
          background-color: var(--color-canvas-parchment);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 8px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: transform 0.1s ease, border-color 0.1s ease, box-shadow 0.1s ease;
        }
        .roster-player-item.player-item-turn {
          border-color: #ffd043;
          box-shadow: 0 0 10px rgba(255, 208, 67, 0.5), var(--shadow-cel-sm);
          background-color: rgba(255, 208, 67, 0.12);
        }
        .roster-player-item.player-item-me {
          border-left: 4px solid var(--color-cuphead-red);
        }
        .player-item-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .player-avatar-box {
          position: relative;
          background-color: #ffd043;
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 6px;
          overflow: hidden;
          width: 30px;
          height: 30px;
          flex-shrink: 0;
        }
        .player-crown-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background-color: #ffd043;
          color: #1c1511;
          border: 1px solid #1c1511;
          border-radius: 999px;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .player-name-col {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .name-row {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .player-display-name {
          font-family: var(--font-heading);
          font-size: 13px;
          color: var(--color-text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .player-you-tag {
          font-family: var(--font-accent);
          font-size: 8px;
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
          padding: 0 4px;
          border-radius: 3px;
          border: 1px solid #1c1511;
          font-weight: bold;
        }
        .player-lead-tag {
          font-family: var(--font-accent);
          font-size: 8px;
          background-color: var(--color-cuphead-red);
          color: #fdfbf5;
          padding: 0 4px;
          border-radius: 3px;
          border: 1px solid #1c1511;
          font-weight: bold;
        }
        .turn-pulse-indicator {
          display: flex;
          align-items: center;
          gap: 3px;
          font-family: var(--font-accent);
          font-size: 9px;
          color: var(--color-cuphead-red);
          font-weight: bold;
          letter-spacing: 0.05em;
          animation: pulse 1s infinite alternate;
        }
        .player-stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1.3fr;
          gap: 4px;
        }
        .stat-pill {
          background-color: var(--color-glove-ivory);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 5px;
          padding: 3px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.1;
        }
        .stat-label {
          font-family: var(--font-accent);
          font-size: 7.5px;
          letter-spacing: 0.04em;
          color: var(--color-text-lead);
        }
        .stat-num {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--color-text-main);
        }
        .stat-bid-box .stat-num {
          color: #3e88a5;
        }
        .stat-won-box .stat-num {
          color: #1f5e1f;
        }
        .stat-total-box .stat-num {
          color: var(--color-cuphead-red);
          font-weight: 700;
        }

        /* Right Main Area */
        .alley-main-area {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .alley-info-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: 10px;
          box-shadow: var(--shadow-cel-sm);
          gap: 10px;
          flex-wrap: wrap;
        }
        .alley-trick-counter {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .trick-label {
          font-family: var(--font-accent);
          font-size: 10px;
          letter-spacing: 0.06em;
          color: var(--color-cuphead-red);
        }
        .trick-val {
          font-family: var(--font-heading);
          font-size: 16px;
          color: var(--color-text-main);
        }
        .alley-lead-suit-badge {
          display: flex;
          align-items: center;
        }
        .lead-suit-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--color-parchment-deep);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 999px;
          padding: 3px 10px;
        }
        .lead-label {
          font-family: var(--font-accent);
          font-size: 9px;
          letter-spacing: 0.06em;
          color: var(--color-cuphead-red);
        }
        .lead-name {
          font-family: var(--font-heading);
          font-size: 12px;
          color: var(--color-text-main);
        }
        .lead-free-hint {
          font-family: var(--font-body);
          font-size: 12px;
          font-style: italic;
          color: var(--color-text-muted);
        }
        .strip-scorecard-btn {
          font-size: 11px;
          padding: 5px 12px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        /* Green Felt Table */
        .speakeasy-felt-table {
          background: radial-gradient(circle at center, #1c452e 0%, #0d281a 100%);
          border: 5px solid #2b1e17;
          border-radius: 18px;
          box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.7), var(--shadow-cel-md);
          min-height: 380px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          overflow: visible;
        }
        .felt-center-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0.12;
          pointer-events: none;
        }
        .watermark-title {
          font-family: var(--font-heading);
          font-size: 32px;
          letter-spacing: 0.1em;
          color: #fdfbf5;
          margin-top: -10px;
        }

        /* Center Trick Display */
        .felt-trick-center {
          z-index: 2;
          min-height: 160px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
        }
        .empty-trick-slot {
          padding: 22px 32px;
          border: 2px dashed rgba(255, 255, 255, 0.25);
          border-radius: 14px;
        }
        .empty-trick-hint {
          font-family: var(--font-body);
          font-size: 14px;
          color: rgba(253, 251, 245, 0.75);
          font-weight: 600;
        }
        .active-trick-cards-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .played-trick-item {
          width: 90px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          position: relative;
          transition: transform 0.15s ease;
        }

        .trick-item-winning-aura .midnight-card-item {
          box-shadow: 0 0 18px rgba(255, 208, 67, 0.85), 0 0 4px rgba(255, 208, 67, 0.95), 2.5px 2.5px 0px var(--color-shadow-solid) !important;
          border-color: #ffd043 !important;
          transform: translateY(-4px) scale(1.04);
        }
        .winning-lead-tag {
          position: absolute;
          bottom: -28px;
          background-color: #ffd043;
          color: #1c1511;
          border: 1.5px solid #1c1511;
          border-radius: 999px;
          font-family: var(--font-accent);
          font-size: 8px;
          font-weight: bold;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          box-shadow: 1px 1px 0px #1c1511;
          white-space: nowrap;
          z-index: 5;
          animation: pulse-aura 1.5s infinite alternate;
        }
        @keyframes pulse-aura {
          from { box-shadow: 0 0 3px rgba(255, 208, 67, 0.4); }
          to { box-shadow: 0 0 12px rgba(255, 208, 67, 0.95); }
        }

        .played-card-meta {
          width: 100%;
          max-width: 90px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background-color: rgba(0, 0, 0, 0.7);
          padding: 2px 6px;
          border-radius: 999px;
          overflow: hidden;
        }
        .played-player-name {
          font-family: var(--font-heading);
          font-size: 10px;
          color: #fdfbf5;
          max-width: 62px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .trick-winner-banner {
          position: absolute;
          top: -54px;
          background-color: #ffd043;
          border: 2.5px solid #1c1511;
          border-radius: 999px;
          padding: 5px 18px;
          box-shadow: 3px 3px 0px #1c1511;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1c1511;
          z-index: 10;
        }
        .winner-trophy-icon {
          color: #d33833;
        }
        .winner-banner-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .winner-banner-text strong {
          font-family: var(--font-heading);
          font-size: 13px;
        }
        .winner-banner-text small {
          font-family: var(--font-body);
          font-size: 10.5px;
          font-weight: 700;
        }

        /* Player Hand Dock */
        .player-hand-dock {
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: 14px;
          padding: 10px 14px 14px;
          box-shadow: var(--shadow-cel-sm);
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: visible;
        }
        .hand-dock-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px dashed var(--color-ink-stroke);
          padding-bottom: 6px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .dock-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dock-title {
          font-family: var(--font-heading);
          font-size: 13px;
          color: var(--color-text-main);
        }
        .dock-turn-callout {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-accent);
          font-size: 11px;
          color: var(--color-cuphead-red);
          font-weight: bold;
          animation: pulse 1s infinite alternate;
        }
        .dock-turn-urgent {
          color: #d33833 !important;
          animation: pulse 0.5s infinite alternate !important;
        }

        .hand-sort-toggle {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .sort-icon {
          color: var(--color-text-lead);
        }
        .sort-hint {
          font-family: var(--font-accent);
          font-size: 9px;
          letter-spacing: 0.05em;
          color: var(--color-text-lead);
        }
        .btn-sort-btn {
          font-size: 9px;
          padding: 2px 7px;
          border-radius: 4px;
          background-color: var(--color-parchment-deep);
          color: var(--color-text-main);
        }
        .btn-sort-btn.sort-active {
          background-color: var(--color-cuphead-red);
          color: #fdfbf5;
          font-weight: bold;
        }

        .hand-cards-fan {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow-x: auto;
          overflow-y: visible;
          padding: 16px 10px 14px;
          min-height: 165px;
        }
        .hand-empty-text {
          font-family: var(--font-body);
          font-style: italic;
          color: var(--color-text-muted);
          font-size: 13px;
        }

        /* Bidding Modal */
        .bid-modal-card {
          width: 980px !important;
          max-width: 96vw !important;
          height: 690px !important;
          max-height: 94vh !important;
          padding: 24px 28px !important;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden !important;
          box-sizing: border-box;
        }
        .bid-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 2px solid var(--color-ink-stroke);
          padding-bottom: 10px;
        }
        .bid-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .bid-header-text {
          display: flex;
          flex-direction: column;
        }
        .bid-title {
          font-size: 24px;
          margin-top: 2px;
          color: var(--color-text-main);
        }
        .bid-header-right-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bid-afk-timer-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          background-color: var(--color-parchment-deep);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 999px;
          padding: 4px 10px;
          font-family: var(--font-accent);
          font-size: 11px;
          font-weight: bold;
          color: var(--color-cuphead-red);
          box-shadow: 1px 1px 0px var(--color-ink-stroke);
        }
        .bid-timer-urgent {
          background-color: var(--color-cuphead-red) !important;
          color: #fdfbf5 !important;
          animation: pulse 0.6s infinite alternate;
        }
        .bid-scorecard-quick-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          padding: 6px 12px;
          flex-shrink: 0;
        }
        .bid-hand-preview {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: rgba(28, 69, 46, 0.08);
          border: 2px dashed var(--color-ink-stroke);
          border-radius: 12px;
          padding: 10px 14px;
        }
        .preview-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bid-preview-label {
          font-family: var(--font-accent);
          font-size: 11px;
          color: var(--color-cuphead-red);
          letter-spacing: 0.06em;
          font-weight: bold;
        }
        .hand-sort-toggle-sm {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .sort-hint-sm {
          font-family: var(--font-accent);
          font-size: 9px;
          color: var(--color-text-lead);
        }
        .sort-pill-sm {
          font-family: var(--font-body);
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid var(--color-ink-stroke);
          background-color: var(--color-glove-ivory);
          cursor: pointer;
          font-weight: 600;
        }
        .sort-pill-sm.pill-on {
          background-color: var(--color-cuphead-red);
          color: #fdfbf5;
          font-weight: bold;
        }
        .preview-cards-tray {
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          padding: 6px 2px;
          min-height: 125px;
        }
        .bid-selector-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .bid-select-label {
          font-family: var(--font-heading);
          font-size: 14px;
          color: var(--color-text-main);
          letter-spacing: 0.03em;
        }
        .bid-buttons-grid {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .bid-chip-btn {
          flex: 1 1 65px;
          min-width: 62px;
          max-width: 85px;
          height: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 8px;
        }
        .bid-chip-btn.chip-selected {
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
          transform: translateY(-2px);
          box-shadow: var(--shadow-cel-md);
        }
        .chip-val {
          font-family: var(--font-heading);
          font-size: 22px;
          line-height: 1;
        }
        .chip-sub {
          font-family: var(--font-accent);
          font-size: 8px;
          letter-spacing: 0.04em;
          margin-top: 2px;
        }
        .bid-modal-footer {
          margin-top: 4px;
        }
        .confirm-bid-btn {
          width: 100%;
          font-size: 16px;
          padding: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        /* Chameleon Modal */
        .chameleon-modal-card {
          max-width: 740px !important;
          width: 95% !important;
          padding: 26px 30px !important;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-thick);
          border-radius: 16px;
          box-shadow: var(--shadow-cel-lg);
        }
        .chameleon-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 2px solid var(--color-ink-stroke);
          padding-bottom: 12px;
        }
        .chameleon-header-icon-box {
          background-color: #2d3a33;
          border: 2px solid var(--color-ink-stroke);
          border-radius: 10px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 2px 2px 0px var(--color-ink-stroke);
        }
        .chameleon-header-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .chameleon-title {
          font-size: 22px;
          color: var(--color-text-main);
          margin: 0;
        }
        .close-chameleon-btn {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chameleon-callout-banner {
          background-color: var(--color-parchment-deep);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 10px;
          padding: 10px 14px;
        }
        .chameleon-desc {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--color-text-lead);
          margin: 0;
          line-height: 1.45;
        }
        .chameleon-options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          width: 100%;
        }
        .chameleon-choice-card {
          background-color: var(--color-canvas-parchment);
          border: 2.5px solid var(--color-ink-stroke);
          border-radius: 14px;
          padding: 20px 16px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
          cursor: pointer;
          position: relative;
          box-shadow: var(--shadow-cel-sm);
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
        }
        .chameleon-choice-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-cel-md);
        }
        .choice-gangster:hover {
          border-color: #d33833;
          background-color: rgba(211, 56, 51, 0.05);
        }
        .choice-alibi:hover {
          border-color: #3e88a5;
          background-color: rgba(62, 136, 165, 0.05);
        }
        .choice-card-badge {
          position: absolute;
          top: -10px;
          padding: 2px 10px;
          border-radius: 999px;
          border: 1.5px solid var(--color-ink-stroke);
          font-family: var(--font-accent);
          font-size: 8.5px;
          font-weight: bold;
          letter-spacing: 0.06em;
          box-shadow: 1px 1px 0px var(--color-ink-stroke);
        }
        .badge-gangster {
          background-color: var(--color-cuphead-red);
          color: #fdfbf5;
        }
        .badge-alibi {
          background-color: var(--color-mugman-cyan);
          color: #1c1511;
        }
        .choice-icon-wrap {
          width: 82px;
          height: 82px;
          border-radius: 12px;
          border: 2px solid var(--color-ink-stroke);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 4px;
          box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.15);
        }
        .gangster-icon-bg {
          background-color: rgba(211, 56, 51, 0.14);
        }
        .alibi-icon-bg {
          background-color: rgba(62, 136, 165, 0.14);
        }
        .choice-card-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .choice-role-name {
          font-family: var(--font-heading);
          font-size: 21px;
          color: var(--color-text-main);
          margin: 0;
          line-height: 1.1;
        }
        .choice-role-sub {
          font-family: var(--font-accent);
          font-size: 9px;
          letter-spacing: 0.06em;
          color: var(--color-cuphead-red);
          font-weight: bold;
        }
        .choice-role-detail {
          font-family: var(--font-body);
          font-size: 12px;
          color: var(--color-text-lead);
          line-height: 1.45;
          margin: 4px 0 0;
        }
        .choice-action-btn {
          width: 100%;
          margin-top: 6px;
          padding: 10px 14px;
          font-size: 13.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .chameleon-modal-footer {
          display: flex;
          justify-content: center;
          border-top: 1.5px dashed var(--color-ink-stroke);
          padding-top: 10px;
          margin-top: 2px;
        }
        .chameleon-cancel-btn {
          font-size: 11px;
          padding: 6px 16px;
        }

        /* Summary Scoreboard Modal */
        .summary-modal-card {
          max-width: 760px !important;
          width: 95% !important;
          padding: 26px 30px !important;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .summary-modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .summary-trophy {
          color: var(--color-golden-buttercup);
        }
        .summary-table-wrap {
          border: var(--border-ink-thin);
          border-radius: 8px;
          overflow: hidden;
        }
        .summary-score-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .summary-score-table th {
          background-color: var(--color-parchment-deep);
          font-family: var(--font-accent);
          font-size: 11px;
          letter-spacing: 0.06em;
          padding: 10px 12px;
          border-bottom: 2px solid var(--color-ink-stroke);
          color: var(--color-text-main);
          text-align: center;
        }
        .summary-score-table td {
          padding: 11px 12px;
          border-bottom: 1px solid var(--color-ink-stroke);
          text-align: center;
          font-family: var(--font-mono);
          color: var(--color-text-main);
        }
        .summary-score-table tr.row-is-me {
          background-color: rgba(246, 196, 69, 0.15);
        }
        .contender-name-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-heading) !important;
          text-align: left !important;
        }
        .pts-positive {
          color: #1f5e1f;
          font-weight: 700;
        }
        .pts-negative {
          color: var(--color-cuphead-red);
          font-weight: 700;
        }
        .pts-bonus {
          color: var(--color-golden-buttercup);
          font-weight: 700;
        }
        .pts-round-total strong {
          font-size: 15px;
        }
        .pts-cumulative strong {
          font-size: 16px;
          color: var(--color-cuphead-red);
        }
        .summary-modal-footer {
          display: flex;
          gap: 12px;
          width: 100%;
        }
        .view-scorecard-btn {
          flex: 1;
          font-size: 14px;
          padding: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .proceed-btn {
          flex: 1.2;
          font-size: 15px;
          padding: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        /* Tournament Scorecard Modal */
        .scorecard-modal-card {
          max-width: 1100px !important;
          width: 98% !important;
          padding: 26px 30px !important;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }
        .scorecard-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid var(--color-ink-stroke);
          padding-bottom: 12px;
        }
        .scorecard-header-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .scorecard-table-icon {
          color: var(--color-cuphead-red);
        }
        .scorecard-title {
          font-size: 26px;
          margin-top: 2px;
        }
        .close-scorecard-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scorecard-subtitle {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--color-text-lead);
          margin: 0;
        }
        .score-pos-sample {
          color: #1f5e1f;
          font-weight: bold;
        }
        .score-neg-sample {
          color: var(--color-cuphead-red);
          font-weight: bold;
        }
        .scorecard-table-scroll {
          overflow-x: auto;
          border: var(--border-ink-standard);
          border-radius: 10px;
          box-shadow: var(--shadow-cel-sm);
          background-color: var(--color-glove-ivory);
        }
        .scorecard-sheet-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-body);
          min-width: 860px;
        }
        .scorecard-sheet-table th {
          background-color: var(--color-parchment-deep);
          border-bottom: 2px solid var(--color-ink-stroke);
          border-right: 1px solid var(--color-ink-stroke);
          padding: 11px 8px;
          text-align: center;
          font-family: var(--font-accent);
          font-size: 11px;
          letter-spacing: 0.05em;
          color: var(--color-text-main);
        }
        .th-contender {
          text-align: left !important;
          padding-left: 14px !important;
          width: 200px;
        }
        .th-round {
          min-width: 60px;
        }
        .th-current-round {
          background-color: var(--color-golden-buttercup) !important;
          color: #1c1511 !important;
          font-weight: bold;
        }
        .th-final {
          background-color: var(--color-golden-buttercup) !important;
          color: #1c1511 !important;
          font-weight: bold;
          width: 120px;
          border-right: none !important;
        }
        .scorecard-row {
          border-bottom: 1.5px solid var(--color-ink-stroke);
          transition: background-color 0.1s ease;
        }
        .scorecard-row:hover {
          background-color: rgba(0, 0, 0, 0.03);
        }
        .scorecard-row-me {
          background-color: rgba(255, 208, 67, 0.16) !important;
        }
        .scorecard-player-cell {
          padding: 10px 12px;
          border-right: 1px solid var(--color-ink-stroke);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .player-cell-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cell-player-name {
          font-family: var(--font-heading);
          font-size: 13px;
          color: var(--color-text-main);
        }
        .cell-player-badges {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cell-tag {
          font-family: var(--font-accent);
          font-size: 8px;
          padding: 0 4px;
          border-radius: 3px;
          border: 1px solid #1c1511;
          font-weight: bold;
        }
        .tag-you {
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
        }
        .tag-host {
          background-color: var(--color-cuphead-red);
          color: #fdfbf5;
        }
        .tag-bot {
          background-color: var(--color-parchment-deep);
          color: var(--color-text-main);
        }
        .scorecard-round-cell {
          padding: 8px 4px;
          border-right: 1px solid var(--color-ink-stroke);
          text-align: center;
          font-family: var(--font-mono);
          font-size: 12px;
          white-space: nowrap;
        }
        .cell-round-total {
          font-weight: bold;
          color: var(--color-text-main);
        }
        .cell-round-delta {
          font-size: 10px;
          margin-left: 3px;
        }
        .delta-positive {
          color: #1f5e1f;
        }
        .delta-negative {
          color: var(--color-cuphead-red);
        }
        .delta-zero {
          color: var(--color-text-muted);
        }
        .cell-in-progress {
          font-family: var(--font-accent);
          font-size: 9px;
          color: var(--color-golden-buttercup);
          background-color: rgba(28, 21, 17, 0.85);
          padding: 2px 5px;
          border-radius: 4px;
        }
        .cell-dash {
          color: var(--color-text-muted);
        }
        .scorecard-final-cell {
          padding: 8px 12px;
          text-align: center;
          font-family: var(--font-mono);
        }
        .final-score-val {
          font-size: 15px;
          color: var(--color-cuphead-red);
        }
        .scorecard-modal-footer {
          display: flex;
          justify-content: flex-end;
          border-top: 1.5px solid var(--color-ink-stroke);
          padding-top: 12px;
        }
        .close-footer-btn {
          font-size: 13px;
          padding: 8px 18px;
        }
      `}</style>
    </div>
  );
};
