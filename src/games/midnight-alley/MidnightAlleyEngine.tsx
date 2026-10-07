import React, { useState, useEffect, useRef } from 'react';
import { Player, AFK_CONFIG, BaseGameEngineProps } from '../../types';
import {
  MidnightCard,
  MidnightPhase,
  PlayedTrickCard,
  TrickResult,
  RoundScoreBreakdown,
  PlayerRoundRecord,
} from './types';
import {
  dealRoundHands,
  isCardPlayable,
  evaluateTrickWinner,
  calculateRoundScores,
  calculateBotBid,
  chooseBotPlay,
  getEstablishedLeadSuit,
} from './midnightAlleyLogic';
import { MidnightCardView, SuitIcon, BossIcon, FemmeFataleIcon, GangsterIcon, ChameleonIcon, AlibiIcon } from './MidnightCards';
import { AvatarIcon } from '../../utils/avatars';
import { soundstage } from '../../utils/audio';
import { Trophy, Play, CheckCircle2, ShieldCheck, Users, Crown, Sparkles, ArrowUpDown, Table, X, Clock, Swords } from 'lucide-react';

interface MidnightAlleyEngineProps extends BaseGameEngineProps {
  currentUserPlayer: Player;
  players: Player[];
  onPlayerScore: (playerId: string, addedScore: number) => void;
  onActionNotification: (text: string) => void;
  onLeaveMatch?: () => void;
}

const TOTAL_ROUNDS = 10; // Standard 10-round tournament (1 to 10 cards)

