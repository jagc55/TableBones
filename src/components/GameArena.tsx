import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Crown, AlertTriangle, HelpCircle } from 'lucide-react';
import { Room, Player, UserProfile, ChatMessage } from '../types';
import { AvatarIcon } from '../utils/avatars';
import { GenericGameEngine } from './GenericGameEngine';
import { ChatPanel } from './ChatPanel';
import { GameStageFrame } from './GameStageFrame';
import { RulesModal } from './RulesModal';
import { soundstage } from '../utils/audio';
import { getGameManifest } from '../games';

interface GameArenaProps {
  room: Room;
  currentUser: UserProfile;
  chatMessages: ChatMessage[];
  onPlayerScore: (playerId: string, addedScore: number) => void;
  onLeaveMatch: () => void;
  onMatchComplete: (winner: Player, winReason?: string, finalPlayers?: Player[]) => void;
  onSendMessage: (text: string) => void;
  onToggleMutePlayer: (playerId: string, playerName: string) => void;
  onDispatchSystemNotice: (text: string) => void;
}

export const GameArena: React.FC<GameArenaProps> = ({
  room,
  currentUser,
  chatMessages,
  onPlayerScore,
  onLeaveMatch,
  onMatchComplete,
  onSendMessage,
  onToggleMutePlayer,
  onDispatchSystemNotice,
}) => {
  const [timeLeftSec, setTimeLeftSec] = useState(room.settings.roundDurationSec);
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const currentUserPlayer = room.players.find((p) => p.id === currentUser.id) || room.players[0];
  const manifest = getGameManifest(room.gameId);
  const isUrgentTimer = timeLeftSec <= 15 && timeLeftSec > 0;

  // Track sounds played so they only trigger once per round
  const playedWarningRef = useRef(false);
  const playedEndRef = useRef(false);
  const onMatchCompleteRef = useRef(onMatchComplete);
  onMatchCompleteRef.current = onMatchComplete;

  // Single robust interval for countdown timer
  useEffect(() => {
    if (manifest?.hasRoundTimer === false) return;
    playedWarningRef.current = false;
    playedEndRef.current = false;

    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        const next = prev - 1;

        if (next === 10 && !playedWarningRef.current) {
          playedWarningRef.current = true;
          soundstage.playTimerWarning();
        } else if (next > 0 && next <= 5) {
          soundstage.playTimerTick();
        } else if (next <= 0) {
          clearInterval(timer);
          if (!playedEndRef.current) {
            playedEndRef.current = true;
            soundstage.playRoundEnd();
          }
          if (!manifest?.hideContinuousScoreboard) {
            const sorted = [...room.players].sort((a, b) => b.score - a.score);
            const champion = sorted[0] || currentUserPlayer;
            onMatchCompleteRef.current(champion, `Time's up! Highest score wins the game.`);
          }
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [manifest?.hasRoundTimer, manifest?.hideContinuousScoreboard, room.players, currentUserPlayer]);

  // Periodic bot scoring to simulate multiplayer action (disabled for games with secret end-round calculation)
  useEffect(() => {
    if (manifest?.hideContinuousScoreboard) return;

    const botPlayers = room.players.filter((p) => p.isBot && p.id !== currentUser.id);
    if (botPlayers.length === 0) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.45) {
        const randomBot = botPlayers[Math.floor(Math.random() * botPlayers.length)];
        const pts = Math.floor(Math.random() * 6) + 4;
        onPlayerScore(randomBot.id, pts);
        onDispatchSystemNotice(`${randomBot.name} scored +${pts} pts!`);
      }
    }, 5500);

    return () => clearInterval(interval);
  }, [manifest?.hideContinuousScoreboard, room.players, currentUser.id, onPlayerScore, onDispatchSystemNotice]);

  const handleConfirmForfeit = () => {
    soundstage.playSlideDown();
    setShowForfeitModal(false);
    onLeaveMatch();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSec = room.settings.roundDurationSec;
  const progressRatio = Math.max(0, timeLeftSec / totalSec);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className={`arena-page-layout ${manifest?.arenaLayoutClass || ''}`}>
      {/* Top HUD (Symmetric 3-column grid for perfect centering matching screenshot) */}
      <div className="cel-card arena-hud-bar">
        {/* Left: Stopwatch or empty placeholder to maintain perfect symmetry */}
        <div className="hud-left-meta">
          {manifest?.hasRoundTimer !== false ? (
            <div className={`brass-stopwatch-housing ${isUrgentTimer ? 'timer-urgent animate-tremble' : ''}`}>
              <div className="stopwatch-dial">
                <svg width="72" height="72" viewBox="0 0 72 72" className="stopwatch-svg">
                  <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--color-parchment-deep)" strokeWidth="6" />
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke={isUrgentTimer ? 'var(--color-cuphead-red)' : 'var(--color-golden-buttercup)'}
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 36 36)"
                  />
                </svg>
                <div className="stopwatch-digits">
                  <span className="digits-val">{formatTime(timeLeftSec)}</span>
                  <span className="digits-sub">{isUrgentTimer ? 'URGENT' : 'CLOCK'}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Center: Match Details & Room Code (Centered as in reference screenshot) */}
        <div className="hud-center-meta">
          <div className="ticket-stub" style={{ marginBottom: '6px' }}>
            <span className="ticket-stub-label">ROOM</span>
            <span className="ticket-stub-code">{room.code}</span>
          </div>
          <h2 className="woodcut-title hud-room-title">{room.title}</h2>
          <span className="hud-quorum-text">
            Quorum: {room.minPlayers} players · Active: {room.players.length}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="hud-actions-right">
          <button
            onClick={() => {
              soundstage.playTap();
              setShowRulesModal(true);
            }}
            className="btn-cel btn-brawl-neutral btn-sm"
            title="View game rules & character hierarchy"
          >
            <HelpCircle size={15} strokeWidth={2.8} />
            <span>RULES</span>
          </button>
          <button
            onClick={() => {
              soundstage.playTap();
              setShowForfeitModal(true);
            }}
            className="btn-cel btn-brawl-primary btn-sm"
            title="Leave this match"
          >
            <LogOut size={15} strokeWidth={3} />
            <span>LEAVE MATCH</span>
          </button>
        </div>
      </div>

      {/* Arena Stage & Chat Sidebar */}
      <div className="arena-stage-grid">
        {/* Main Game Stage wrapped inside iframe */}
        <div className="arena-center-stage">
          <GameStageFrame className="game-stage-iframe" title="TableBones Game Stage">
            {/* Scoreboard (Hidden for games like Midnight Alley and Bonegle) */}
            {!manifest?.hideContinuousScoreboard && (
              <div className="cel-card ring-scoreboard-strip">
                <span className="scoreboard-title">ROUND STANDINGS:</span>
                <div className="scoreboard-players-row">
                  {room.players.map((p) => {
                    const isMe = p.id === currentUser.id;
                    const isHost = p.id === room.hostId;
                    return (
                      <div key={p.id} className={`score-chip ${isMe ? 'score-chip-me' : ''}`}>
                        <div className="score-avatar-wrap">
                          <AvatarIcon id={p.avatarId} size={22} />
                          {isHost && (
                            <div className="chip-crown" title="Host">
                              <Crown size={8} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className="score-chip-name">{p.name}{isMe ? ' (You)' : ''}</span>
                        <strong className="score-chip-pts">{p.score} PTS</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabletop Board Engine */}
            <GenericGameEngine
              gameId={room.gameId}
              currentUserPlayer={currentUserPlayer}
              players={room.players}
              settings={room.settings}
              timeLeftSec={timeLeftSec}
              onPlayerScore={onPlayerScore}
              onActionNotification={onDispatchSystemNotice}
              onLeaveMatch={onLeaveMatch}
              onMatchResolved={onMatchComplete}
            />
          </GameStageFrame>
        </div>

        {/* Fixed-height Chat Sidebar (Outside iframe) */}
        <div className="arena-chat-sidebar">
          <ChatPanel
            messages={chatMessages}
            currentUserId={currentUser.id}
            mutedPlayerIds={currentUser.mutedPlayerIds}
            onSendMessage={onSendMessage}
            onToggleMutePlayer={onToggleMutePlayer}
            title="MATCH CHAT"
            className="arena-chat-card"
          />
        </div>
      </div>

      {/* Leave Game Confirmation Modal */}
      {showForfeitModal && (
        <div className="modal-overlay">
          <div className="modal-content forfeit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="forfeit-header">
              <AlertTriangle size={28} strokeWidth={2.8} className="forfeit-icon" />
              <h3 className="woodcut-title forfeit-title">LEAVE THIS MATCH?</h3>
            </div>

            <p className="forfeit-warning-text">
              Leaving the game now will surrender your current score.
              {currentUserPlayer.isHost && (
                <strong> Room host will pass to the next active player.</strong>
              )}
            </p>

            <div className="forfeit-modal-actions">
              <button
                onClick={() => setShowForfeitModal(false)}
                className="btn-cel btn-brawl-neutral btn-sm"
              >
                STAY IN GAME
              </button>
              <button
                onClick={handleConfirmForfeit}
                className="btn-cel btn-brawl-primary btn-sm"
              >
                LEAVE MATCH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        gameId={room.gameId}
      />

      <style>{`
        .arena-page-layout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 16px 40px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .arena-hud-bar {
          padding: 10px 18px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
        }
        .hud-left-meta {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          min-width: 0;
        }
        .brass-stopwatch-housing {
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-thick);
          border-radius: 999px;
          padding: 2px;
          box-shadow: var(--shadow-cel-sm);
          flex-shrink: 0;
        }
        .stopwatch-dial {
          position: relative;
          width: 68px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stopwatch-svg {
          position: absolute;
          inset: 0;
        }
        .stopwatch-digits {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }
        .digits-val {
          font-family: var(--font-luckiest-guy);
          font-size: 17px;
          color: var(--color-text-main);
          letter-spacing: 0.04em;
        }
        .digits-sub {
          font-family: var(--font-theatre-rye);
          font-size: 8px;
          letter-spacing: 0.1em;
          color: var(--color-cuphead-red);
        }
        .hud-center-meta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          text-align: center;
          grid-column: 2;
        }
        .hud-room-title {
          font-size: 22px;
          color: var(--color-text-main);
          margin: 0;
        }
        .hud-quorum-text {
          font-family: var(--font-typewriter-elite);
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .hud-actions-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
          grid-column: 3;
        }
        .game-stage-iframe {
          width: 100%;
          border: none;
          display: block;
          background: transparent;
          overflow: hidden;
        }
        .arena-page-layout.arena-midnight-layout {
          max-width: 1400px;
        }
        .arena-stage-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 14px;
          align-items: start;
        }
        .arena-center-stage {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          min-width: 0;
        }
        .ring-scoreboard-strip {
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
        }
        .scoreboard-title {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--color-cuphead-red);
          flex-shrink: 0;
        }
        .scoreboard-players-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .score-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-thin);
          border-radius: 7px;
          padding: 4px 10px;
          box-shadow: var(--shadow-cel-sm);
          font-size: 12.5px;
        }
        .score-chip-me {
          background-color: var(--color-golden-buttercup);
          border-color: var(--color-ink-stroke);
          color: var(--color-ink-black);
        }
        .score-avatar-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .chip-crown {
          position: absolute;
          top: -4px;
          right: -4px;
          background-color: var(--color-golden-buttercup);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          height: 12px;
        }
        .score-chip-name {
          font-family: var(--font-luckiest-guy);
          color: var(--color-text-main);
        }
        .score-chip-pts {
          font-family: var(--font-typewriter-elite);
          font-size: 12px;
          color: var(--color-cuphead-red);
          font-weight: 700;
        }
        .arena-chat-sidebar {
          height: 100%;
          max-height: 600px;
        }
        .arena-chat-card {
          height: 600px;
        }
        .forfeit-modal {
          max-width: 400px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: center;
        }
        .forfeit-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .forfeit-icon {
          color: var(--color-cuphead-red);
        }
        .forfeit-title {
          font-size: 20px;
          color: var(--color-text-main);
        }
        .forfeit-warning-text {
          font-size: 13.5px;
          color: var(--color-text-lead);
          line-height: 1.4;
        }
        .forfeit-modal-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 6px;
        }

        @media (max-width: 800px) {
          .arena-hud-bar { flex-direction: column; text-align: center; }
          .arena-stage-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};
