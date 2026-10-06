import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../../types';
import {
  MidnightCard,
  MidnightPhase,
  PlayedTrickCard,
  TrickResult,
  RoundScoreBreakdown,
} from '../../types/midnightAlley';
import {
  dealRoundHands,
  isCardPlayable,
  evaluateTrickWinner,
  calculateRoundScores,
  calculateBotBid,
  chooseBotPlay,
  getEstablishedLeadSuit,
} from '../../utils/midnightAlleyLogic';
import { MidnightCardView, SuitIcon, BossIcon, FemmeFataleIcon, GangsterIcon, ChameleonIcon, AlibiIcon } from './MidnightCards';
import { AvatarIcon } from '../../utils/avatars';
import { soundstage } from '../../utils/audio';
import { HelpCircle, Trophy, Play, CheckCircle2, ShieldCheck } from 'lucide-react';

interface MidnightAlleyEngineProps {
  currentUserPlayer: Player;
  players: Player[];
  onPlayerScore: (playerId: string, addedScore: number) => void;
  onActionNotification: (text: string) => void;
}

const TOTAL_ROUNDS = 5; // Standard 5-round quick tournament (1, 2, 3, 4, 5 cards)

export const MidnightAlleyEngine: React.FC<MidnightAlleyEngineProps> = ({
  currentUserPlayer,
  players,
  onPlayerScore,
  onActionNotification,
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

  // UI Modals
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [chameleonCardToPlay, setChameleonCardToPlay] = useState<MidnightCard | null>(null);
  const [pendingBid, setPendingBid] = useState<number>(0);

  // Bot Turn Automation Guard
  const isBotThinking = useRef(false);

  // Initialize or Deal a Round
  const startRound = (roundNum: number, nextLeadIdx: number) => {
    const dealt = dealRoundHands(playerIds, roundNum);
    setHands(dealt.hands);

    const initialBids: Record<string, number | null> = {};
    const initialWon: Record<string, number> = {};
    const initialBonuses: Record<string, number> = {};
    playerIds.forEach((id) => {
      initialBids[id] = null;
      initialWon[id] = 0;
      initialBonuses[id] = 0;
    });

    setRound(roundNum);
    setBids(initialBids);
    setTricksWon(initialWon);
    setRoundBonuses(initialBonuses);
    setCurrentTrick([]);
    setLastTrickResult(null);
    setRoundSummaryScores(null);
    setLeadPlayerIdx(nextLeadIdx);
    setTurnIdx(nextLeadIdx);
    setPendingBid(0);
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
    soundstage.playTap();
    const updatedBids: Record<string, number> = {};

    // Record human bid
    updatedBids[currentUserPlayer.id] = selectedBid;

    // Calculate bot bids
    activePlayers.forEach((p) => {
      if (p.id !== currentUserPlayer.id) {
        const botHand = hands[p.id] || [];
        const botBid = calculateBotBid(botHand, round);
        updatedBids[p.id] = botBid;
      }
    });

    setBids(updatedBids);
    setPhase('playing');
    setTurnIdx(leadPlayerIdx);

    const bidDesc = selectedBid === 0 ? 'Daring 0 Tricks!' : `${selectedBid} Trick(s)`;
    onActionNotification(`${currentUserPlayer.name} bid ${bidDesc}! Round ${round} battle begins!`);
  };

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
    const botHand = hands[bot.id] || [];
    if (botHand.length === 0) return;

    const botBid = bids[bot.id] ?? 0;
    const botWon = tricksWon[bot.id] ?? 0;
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

    // Remove played card from player's hand
    setHands((prev) => ({
      ...prev,
      [playerId]: prev[playerId].filter((c) => c.id !== card.id),
    }));

    const playedItem: PlayedTrickCard = {
      playerId,
      playerName,
      playerAvatarId,
      card,
      chameleonChoice,
    };

    const updatedTrick = [...currentTrick, playedItem];
    setCurrentTrick(updatedTrick);

    // If this trick is not complete yet, pass turn to next player
    if (updatedTrick.length < activePlayers.length) {
      setTurnIdx((prev) => (prev + 1) % activePlayers.length);
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
    setTricksWon((prev) => ({
      ...prev,
      [result.winnerPlayerId]: (prev[result.winnerPlayerId] || 0) + 1,
    }));

    if (result.bonusPoints > 0) {
      setRoundBonuses((prev) => ({
        ...prev,
        [result.winnerPlayerId]: (prev[result.winnerPlayerId] || 0) + result.bonusPoints,
      }));
    }

    soundstage.playScoreTrumpet();
    const notice = result.bonusReason
      ? `💥 ${result.bonusReason}`
      : `${result.winnerPlayerName} captured the trick with ${result.winningCard.name}!`;
    onActionNotification(notice);

    // Pause briefly so players can observe the trick outcome
    setTimeout(() => {
      // Check if round is over (hands are empty)
      const anyRemainingHand = Object.values(hands).some((h) => h.length > 0);

      if (!anyRemainingHand) {
        // Round Finished! Calculate scores!
        endRound();
      } else {
        // Next Trick! Winner of this trick leads!
        const nextLeadIdx = activePlayers.findIndex((p) => p.id === result.winnerPlayerId);
        setCurrentTrick([]);
        setLastTrickResult(null);
        setLeadPlayerIdx(nextLeadIdx !== -1 ? nextLeadIdx : 0);
        setTurnIdx(nextLeadIdx !== -1 ? nextLeadIdx : 0);
        setPhase('playing');
      }
    }, 2400);
  };

  // End of Round Scoring
  const endRound = () => {
    const breakdowns = calculateRoundScores(
      playerIds,
      round,
      bids as Record<string, number>,
      tricksWon,
      roundBonuses,
      cumulativeScores
    );

    setRoundSummaryScores(breakdowns);
    setPhase('round_summary');

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

    soundstage.playVictoryFanfare();
    onActionNotification(`Round ${round} Summary: Check your Underground Scores!`);
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

    const myHand = hands[currentUserPlayer.id] || [];
    if (!isCardPlayable(card, myHand, currentTrick)) {
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

  const establishedLead = getEstablishedLeadSuit(currentTrick);
  const myHand = hands[currentUserPlayer.id] || [];
  const isMyTurn = phase === 'playing' && activePlayers[turnIdx]?.id === currentUserPlayer.id;

  return (
    <div className="midnight-alley-container">
      {/* Table Header Bar */}
      <div className="alley-top-strip">
        <div className="alley-round-badge">
          <span className="round-badge-lead">BOUT ROUND</span>
          <strong className="round-badge-num">{round} / {TOTAL_ROUNDS}</strong>
        </div>

        <div className="alley-lead-suit-indicator">
          {establishedLead ? (
            <div className="lead-suit-pill">
              <span className="lead-label">ESTABLISHED SUIT:</span>
              <SuitIcon suit={establishedLead} size={18} />
              <strong className="lead-name">
                {establishedLead === 'black' ? 'MIDNIGHT TRUMP' : establishedLead.toUpperCase()}
              </strong>
            </div>
          ) : (
            <span className="lead-free-hint">No lead suit yet (Free lead)</span>
          )}
        </div>

        <button
          onClick={() => setShowRulesModal(true)}
          className="btn-cel btn-brawl-neutral btn-sm alley-rules-btn"
          title="View Mafia skeleton roles hierarchy"
        >
          <HelpCircle size={15} strokeWidth={2.8} />
          <span>MAFIA CODEX</span>
        </button>
      </div>

      {/* Main Speakeasy Felt Poker Table */}
      <div className="speakeasy-felt-table">
        {/* Table Felt Background Embellishment */}
        <div className="felt-center-watermark">
          <BossIcon size={120} className="watermark-boss-svg" />
          <span className="watermark-title">MIDNIGHT ALLEY</span>
        </div>

        {/* Players Roster Ring Around Table */}
        <div className="table-players-ring">
          {activePlayers.map((player, pIdx) => {
            const isTurn = phase === 'playing' && turnIdx === pIdx;
            const isLead = leadPlayerIdx === pIdx;
            const isMe = player.id === currentUserPlayer.id;
            const playerBid = bids[player.id];
            const playerWon = tricksWon[player.id] || 0;

            return (
              <div
                key={player.id}
                className={`felt-player-seat ${isTurn ? 'seat-active-turn' : ''} ${
                  isMe ? 'seat-is-me' : ''
                }`}
              >
                <div className="seat-avatar-box">
                  <AvatarIcon id={player.avatarId} size={32} />
                  {isLead && <span className="seat-lead-tag" title="Trick Leader">LEAD</span>}
                </div>

                <div className="seat-meta">
                  <span className="seat-name">{player.name}</span>
                  <div className="seat-bid-pill">
                    {playerBid !== null && playerBid !== undefined ? (
                      <span>
                        🎯 Bid: <strong>{playerBid}</strong> | Won: <strong>{playerWon}</strong>
                      </span>
                    ) : (
                      <span className="seat-bidding-wait">Bidding...</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Trick Play Arena */}
        <div className="felt-trick-center">
          {currentTrick.length === 0 ? (
            <div className="empty-trick-slot">
              <span className="empty-trick-hint">
                {phase === 'bidding'
                  ? 'Awaiting Racket Bids...'
                  : `${activePlayers[turnIdx]?.name}'s turn to lead!`}
              </span>
            </div>
          ) : (
            <div className="active-trick-cards-row">
              {currentTrick.map((played, idx) => (
                <div key={idx} className="played-trick-item animate-card-drop">
                  <div className="played-card-meta">
                    <AvatarIcon id={played.playerAvatarId} size={18} />
                    <span className="played-player-name">{played.playerName}</span>
                  </div>
                  <MidnightCardView
                    card={played.card}
                    compact={true}
                    chameleonChoice={played.chameleonChoice}
                    isPlayable={false}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Trick Resolution Overlay */}
          {lastTrickResult && (
            <div className="trick-winner-banner animate-pop">
              <Trophy size={18} strokeWidth={2.8} className="winner-trophy-icon" />
              <div className="winner-banner-text">
                <strong>{lastTrickResult.winnerPlayerName} WINS TRICK!</strong>
                {lastTrickResult.bonusReason && <small>{lastTrickResult.bonusReason}</small>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Human Player Hand Tray */}
      <div className="player-hand-dock">
        <div className="hand-dock-header">
          <div className="dock-header-left">
            <span className="dock-title">YOUR HAND ({myHand.length} CARDS):</span>
            {isMyTurn && <span className="dock-turn-callout">⚡ YOUR TURN TO PLAY A CARD!</span>}
          </div>

          <div className="dock-bid-status">
            <span>Your Target: </span>
            <strong>
              {bids[currentUserPlayer.id] !== null && bids[currentUserPlayer.id] !== undefined
                ? `${bids[currentUserPlayer.id]} Trick(s)`
                : 'Not Set'}
            </strong>
            <span> · Won: </span>
            <strong className="status-won-count">{tricksWon[currentUserPlayer.id] || 0}</strong>
          </div>
        </div>

        <div className="hand-cards-fan">
          {myHand.length === 0 ? (
            <span className="hand-empty-text">No cards in hand. Round ending...</span>
          ) : (
            myHand.map((card) => {
              const playable = phase === 'playing' && isMyTurn && isCardPlayable(card, myHand, currentTrick);
              return (
                <MidnightCardView
                  key={card.id}
                  card={card}
                  isPlayable={playable}
                  onClick={() => handleHumanCardClick(card)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Bidding Phase Modal */}
      {phase === 'bidding' && (
        <div className="modal-overlay">
          <div className="modal-content bid-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bid-modal-header">
              <BossIcon size={44} />
              <div className="bid-header-text">
                <span className="ribbon-banner">ROUND {round} OF {TOTAL_ROUNDS}</span>
                <h3 className="woodcut-title bid-title">PLACE YOUR RACKET BID</h3>
              </div>
            </div>

            <p className="bid-lead-desc">
              How many tricks will you conquer this round? Exact predictions score <strong>+20 PTS</strong> per trick.
              Bidding <strong>0</strong> scores <strong>+{round * 10} PTS</strong> if you win zero tricks, but penalizes <strong>-{round * 10} PTS</strong> if you win any!
            </p>

            <div className="bid-hand-preview">
              <span className="bid-preview-label">CARDS IN YOUR HAND:</span>
              <div className="preview-cards-row">
                {myHand.map((c) => (
                  <MidnightCardView key={c.id} card={c} compact={true} isPlayable={false} />
                ))}
              </div>
            </div>

            <div className="bid-selector-group">
              <span className="bid-select-label">SELECT NUMBER OF TRICKS TO BID:</span>
              <div className="bid-buttons-row">
                {Array.from({ length: round + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPendingBid(idx)}
                    className={`btn-cel bid-chip-btn ${pendingBid === idx ? 'chip-selected' : ''}`}
                  >
                    <span className="chip-val">{idx}</span>
                    <span className="chip-sub">{idx === 0 ? 'ZERO BID' : 'TRICKS'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bid-modal-footer">
              <button onClick={() => handleConfirmBid(pendingBid)} className="btn-cel btn-brawl-primary confirm-bid-btn">
                <CheckCircle2 size={18} strokeWidth={2.8} />
                <span>CONFIRM BID ({pendingBid} TRICKS)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chameleon Choice Modal */}
      {chameleonCardToPlay && (
        <div className="modal-overlay">
          <div className="modal-content chameleon-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="chameleon-modal-header">
              <ChameleonIcon size={52} />
              <h3 className="woodcut-title">HOW WILL THE CHAMELEON STRIKE?</h3>
            </div>

            <p className="chameleon-desc">
              The Chameleon can disguise themselves as a ruthless mob enforcer or blend into the crowd with an ironclad alibi:
            </p>

            <div className="chameleon-options-grid">
              <button
                onClick={() => handleChameleonChoice('gangster')}
                className="btn-cel btn-brawl-primary chameleon-choice-btn choice-gangster"
              >
                <GangsterIcon size={40} />
                <div className="choice-text">
                  <strong>AS A GANGSTER</strong>
                  <span>Beats all numbered cards and Femme Fatale. First Gangster wins!</span>
                </div>
              </button>

              <button
                onClick={() => handleChameleonChoice('alibi')}
                className="btn-cel btn-brawl-neutral chameleon-choice-btn choice-alibi"
              >
                <AlibiIcon size={40} />
                <div className="choice-text">
                  <strong>AS AN ALIBI</strong>
                  <span>Escape the heat! Always loses the trick to duck unwanted points.</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round Summary Modal */}
      {phase === 'round_summary' && roundSummaryScores && (
        <div className="modal-overlay">
          <div className="modal-content summary-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <Trophy size={36} strokeWidth={2.8} className="summary-trophy" />
              <h3 className="woodcut-title">ROUND {round} SCOREBOARD</h3>
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
                          <AvatarIcon id={player.avatarId} size={20} />
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
              <button onClick={handleProceedNextRound} className="btn-cel btn-brawl-primary proceed-btn">
                <Play size={16} strokeWidth={3} />
                <span>{round < TOTAL_ROUNDS ? `PROCEED TO ROUND ${round + 1}` : 'FINISH TOURNAMENT'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {phase === 'game_over' && (
        <div className="modal-overlay">
          <div className="modal-content victory-podium-card" onClick={(e) => e.stopPropagation()}>
            <BossIcon size={64} />
            <h2 className="woodcut-title victory-title">THE NEW UNDERWORLD KINGPIN</h2>
            <p className="victory-subtitle">Tournament Completed across all 5 Rounds!</p>

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

            <button onClick={() => startRound(1, 0)} className="btn-cel btn-brawl-primary restart-btn">
              <span>PLAY ANOTHER TOURNAMENT</span>
            </button>
          </div>
        </div>
      )}

      {/* Mafia Codex Rules Modal */}
      {showRulesModal && (
        <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="modal-content codex-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="codex-header">
              <ShieldCheck size={28} strokeWidth={2.5} />
              <h3 className="woodcut-title codex-title">MAFIA CODEX: MIDNIGHT ALLEY RULES</h3>
            </div>

            <div className="codex-body">
              <div className="codex-section">
                <h4>1. SKULL KING SPECIAL ROLES HIERARCHY</h4>
                <div className="codex-roles-grid">
                  <div className="codex-role-item role-boss">
                    <BossIcon size={36} />
                    <div>
                      <strong>THE BOSS (Skull King)</strong>
                      <p>Beats all numbered cards and Gangsters (+30 PTS per Gangster captured). Loses ONLY to Femme Fatale!</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-femme">
                    <FemmeFataleIcon size={36} />
                    <div>
                      <strong>FEMME FATALE (Mermaid)</strong>
                      <p>Beats all numbered cards. Captivates The Boss (+50 PTS if she captures him)! Loses to Gangsters.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-gangster">
                    <GangsterIcon size={36} />
                    <div>
                      <strong>GANGSTERS (Pirates)</strong>
                      <p>Beats Femme Fatales and all numbered cards. First Gangster played takes trick. Loses to The Boss.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-chameleon">
                    <ChameleonIcon size={36} />
                    <div>
                      <strong>THE CHAMELEON (Tigress)</strong>
                      <p>Undercover agent! You decide when playing: strike as a GANGSTER or escape with an ALIBI.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-alibi">
                    <AlibiIcon size={36} />
                    <div>
                      <strong>ALIBI (White Flag)</strong>
                      <p>Pleads innocent! Always loses the trick, allowing you to duck unwanted tricks.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="codex-section">
                <h4>2. TRUMP & SUITS</h4>
                <p>
                  <strong>Midnight Syndicate (Black)</strong> is the Trump suit and beats all standard suits (Gold, Cyan, Ruby).
                  Number 14 cards carry bonuses (+20 for Black 14, +10 for Standard 14) if the trick is captured.
                </p>
              </div>

              <div className="codex-section">
                <h4>3. BIDDING & SCORING</h4>
                <p>
                  Exact Bid: <strong>+20 PTS per trick won</strong> + bonuses.<br />
                  Missed Bid: <strong>-10 PTS per trick difference</strong> (no bonuses).<br />
                  Zero Bid: <strong>+{round * 10} PTS</strong> if won 0 tricks, or <strong>-{round * 10} PTS</strong> if you capture any!
                </p>
              </div>
            </div>

            <div className="codex-footer">
              <button onClick={() => setShowRulesModal(false)} className="btn-cel btn-brawl-primary">
                <span>GOT IT, BACK TO THE TABLE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .midnight-alley-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          user-select: none;
        }

        /* Top strip */
        .alley-top-strip {
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
        .alley-round-badge {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .round-badge-lead {
          font-family: var(--font-accent);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--color-cuphead-red);
        }
        .round-badge-num {
          font-family: var(--font-heading);
          font-size: 16px;
          color: var(--color-text-main);
        }
        .alley-lead-suit-indicator {
          flex: 1;
          display: flex;
          justify-content: center;
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
        .alley-rules-btn {
          font-size: 11px;
        }

        /* Green Felt Poker Table */
        .speakeasy-felt-table {
          background: radial-gradient(circle at center, #1c452e 0%, #0d281a 100%);
          border: 5px solid #2b1e17;
          border-radius: 18px;
          box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.6), var(--shadow-cel-md);
          min-height: 340px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 16px 14px;
          overflow: hidden;
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
          font-size: 26px;
          letter-spacing: 0.1em;
          color: #fdfbf5;
          margin-top: -10px;
        }

        /* Player Seats Ring */
        .table-players-ring {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-around;
          gap: 10px;
          z-index: 2;
          flex-wrap: wrap;
        }
        .felt-player-seat {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: rgba(28, 21, 17, 0.85);
          border: 2px solid #524366;
          border-radius: 10px;
          padding: 4px 10px;
          box-shadow: 2px 2px 0px #0d0a13;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .felt-player-seat.seat-active-turn {
          border-color: #ffd043;
          box-shadow: 0 0 12px rgba(255, 208, 67, 0.6), 2px 2px 0px #0d0a13;
          transform: scale(1.05);
        }
        .felt-player-seat.seat-is-me {
          background-color: rgba(43, 30, 23, 0.95);
        }
        .seat-avatar-box {
          position: relative;
          background-color: #ffd043;
          border: 1.5px solid #1c1511;
          border-radius: 6px;
          overflow: hidden;
          width: 32px;
          height: 32px;
        }
        .seat-lead-tag {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: #d33833;
          color: #fdfbf5;
          font-family: var(--font-accent);
          font-size: 7px;
          text-align: center;
          font-weight: bold;
        }
        .seat-meta {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .seat-name {
          font-family: var(--font-heading);
          font-size: 12px;
          color: #fdfbf5;
        }
        .seat-bid-pill {
          font-family: var(--font-mono);
          font-size: 10px;
          color: #ffd043;
        }
        .seat-bidding-wait {
          color: #a396af;
          font-style: italic;
        }

        /* Center Trick Playing Area */
        .felt-trick-center {
          z-index: 2;
          min-height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
        }
        .empty-trick-slot {
          padding: 16px 24px;
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
        }
        .empty-trick-hint {
          font-family: var(--font-body);
          font-size: 14px;
          color: rgba(253, 251, 245, 0.7);
          font-weight: 600;
        }
        .active-trick-cards-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .played-trick-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .played-card-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: rgba(0, 0, 0, 0.6);
          padding: 2px 6px;
          border-radius: 999px;
        }
        .played-player-name {
          font-family: var(--font-heading);
          font-size: 10px;
          color: #fdfbf5;
        }
        .trick-winner-banner {
          position: absolute;
          top: -24px;
          background-color: #ffd043;
          border: 2.5px solid #1c1511;
          border-radius: 999px;
          padding: 4px 16px;
          box-shadow: 3px 3px 0px #1c1511;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1c1511;
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
          font-size: 12px;
        }
        .winner-banner-text small {
          font-family: var(--font-body);
          font-size: 9.5px;
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
        }
        .hand-dock-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px dashed var(--color-ink-stroke);
          padding-bottom: 6px;
          flex-wrap: wrap;
          gap: 6px;
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
          font-family: var(--font-accent);
          font-size: 11px;
          color: var(--color-cuphead-red);
          font-weight: bold;
          animation: pulse 1s infinite alternate;
        }
        .dock-bid-status {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--color-text-main);
        }
        .status-won-count {
          color: var(--color-cuphead-red);
          font-size: 14px;
        }
        .hand-cards-fan {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          overflow-x: auto;
          padding: 8px 4px;
          min-height: 140px;
        }
        .hand-empty-text {
          font-family: var(--font-body);
          font-style: italic;
          color: var(--color-text-muted);
          font-size: 13px;
        }

        /* Bidding Modal */
        .bid-modal-card {
          max-width: 540px;
          width: 95%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .bid-modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .bid-header-text {
          display: flex;
          flex-direction: column;
        }
        .bid-title {
          font-size: 22px;
          margin-top: 2px;
        }
        .bid-lead-desc {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--color-text-lead);
          line-height: 1.35;
        }
        .bid-hand-preview {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-thin);
          border-radius: 8px;
          padding: 8px 10px;
        }
        .bid-preview-label {
          font-family: var(--font-accent);
          font-size: 9.5px;
          color: var(--color-cuphead-red);
          letter-spacing: 0.06em;
        }
        .preview-cards-row {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .bid-selector-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .bid-select-label {
          font-family: var(--font-heading);
          font-size: 13px;
          color: var(--color-text-main);
        }
        .bid-buttons-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .bid-chip-btn {
          flex: 1;
          min-width: 58px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 6px 4px;
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
          letter-spacing: 0.05em;
        }
        .bid-modal-footer {
          margin-top: 4px;
        }
        .confirm-bid-btn {
          width: 100%;
          font-size: 16px;
          padding: 12px;
        }

        /* Chameleon Modal */
        .chameleon-modal-card {
          max-width: 480px;
          width: 95%;
          display: flex;
          flex-direction: column;
          gap: 14px;
          text-align: center;
          align-items: center;
        }
        .chameleon-modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .chameleon-desc {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--color-text-lead);
        }
        .chameleon-options-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        .chameleon-choice-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          text-align: left;
        }
        .choice-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .choice-text strong {
          font-family: var(--font-heading);
          font-size: 16px;
        }
        .choice-text span {
          font-family: var(--font-body);
          font-size: 12px;
        }

        /* Summary Scoreboard Modal */
        .summary-modal-card {
          max-width: 600px;
          width: 95%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .summary-modal-header {
          display: flex;
          align-items: center;
          gap: 10px;
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
          font-size: 13px;
        }
        .summary-score-table th {
          background-color: var(--color-parchment-deep);
          font-family: var(--font-accent);
          font-size: 9.5px;
          letter-spacing: 0.06em;
          padding: 6px 8px;
          border-bottom: 2px solid var(--color-ink-stroke);
          color: var(--color-text-main);
          text-align: center;
        }
        .summary-score-table td {
          padding: 8px 10px;
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
          gap: 6px;
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
          font-size: 14px;
        }
        .pts-cumulative strong {
          font-size: 15px;
          color: var(--color-cuphead-red);
        }
        .summary-modal-footer {
          display: flex;
          justify-content: flex-end;
        }
        .proceed-btn {
          width: 100%;
          font-size: 16px;
          padding: 12px;
        }

        /* Victory Podium Modal */
        .victory-podium-card {
          max-width: 440px;
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
        .restart-btn {
          width: 100%;
          font-size: 16px;
          padding: 12px;
        }

        /* Codex Rules Modal */
        .codex-modal-card {
          max-width: 620px;
          width: 95%;
          max-height: 85vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .codex-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-cuphead-red);
        }
        .codex-title {
          font-size: 20px;
        }
        .codex-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .codex-section h4 {
          font-family: var(--font-heading);
          font-size: 14px;
          color: var(--color-text-main);
          margin-bottom: 6px;
          border-bottom: 1.5px dashed var(--color-ink-stroke);
          padding-bottom: 2px;
        }
        .codex-section p {
          font-family: var(--font-body);
          font-size: 12.5px;
          color: var(--color-text-lead);
          line-height: 1.35;
        }
        .codex-roles-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .codex-role-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-thin);
          border-radius: 8px;
          padding: 8px 12px;
        }
        .codex-role-item strong {
          font-family: var(--font-heading);
          font-size: 13px;
          color: var(--color-text-main);
          display: block;
        }
        .codex-role-item p {
          font-size: 11.5px !important;
          margin: 0;
        }
        .codex-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;
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