export const MidnightAlleyEngine: React.FC<MidnightAlleyEngineProps> = ({
  currentUserPlayer,
  players,
  onPlayerScore,
  onActionNotification,
  onLeaveMatch,
}) => {
  // Ensure at least 2 players exist
  const activePlayers = players && players.length >= 2 ? players : [
    currentUserPlayer,
    { id: 'bot-vinny', name: 'Vinny The Skull', avatarId: 'shark', isHost: false, isReady: true, score: 0, isBot: true },
    { id: 'bot-clara', name: 'Clara Night', avatarId: 'illusionist', isHost: false, isReady: true, score: 0, isBot: true },
  ];

  const playerIds = activePlayers.map((p) => p.id);

  // Game Engine State
  const [round, setRound] = useState(1);
  const [trickNumber, setTrickNumber] = useState(1); // 1 to round
  const [phase, setPhase] = useState<MidnightPhase>('bidding');
  const [hands, setHands] = useState<Record<string, MidnightCard[]>>({});
  const [bids, setBids] = useState<Record<string, number | null>>({});
  const [tricksWon, setTricksWon] = useState<Record<string, number>>({});
  const [roundBonuses, setRoundBonuses] = useState<Record<string, number>>({});
  const [cumulativeScores, setCumulativeScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    activePlayers.forEach((p) => (init[p.id] = p.score || 0));
    return init;
  });

  // Current Trick State
  const [dealerIdx, setDealerIdx] = useState(0);
  const [leadPlayerIdx, setLeadPlayerIdx] = useState(0);
  const [turnIdx, setTurnIdx] = useState(0);
  const [currentTrick, setCurrentTrick] = useState<PlayedTrickCard[]>([]);
  const [lastTrickResult, setLastTrickResult] = useState<TrickResult | null>(null);
  const [roundSummaryScores, setRoundSummaryScores] = useState<Record<string, RoundScoreBreakdown> | null>(null);

  // Sorting Mode for Human Player's Hand: 'suit' or 'value'
  const [handSortMode, setHandSortMode] = useState<'suit' | 'value'>('suit');

  // UI Modals
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [roundHistory, setRoundHistory] = useState<Record<number, Record<string, PlayerRoundRecord>>>({});
  const [chameleonCardToPlay, setChameleonCardToPlay] = useState<MidnightCard | null>(null);
  const [pendingBid, setPendingBid] = useState<number>(0);

  // Anti-AFK Timers (All 45s per AFK_CONFIG)
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(AFK_CONFIG.TURN_TIMEOUT_SEC);
  const [bidTimeLeft, setBidTimeLeft] = useState<number>(AFK_CONFIG.BID_TIMEOUT_SEC);
  const [rematchTimeLeft, setRematchTimeLeft] = useState<number>(AFK_CONFIG.REMATCH_TIMEOUT_SEC);

  // Guard refs to prevent duplicate AFK executions in React lifecycle/StrictMode
  const isAutoPlayingRef = useRef(false);
  const isAutoBiddingRef = useRef(false);
  const isLeavingMatchRef = useRef(false);

  // Refs to prevent stale closures during asynchronous timeouts
  const isBotThinking = useRef(false);
  const handsRef = useRef(hands);
  handsRef.current = hands;
  const trickNumberRef = useRef(trickNumber);
  trickNumberRef.current = trickNumber;
  const roundRef = useRef(round);
  roundRef.current = round;
  const tricksWonRef = useRef(tricksWon);
  tricksWonRef.current = tricksWon;
  const bidsRef = useRef(bids);
  bidsRef.current = bids;
  const roundBonusesRef = useRef(roundBonuses);
  roundBonusesRef.current = roundBonuses;
  const cumulativeScoresRef = useRef(cumulativeScores);
  cumulativeScoresRef.current = cumulativeScores;
  const currentTrickRef = useRef(currentTrick);
  currentTrickRef.current = currentTrick;
  const pendingBidRef = useRef(pendingBid);
  pendingBidRef.current = pendingBid;

  // Listen for global custom event dispatched from top HUD RULES button
  useEffect(() => {
    const handleOpenRules = () => {
      setShowRulesModal(true);
    };
    window.addEventListener('open-midnight-rules', handleOpenRules);
    return () => {
      window.removeEventListener('open-midnight-rules', handleOpenRules);
    };
  }, []);

  // Initialize or Deal a Round
  const startRound = (roundNum: number, nextLeadIdx: number) => {
    const dealt = dealRoundHands(playerIds, roundNum);
    setHands(dealt.hands);
    handsRef.current = dealt.hands;

    const initialBids: Record<string, number | null> = {};
    const initialWon: Record<string, number> = {};
    const initialBonuses: Record<string, number> = {};
    playerIds.forEach((id) => {
      initialBids[id] = null;
      initialWon[id] = 0;
      initialBonuses[id] = 0;
    });

    if (roundNum === 1) {
      setRoundHistory({});
    }

    setRound(roundNum);
    roundRef.current = roundNum;
    setTrickNumber(1);
    trickNumberRef.current = 1;
    setBids(initialBids);
    setTricksWon(initialWon);
    setRoundBonuses(initialBonuses);
    setCurrentTrick([]);
    currentTrickRef.current = [];
    setLastTrickResult(null);
    setRoundSummaryScores(null);
    setLeadPlayerIdx(nextLeadIdx);
    setTurnIdx(nextLeadIdx);
    setPendingBid(0);
    pendingBidRef.current = 0;
    setTurnTimeLeft(AFK_CONFIG.TURN_TIMEOUT_SEC);
    setBidTimeLeft(AFK_CONFIG.BID_TIMEOUT_SEC);
    isAutoBiddingRef.current = false;
    isAutoPlayingRef.current = false;
    setPhase('bidding');

    soundstage.playRoundBell();
    onActionNotification(`Round ${roundNum} dealt! Place your Racket Bids!`);
  };

  // Start Game on Mount
  useEffect(() => {
    startRound(1, 0);
  }, []);

  // Handle Human Bid Confirmation
  const handleConfirmBid = (selectedBid: number) => {
    isAutoBiddingRef.current = true;
    soundstage.playTap();
    const updatedBids: Record<string, number> = {};

    // Record human bid
    updatedBids[currentUserPlayer.id] = selectedBid;

    // Calculate bot bids
    activePlayers.forEach((p) => {
      if (p.id !== currentUserPlayer.id) {
        const botHand = handsRef.current[p.id] || [];
        const botBid = calculateBotBid(botHand, round);
        updatedBids[p.id] = botBid;
      }
    });

    setBids(updatedBids);
    bidsRef.current = updatedBids;
    setPhase('playing');
    setTurnIdx(leadPlayerIdx);
    setTurnTimeLeft(AFK_CONFIG.TURN_TIMEOUT_SEC);
    isAutoPlayingRef.current = false;

    const bidDesc = selectedBid === 0 ? 'Daring 0 Tricks!' : `${selectedBid} Trick(s)`;
    onActionNotification(`${currentUserPlayer.name} bid ${bidDesc}! Round ${round} battle begins!`);
  };

  // Anti-AFK Bidding Countdown for Human Player (45 seconds)
  useEffect(() => {
    if (phase !== 'bidding') {
      setBidTimeLeft(AFK_CONFIG.BID_TIMEOUT_SEC);
      isAutoBiddingRef.current = false;
      return;
    }

    setBidTimeLeft(AFK_CONFIG.BID_TIMEOUT_SEC);
    isAutoBiddingRef.current = false;

    let timeLeft = AFK_CONFIG.BID_TIMEOUT_SEC;
    const timer = setInterval(() => {
      timeLeft -= 1;
      setBidTimeLeft(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(timer);
        if (!isAutoBiddingRef.current) {
          isAutoBiddingRef.current = true;
          const autoBid = pendingBidRef.current;
          onActionNotification(`[AFK Timer] Bidding time expired! Auto-confirmed bid of ${autoBid} trick(s) for ${currentUserPlayer.name}.`);
          handleConfirmBid(autoBid);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, round]);

  // Anti-AFK Turn Countdown for Human Player (Safe against React StrictMode duplicate execution)
  const isMyTurn = phase === 'playing' && activePlayers[turnIdx]?.id === currentUserPlayer.id;

  useEffect(() => {
    if (!isMyTurn) {
      setTurnTimeLeft(AFK_CONFIG.TURN_TIMEOUT_SEC);
      isAutoPlayingRef.current = false;
      return;
    }

    setTurnTimeLeft(AFK_CONFIG.TURN_TIMEOUT_SEC);
    isAutoPlayingRef.current = false;

    let timeLeft = AFK_CONFIG.TURN_TIMEOUT_SEC;
    const timer = setInterval(() => {
      timeLeft -= 1;
      setTurnTimeLeft(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(timer);
        if (!isAutoPlayingRef.current) {
          isAutoPlayingRef.current = true;
          handleAfkAutoPlay();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isMyTurn, turnIdx]);

  // Anti-AFK Auto Play Card Handler
  const handleAfkAutoPlay = () => {
    const myCurrentHand = handsRef.current[currentUserPlayer.id] || [];
    if (myCurrentHand.length === 0) return;

    const currentTrickCards = currentTrickRef.current;
    const playable = myCurrentHand.filter((c) => isCardPlayable(c, myCurrentHand, currentTrickCards));
    const candidates = playable.length > 0 ? playable : myCurrentHand;
    const cardToPlay = candidates[Math.floor(Math.random() * candidates.length)];

    if (!cardToPlay) return;

    const chameleonChoice = cardToPlay.role === 'chameleon' ? (Math.random() > 0.5 ? 'gangster' : 'alibi') : undefined;

    setChameleonCardToPlay(null);
    onActionNotification(`[AFK Timer] Turn expired! Auto-played ${cardToPlay.name} for ${currentUserPlayer.name}.`);
    soundstage.playSlideDown();

    playCardForPlayer(currentUserPlayer.id, currentUserPlayer.name, currentUserPlayer.avatarId, cardToPlay, chameleonChoice);
  };

  // Anti-AFK Rematch Countdown on Game Over (45 seconds)
  useEffect(() => {
    if (phase !== 'game_over') {
      setRematchTimeLeft(AFK_CONFIG.REMATCH_TIMEOUT_SEC);
      isLeavingMatchRef.current = false;
      return;
    }

    setRematchTimeLeft(AFK_CONFIG.REMATCH_TIMEOUT_SEC);
    isLeavingMatchRef.current = false;

    let timeLeft = AFK_CONFIG.REMATCH_TIMEOUT_SEC;
    const timer = setInterval(() => {
      timeLeft -= 1;
      setRematchTimeLeft(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(timer);
        if (!isLeavingMatchRef.current) {
          isLeavingMatchRef.current = true;
          onActionNotification('Match exited due to inactivity (AFK).');
          if (onLeaveMatch) {
            onLeaveMatch();
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, onLeaveMatch]);

  // Bot Turn Processor
  useEffect(() => {
    if (phase !== 'playing') return;
    if (isBotThinking.current) return;

    const currentTurnPlayer = activePlayers[turnIdx];
    if (!currentTurnPlayer) return;

    // If it's a bot player's turn, trigger bot play
    if (currentTurnPlayer.isBot || currentTurnPlayer.id !== currentUserPlayer.id) {
      isBotThinking.current = true;
      const timer = setTimeout(() => {
        executeBotTurn(currentTurnPlayer);
        isBotThinking.current = false;
      }, 950);

      return () => {
        clearTimeout(timer);
        isBotThinking.current = false;
      };
    }
  }, [phase, turnIdx, currentTrick.length]);

  const executeBotTurn = (bot: Player) => {
    const botHand = handsRef.current[bot.id] || [];
    if (botHand.length === 0) return;

    const botBid = (bidsRef.current[bot.id] as number) ?? 0;
    const botWon = tricksWonRef.current[bot.id] ?? 0;
    const play = chooseBotPlay(botHand, currentTrick, botBid, botWon);

    playCardForPlayer(bot.id, bot.name, bot.avatarId, play.card, play.chameleonChoice);
  };

  // Execute card play for any player (human or bot)
  const playCardForPlayer = (
    playerId: string,
    playerName: string,
    playerAvatarId: string,
    card: MidnightCard,
    chameleonChoice?: 'gangster' | 'alibi'
  ) => {
    soundstage.playTap();

    // Reset auto-playing guard for the next turn
    isAutoPlayingRef.current = false;

    // Remove played card from player's hand using current state
    const nextPlayerHand = (handsRef.current[playerId] || []).filter((c) => c.id !== card.id);
    const nextHands = {
      ...handsRef.current,
      [playerId]: nextPlayerHand,
    };
    setHands(nextHands);
    handsRef.current = nextHands;

    const playedItem: PlayedTrickCard = {
      playerId,
      playerName,
      playerAvatarId,
      card,
      chameleonChoice,
    };

    const updatedTrick = [...currentTrickRef.current, playedItem];
    setCurrentTrick(updatedTrick);
    currentTrickRef.current = updatedTrick;

    // If this trick is not complete yet, pass turn to next player
    if (updatedTrick.length < activePlayers.length) {
      setTurnIdx((prev) => (prev + 1) % activePlayers.length);
      setTurnTimeLeft(AFK_CONFIG.TURN_TIMEOUT_SEC);
    } else {
      // Trick Complete! Resolve winner!
      resolveTrick(updatedTrick);
    }
  };

  // Resolve Complete Trick
  const resolveTrick = (trick: PlayedTrickCard[]) => {
    const result = evaluateTrickWinner(trick);
    setLastTrickResult(result);
    setPhase('trick_resolved');

    // Update tricks won and bonuses
    const updatedWon = {
      ...tricksWonRef.current,
      [result.winnerPlayerId]: (tricksWonRef.current[result.winnerPlayerId] || 0) + 1,
    };
    setTricksWon(updatedWon);
    tricksWonRef.current = updatedWon;

    if (result.bonusPoints > 0) {
      const updatedBonuses = {
        ...roundBonusesRef.current,
        [result.winnerPlayerId]: (roundBonusesRef.current[result.winnerPlayerId] || 0) + result.bonusPoints,
      };
      setRoundBonuses(updatedBonuses);
      roundBonusesRef.current = updatedBonuses;
    }

    soundstage.playScoreTrumpet();
    const notice = result.bonusReason
      ? `${result.bonusReason}`
      : `${result.winnerPlayerName} captured trick #${trickNumberRef.current} with ${result.winningCard.name}!`;
    onActionNotification(notice);

    // Pause briefly so players can observe the trick outcome
    setTimeout(() => {
      // Deterministic round termination check:
      // Each round R has exactly R tricks.
      if (trickNumberRef.current >= roundRef.current) {
        // Round Finished! Calculate scores!
        endRound();
      } else {
        // Advance to next trick in current round!
        const nextTrickNum = trickNumberRef.current + 1;
        setTrickNumber(nextTrickNum);
        trickNumberRef.current = nextTrickNum;

        const nextLeadIdx = activePlayers.findIndex((p) => p.id === result.winnerPlayerId);
        setCurrentTrick([]);
        currentTrickRef.current = [];
        setLastTrickResult(null);
        setLeadPlayerIdx(nextLeadIdx !== -1 ? nextLeadIdx : 0);
        setTurnIdx(nextLeadIdx !== -1 ? nextLeadIdx : 0);
        setTurnTimeLeft(AFK_CONFIG.TURN_TIMEOUT_SEC);
        isAutoPlayingRef.current = false;
        setPhase('playing');
      }
    }, 2300);
  };

  // End of Round Scoring
  const endRound = () => {
    const breakdowns = calculateRoundScores(
      playerIds,
      roundRef.current,
      bidsRef.current as Record<string, number>,
      tricksWonRef.current,
      roundBonusesRef.current,
      cumulativeScoresRef.current
    );

    setRoundSummaryScores(breakdowns);
    setPhase('round_summary');

    // Record round result in tournament scorecard history (Rounds 1 to 10)
    const currentRoundNum = roundRef.current;
    const historyEntry: Record<string, PlayerRoundRecord> = {};
    activePlayers.forEach((p) => {
      const b = breakdowns[p.id];
      historyEntry[p.id] = {
        roundScore: b.totalRoundScore,
        cumulativeScore: b.cumulativeScore,
      };
    });
    setRoundHistory((prev) => ({
      ...prev,
      [currentRoundNum]: historyEntry,
    }));

    // Update cumulative scores and report to app
    const newCumulative: Record<string, number> = {};
    activePlayers.forEach((p) => {
      const added = breakdowns[p.id].totalRoundScore;
      newCumulative[p.id] = breakdowns[p.id].cumulativeScore;
      if (added !== 0) {
        onPlayerScore(p.id, added);
      }
    });
    setCumulativeScores(newCumulative);
    cumulativeScoresRef.current = newCumulative;

    soundstage.playVictoryFanfare();
    onActionNotification(`Round ${roundRef.current} Summary: Check your Underground Scores!`);
  };

  // Proceed to Next Round or Final GameOver
  const handleProceedNextRound = () => {
    soundstage.playTap();
    if (round < TOTAL_ROUNDS) {
      const nextDealer = (dealerIdx + 1) % activePlayers.length;
      setDealerIdx(nextDealer);
      const nextLead = (nextDealer + 1) % activePlayers.length;
      startRound(round + 1, nextLead);
    } else {
      setPhase('game_over');
      soundstage.playVictoryFanfare();
    }
  };

  // Human Card Click
  const handleHumanCardClick = (card: MidnightCard) => {
    if (phase !== 'playing') return;
    const currentTurnPlayer = activePlayers[turnIdx];
    if (currentTurnPlayer.id !== currentUserPlayer.id) return;

    const myCurrentHand = hands[currentUserPlayer.id] || [];
    if (!isCardPlayable(card, myCurrentHand, currentTrick)) {
      soundstage.playSlideDown();
      return;
    }

    // If Chameleon, open role selection dialog
    if (card.role === 'chameleon') {
      soundstage.playTap();
      setChameleonCardToPlay(card);
      return;
    }

    playCardForPlayer(currentUserPlayer.id, currentUserPlayer.name, currentUserPlayer.avatarId, card);
  };

  const handleChameleonChoice = (choice: 'gangster' | 'alibi') => {
    if (!chameleonCardToPlay) return;
    const card = chameleonCardToPlay;
    setChameleonCardToPlay(null);
    playCardForPlayer(currentUserPlayer.id, currentUserPlayer.name, currentUserPlayer.avatarId, card, choice);
  };

  // Sort player's hand by Suit or Value (LOWEST TO HIGHEST / ASCENDING)
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
        // Ascending numerical order: lowest to highest
        return (a.value || 0) - (b.value || 0);
      } else {
        // Sort by value (LOWEST TO HIGHEST / ASCENDING)
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

  const establishedLead = getEstablishedLeadSuit(currentTrick);
  const myHand = hands[currentUserPlayer.id] || [];
  const sortedMyHand = sortCards(myHand, handSortMode);

  // Determine which card is currently winning the active trick
  const currentWinningPlay = currentTrick.length > 0 ? evaluateTrickWinner(currentTrick) : null;

  return (
    <div className="midnight-alley-wrapper">
      {/* 2-Column Speakeasy Layout: Left Roster Panel + Right Felt/Hand Area */}
      <div className="midnight-alley-layout">
        {/* Left Container: Dedicated Players Roster (Clean: NO Score Table or Rules buttons) */}
        <div className="cel-card alley-roster-container">
          <div className="roster-header">
            <div className="roster-header-title">
              <Users size={16} strokeWidth={2.8} />
              <span className="woodcut-title roster-title">CONTENDERS</span>
            </div>
            <span className="roster-round-pill">ROUND {round}/{TOTAL_ROUNDS}</span>
          </div>

          <div className="roster-cards-list">
            {activePlayers.map((player, pIdx) => {
              const isTurn = phase === 'playing' && turnIdx === pIdx;
              const isLead = leadPlayerIdx === pIdx;
              const isMe = player.id === currentUserPlayer.id;
              const playerBid = bids[player.id];
              const playerWon = tricksWon[player.id] || 0;
              const playerTotal = cumulativeScores[player.id] || 0;

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
                          <span>{isMe ? `${turnTimeLeft}s LEFT` : 'THEIR TURN'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats Grid: Won, Bid, Total Score (Order: Victorias -> Apuestas -> Puntos) */}
                  <div className="player-stats-row">
                    <div className="stat-pill stat-won-box" title="Tricks won this round">
                      <span className="stat-label">WON</span>
                      <strong className="stat-num">{playerWon}</strong>
                    </div>

                    <div className="stat-pill stat-bid-box" title="Tricks bid for this round">
                      <span className="stat-label">BID</span>
                      <strong className="stat-num">{playerBid !== null && playerBid !== undefined ? playerBid : '-'}</strong>
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
              <strong className="trick-val">{trickNumber} / {round}</strong>
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

          {/* Green Felt Poker Table (Uniform gap, expanded space, no text overlap) */}
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
                      : `${activePlayers[turnIdx]?.name} leads the trick`}
                  </span>
                </div>
              ) : (
                <div className="active-trick-cards-row">
                  {currentTrick.map((played, idx) => {
                    // Check if this card is currently winning the trick
                    const isCurrentlyWinning =
                      currentWinningPlay?.winnerPlayerId === played.playerId &&
                      currentWinningPlay?.winningCard.id === played.card.id;

                    return (
                      <div
                        key={idx}
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

                        {/* Golden Aura Badge for Current Leader with ample clearance */}
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

              {/* Trick Resolution Winner Overlay with ample clearance above cards */}
              {lastTrickResult && (
                <div className="trick-winner-banner animate-pop">
                  <Trophy size={18} strokeWidth={2.8} className="winner-trophy-icon" />
                  <div className="winner-banner-text">
                    <strong>{lastTrickResult.winnerPlayerName.toUpperCase()} TAKES THE TRICK!</strong>
                    {lastTrickResult.bonusReason && <small>{lastTrickResult.bonusReason}</small>}
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
                {isMyTurn && (
                  <span className={`dock-turn-callout ${turnTimeLeft <= 10 ? 'dock-turn-urgent' : ''}`}>
                    <Clock size={12} strokeWidth={3} />
                    <span>YOUR TURN! ({turnTimeLeft}s)</span>
                  </span>
                )}
              </div>

              {/* Card Sorting Toggle: By Suit / By Value (Lowest to Highest) */}
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

            {/* Hand Fan: Fits >7 cards without cutting off or overlapping awkwardly */}
            <div
              className="hand-cards-fan"
              style={{ gap: myHand.length > 7 ? '6px' : '10px' }}
            >
              {myHand.length === 0 ? (
                <span className="hand-empty-text">No cards in hand. Wrapping up round...</span>
              ) : (
                sortedMyHand.map((card) => {
                  const playable = phase === 'playing' && isMyTurn && isCardPlayable(card, myHand, currentTrick);
                  return (
                    <MidnightCardView
                      key={card.id}
                      card={card}
                      compact={myHand.length > 8}
                      isPlayable={playable}
                      isDimmed={isMyTurn && !playable}
                      onClick={() => handleHumanCardClick(card)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bidding Phase Modal (Fixed dimensions, no scroll, fits all 10 cards) */}
      {phase === 'bidding' && (
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
                  className={`bid-afk-timer-badge ${bidTimeLeft <= 10 ? 'bid-timer-urgent' : ''}`}
                  title="Anti-AFK auto-confirm timer"
                >
                  <Clock size={13} strokeWidth={2.8} />
                  <span>{bidTimeLeft}s</span>
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

              {/* Dealt Hand Cards Preview: Always visible, adaptive sizing, ZERO scrolling */}
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
                      pendingBidRef.current = idx;
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
                <span>CONFIRM BID ({pendingBid} {pendingBid === 1 ? 'TRICK' : 'TRICKS'}) • {bidTimeLeft}s</span>
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

            {/* Side-by-Side Options: Gangster vs Alibi */}
            <div className="chameleon-options-grid">
              {/* Option 1: Gangster (Enforcer) */}
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
                    Beats all numbered cards and captures <strong>Femme Fatales</strong>. If it's the first Gangster played in the trick, it takes the lead!
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

              {/* Option 2: Alibi (Strategic Escape) */}
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

      {/* Round Summary Modal (Increased size & readability) */}
      {phase === 'round_summary' && roundSummaryScores && (
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
                  {activePlayers.map((player) => {
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

      {/* Game Over Modal with 45s Anti-AFK Rematch countdown */}
      {phase === 'game_over' && (
        <div className="modal-overlay">
          <div className="modal-content victory-podium-card" onClick={(e) => e.stopPropagation()}>
            <BossIcon size={64} />
            <h2 className="woodcut-title victory-title">THE NEW UNDERWORLD KINGPIN</h2>
            <p className="victory-subtitle">10-Round Tournament Complete!</p>
            <span className="afk-rematch-pill">Auto-exit in {rematchTimeLeft}s if no rematch chosen</span>

            <div className="final-podium-list">
              {[...activePlayers]
                .sort((a, b) => (cumulativeScores[b.id] || 0) - (cumulativeScores[a.id] || 0))
                .map((p, idx) => (
                  <div key={p.id} className={`podium-rank-row ${idx === 0 ? 'rank-crown' : ''}`}>
                    <span className="rank-num">#{idx + 1}</span>
                    <AvatarIcon id={p.avatarId} size={28} />
                    <strong className="rank-name">{p.name}</strong>
                    <span className="rank-pts">{cumulativeScores[p.id] || 0} PTS</span>
                  </div>
                ))}
            </div>

            <div className="gameover-actions-group">
              <button
                type="button"
                onClick={() => {
                  soundstage.playTap();
                  setShowScorecardModal(true);
                }}
                className="btn-cel btn-brawl-secondary gameover-scorecard-btn"
              >
                <Table size={16} strokeWidth={2.8} />
                <span>VIEW FINAL SCORE TABLE</span>
              </button>
              <button
                type="button"
                onClick={() => startRound(1, 0)}
                className="btn-cel btn-brawl-primary restart-btn"
              >
                <span>PLAY ANOTHER TOURNAMENT</span>
              </button>
              {onLeaveMatch && (
                <button
                  type="button"
                  onClick={onLeaveMatch}
                  className="btn-cel btn-brawl-neutral btn-sm"
                  style={{ width: '100%', padding: '10px' }}
                >
                  <span>RETURN TO LOBBY</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tournament Scorecard Modal (Rounds 1 to 10 - Increased Size & Padding) */}
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
              Each round column displays the player's <strong>total score</strong> followed by the round's <strong>balance</strong> in parentheses (<span className="score-pos-sample">+pts</span> / <span className="score-neg-sample">-pts</span>).
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
                  {activePlayers.map((player) => {
                    const isMe = player.id === currentUserPlayer.id;
                    const totalScore = cumulativeScores[player.id] || 0;

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
                          } else if (rNum === round && phase !== 'round_summary' && phase !== 'game_over') {
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

      {/* Mafia Codex Rules Modal (Increased Size, Padding & Large Readable Fonts) */}
      {showRulesModal && (
        <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="modal-content codex-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="codex-header">
              <ShieldCheck size={32} strokeWidth={2.6} />
              <h3 className="woodcut-title codex-title">MAFIA CODEX: MIDNIGHT ALLEY RULES</h3>
            </div>

            <div className="codex-body">
              <div className="codex-section">
                <h4>1. TOURNAMENT HANDS & DEAL</h4>
                <p>
                  In Hand 1, each player receives 1 card; in Hand 2, 2 cards; scaling up each hand until Hand 10 with 10 cards.
                </p>
              </div>

              <div className="codex-section">
                <h4>2. BIDDING PHASE</h4>
                <p>
                  At the start of each hand, all players choose their bid simultaneously (from 0 up to the hand number). Bids remain hidden until everyone has placed their bid, at which point all bids are revealed and become public for the entire round.
                </p>
              </div>

              <div className="codex-section">
                <h4>3. GAME HIERARCHY</h4>
                <div className="codex-roles-grid">
                  <div className="codex-role-item role-boss">
                    <BossIcon size={44} />
                    <div>
                      <strong>THE BOSS</strong>
                      <p>Rules the city. Defeats all Gangsters, Tommy Guns, and standard suits. Loses ONLY to a Femme Fatale!</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-femme">
                    <FemmeFataleIcon size={44} />
                    <div>
                      <strong>FEMME FATALE</strong>
                      <p>Seductive and lethal. Defeats normal cards and enchants The Boss (wins the trick and grants +50 bonus). Loses to Gangsters.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-gangster">
                    <GangsterIcon size={44} />
                    <div>
                      <strong>GANGSTER</strong>
                      <p>Armed muscle. Defeats Femme Fatales, Tommy Guns, and normal suits. The first Gangster played wins the trick. Loses to The Boss.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-chameleon">
                    <ChameleonIcon size={44} />
                    <div>
                      <strong>THE CHAMELEON</strong>
                      <p>Undercover chameleon. Can shoot as a Gangster or blend into the crowd as an Alibi.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-tommy">
                    <div className="codex-suit-icon-box">
                      <SuitIcon suit="black" size={32} />
                    </div>
                    <div>
                      <strong>TOMMY GUNS (BLACK)</strong>
                      <p>The Trump Suit! Beats standard civil suits (gold, cyan, ruby). Loses to Gangsters and The Boss.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-alibi">
                    <AlibiIcon size={44} />
                    <div>
                      <strong>ALIBI</strong>
                      <p>Value 0. Loses against everything. If all players present an Alibi, the first Alibi played wins the trick.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="codex-section">
                <h4>4. FOLLOWING SUIT RULE</h4>
                <p>
                  If the first card played in a trick is numbered, you <strong>MUST</strong> follow that suit if you hold cards of that suit. Special cards (Gangsters, The Boss, Femme Fatales, Alibis, Chameleon) can <strong>ALWAYS</strong> be played at any time!
                </p>
              </div>

              <div className="codex-section">
                <h4>5. THE UNDERWORLD LEDGER (SCORING)</h4>
                <div className="codex-scoring-grid">
                  <div className="codex-score-row">
                    <span className="score-rule-badge badge-pos">EXACT BID</span>
                    <p><strong>Successful Bid (Bid &gt; 0):</strong> +20 points per trick bid + captured bonuses.</p>
                  </div>
                  <div className="codex-score-row">
                    <span className="score-rule-badge badge-neg">MISSED BID</span>
                    <p><strong>Failed Bid (Bid &gt; 0):</strong> -10 points for each trick of difference (bonuses are lost).</p>
                  </div>
                  <div className="codex-score-row">
                    <span className="score-rule-badge badge-pos">ZERO BID</span>
                    <p><strong>Successful Zero Bid (Bid = 0):</strong> +10 points &times; Hand Number.</p>
                  </div>
                  <div className="codex-score-row">
                    <span className="score-rule-badge badge-neg">FAILED ZERO</span>
                    <p><strong>Failed Zero Bid (Bid = 0):</strong> -10 points &times; Hand Number.</p>
                  </div>
                  <div className="codex-score-row score-bonuses-row">
                    <span className="score-rule-badge badge-bonus">BONUSES</span>
                    <p>
                      <strong>The Boss</strong> capturing Gangsters (+30 each) &bull;{' '}
                      <strong>Femme Fatale</strong> enchanting The Boss (+50) &bull;{' '}
                      Winning trick with a <strong>14</strong> (+10 standard suit, +20 Tommy Gun).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="codex-footer">
              <button onClick={() => setShowRulesModal(false)} className="btn-cel btn-brawl-primary">
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

        /* Green Felt Poker Table (Generous height & fixed-width items for uniform gap) */
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

        /* Subtle Golden Aura on Current Winning Card */
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

        /* Card Sorting Toggle Buttons */
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

        /* Bidding Modal: Fixed dimensions & no scroll */
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
        .bid-rules-callout {
          background-color: var(--color-parchment-deep);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 10px;
          padding: 9px 14px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .bid-lead-desc {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--color-text-main);
          font-weight: 600;
          margin: 0;
        }
        .bid-rules-bullets {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .rule-bullet-item {
          font-family: var(--font-body);
          font-size: 11.5px;
          color: var(--color-text-lead);
          background: rgba(0, 0, 0, 0.04);
          padding: 3px 8px;
          border-radius: 5px;
          border: 1px dashed var(--color-ink-stroke);
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

        /* Chameleon Modal (Aesthetic, Margins, Side-by-Side Cards) */
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
        @media (max-width: 640px) {
          .chameleon-options-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Summary Scoreboard Modal (Increased size) */
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

        /* Victory Podium Modal */
        .victory-podium-card {
          max-width: 460px;
          width: 95%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }
        .victory-title {
          font-size: 26px;
          margin-top: -4px;
        }
        .victory-subtitle {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--color-text-lead);
        }
        .afk-rematch-pill {
          font-family: var(--font-accent);
          font-size: 9.5px;
          color: var(--color-cuphead-red);
          background: rgba(211, 56, 51, 0.08);
          border: 1px dashed var(--color-cuphead-red);
          border-radius: 999px;
          padding: 3px 10px;
          font-weight: bold;
        }
        .final-podium-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 8px 0;
        }
        .podium-rank-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-standard);
          border-radius: 10px;
          padding: 8px 14px;
        }
        .podium-rank-row.rank-crown {
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
          border-width: 4px;
        }
        .rank-num {
          font-family: var(--font-heading);
          font-size: 18px;
          width: 24px;
        }
        .rank-name {
          flex: 1;
          text-align: left;
          font-family: var(--font-heading);
          font-size: 15px;
        }
        .rank-pts {
          font-family: var(--font-mono);
          font-size: 15px;
          font-weight: bold;
        }
        .gameover-actions-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          margin-top: 4px;
        }
        .gameover-scorecard-btn {
          width: 100%;
          font-size: 14px;
          padding: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
        .restart-btn {
          width: 100%;
          font-size: 16px;
          padding: 12px;
        }

        /* Tournament Scorecard Modal (Expanded Size & Padding) */
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
          min-width: 0;
        }
        .cell-player-name {
          font-family: var(--font-heading);
          font-size: 13.5px;
          color: var(--color-text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cell-player-badges {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        .cell-tag {
          font-family: var(--font-accent);
          font-size: 8px;
          padding: 1px 5px;
          border-radius: 3px;
          font-weight: bold;
          border: 1px solid #1c1511;
          line-height: 1.2;
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
          background-color: var(--color-mugman-cyan);
          color: #fdfbf5;
        }
        .scorecard-round-cell {
          padding: 10px 6px;
          text-align: center;
          border-right: 1px solid var(--color-ink-stroke);
          font-family: var(--font-mono);
          font-size: 12.5px;
        }
        .current-round-cell {
          background-color: rgba(255, 208, 67, 0.08);
        }
        .cell-round-total {
          font-weight: 700;
          color: var(--color-text-main);
          margin-right: 3px;
        }
        .cell-round-delta {
          font-size: 11px;
          font-weight: 700;
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
          color: var(--color-cuphead-red);
          font-weight: bold;
          letter-spacing: 0.04em;
          background-color: rgba(211, 56, 51, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .cell-dash {
          color: var(--color-text-muted);
          font-weight: 400;
        }
        .scorecard-final-cell {
          padding: 10px 12px;
          text-align: center;
          font-family: var(--font-mono);
          font-size: 14.5px;
          font-weight: 900;
          color: var(--color-cuphead-red);
          background-color: rgba(255, 208, 67, 0.16);
        }
        .final-score-val {
          font-size: 14.5px;
          color: var(--color-cuphead-red);
        }
        .scorecard-modal-footer {
          display: flex;
          justify-content: flex-end;
        }
        .close-footer-btn {
          width: 100%;
          font-size: 15px;
          padding: 12px;
        }

        /* Codex Rules Modal (Large Readable Typography & Spacing) */
        .codex-modal-card {
          max-width: 780px !important;
          width: 95% !important;
          max-height: 88vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 28px 32px !important;
        }
        .codex-header {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--color-cuphead-red);
          border-bottom: 2px solid var(--color-ink-stroke);
          padding-bottom: 12px;
        }
        .codex-title {
          font-size: 24px;
        }
        .codex-body {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .codex-section h4 {
          font-family: var(--font-heading);
          font-size: 16px;
          color: var(--color-text-main);
          margin-bottom: 8px;
          border-bottom: 1.5px dashed var(--color-ink-stroke);
          padding-bottom: 4px;
        }
        .codex-section p {
          font-family: var(--font-body);
          font-size: 14px !important;
          color: var(--color-text-lead);
          line-height: 1.6;
        }
        .codex-roles-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .codex-role-item {
          display: flex;
          align-items: center;
          gap: 14px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-thin);
          border-radius: 10px;
          padding: 12px 16px;
        }
        .codex-role-item strong {
          font-family: var(--font-heading);
          font-size: 15px;
          color: var(--color-text-main);
          display: block;
          margin-bottom: 3px;
        }
        .codex-role-item p {
          font-size: 13.5px !important;
          line-height: 1.45;
          margin: 0;
        }
        .codex-suit-icon-box {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #1c1511;
          border: 2px solid #ffd043;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .codex-scoring-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .codex-score-row {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-thin);
          border-radius: 8px;
          padding: 8px 12px;
        }
        .codex-score-row p {
          margin: 0 !important;
          font-size: 13.5px !important;
          line-height: 1.4 !important;
        }
        .score-rule-badge {
          font-family: var(--font-accent);
          font-size: 9px;
          font-weight: bold;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid var(--color-ink-stroke);
          white-space: nowrap;
          min-width: 90px;
          text-align: center;
        }
        .score-rule-badge.badge-pos {
          background-color: #2e7d32;
          color: #fdfbf5;
        }
        .score-rule-badge.badge-neg {
          background-color: var(--color-cuphead-red);
          color: #fdfbf5;
        }
        .score-rule-badge.badge-bonus {
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
        }
        .score-bonuses-row {
          background-color: rgba(255, 208, 67, 0.12);
          border-color: #ffd043;
        }
        .codex-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 680px) {
          .midnight-alley-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Animations */
        @keyframes pulse {
          from { opacity: 0.7; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1.02); }
        }
        .animate-card-drop {
          animation: cardDrop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes cardDrop {
          from { transform: translateY(-30px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-pop {
          animation: popUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popUp {
          from { transform: scale(0.7); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
