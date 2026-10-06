import React, { useState, useEffect } from 'react';
import { LogOut, Crown, AlertTriangle, UserMinus } from 'lucide-react';
import { Room, Player, UserProfile, ChatMessage } from '../types';
import { AvatarIcon } from '../utils/avatars';
import { GenericGameEngine } from './GenericGameEngine';
import { ChatPanel } from './ChatPanel';
import { soundstage } from '../utils/audio';

interface GameArenaProps {
  room: Room;
  currentUser: UserProfile;
  chatMessages: ChatMessage[];
  onPlayerScore: (playerId: string, addedScore: number) => void;
  onLeaveMatch: () => void;
  onSimulateOpponentLeave: () => void;
  onMatchComplete: (winner: Player, winReason?: string) => void;
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
  onSimulateOpponentLeave,
  onMatchComplete,
  onSendMessage,
  onToggleMutePlayer,
  onDispatchSystemNotice,
}) => {
  const [timeLeftSec, setTimeLeftSec] = useState(room.settings.roundDurationSec);
  const [showForfeitModal, setShowForfeitModal] = useState(false);

  const currentUserPlayer = room.players.find((p) => p.id === currentUser.id) || room.players[0];
  const isUrgentTimer = timeLeftSec <= 15 && timeLeftSec > 0;

  // Round countdown timer
  useEffect(() => {
    if (timeLeftSec <= 0) {
      soundstage.playVictoryFanfare();
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      const champion = sorted[0] || currentUserPlayer;
      onMatchComplete(champion, `Time's up! Highest score wins the game.`);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftSec((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSec, room.players, currentUserPlayer, onMatchComplete]);

  // Periodic bot scoring to simulate multiplayer action
  useEffect(() => {
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
  }, [room.players, currentUser.id, onPlayerScore, onDispatchSystemNotice]);

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
    <div className="arena-page-layout">
      {/* Top HUD */}
      <div className="cel-card arena-hud-bar">
        {/* Left: Stopwatch */}
        <div className={`brass-stopwatch-housing ${isUrgentTimer ? 'timer-urgent animate-tremble' : ''}`}>
          <div className="stopwatch-dial">
            <svg width="72" height="72" viewBox="0 0 72 72" className="stopwatch-svg">
              <circle cx="36" cy="36" r={radius} fill="none" stroke="#2b1e17" strokeWidth="6" />
              <circle
                cx="36"
                cy="36"
                r={radius}
                fill="none"
                stroke={isUrgentTimer ? '#d33833' : '#f6c445'}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
              />
            </svg>
            <div className="stopwatch-digits">
              <span className="digits-val">{formatTime(timeLeftSec)}</span>
              <span className="digits-sub">{isUrgentTimer ? 'URGENT' : 'TIME'}</span>
            </div>
          </div>
        </div>

        {/* Center: Match Details & Room Code */}
        <div className="hud-center-meta">
          <div className="ticket-stub">
            <span className="ticket-stub-label">ROOM</span>
            <span className="ticket-stub-code">{room.code}</span>
          </div>
          <h2 className="woodcut-title hud-room-title">{room.title}</h2>
          <span className="hud-quorum-text">
            Min Players: {room.minPlayers} · Active Players: {room.players.length}
          </span>
        </div>

        {/* Right: Simulation helper & Leave Game */}
        <div className="hud-actions-right">
          {room.players.length > 1 && (
            <button
              onClick={() => {
                soundstage.playBulbHorn();
                onSimulateOpponentLeave();
              }}
              className="btn-cel btn-brawl-neutral btn-sm"
              title="Simulate an opponent leaving to test walkover win logic"
            >
              <UserMinus size={14} strokeWidth={2.8} />
              <span>SIMULATE OPPONENT LEAVING</span>
            </button>
          )}

          <button
            onClick={() => {
              soundstage.playTap();
              setShowForfeitModal(true);
            }}
            className="btn-cel btn-brawl-primary btn-sm"
            title="Leave this game"
          >
            <LogOut size={15} strokeWidth={3} />
            <span>LEAVE GAME</span>
          </button>
        </div>
      </div>

      {/* Arena Stage & Chat Sidebar */}
      <div className="arena-stage-grid">
        {/* Main Game Stage */}
        <div className="arena-center-stage">
          {/* Scoreboard */}
          <div className="cel-card ring-scoreboard-strip">
            <span className="scoreboard-title">SCOREBOARD:</span>
            <div className="scoreboard-players-row">
              {room.players.map((p) => {
                const isMe = p.id === currentUser.id;
                const isHost = p.id === room.hostId;
                return (
                  <div key={p.id} className={`score-chip ${isMe ? 'score-chip-me' : ''}`}>
                    <div className="score-avatar-wrap">
                      <AvatarIcon id={p.avatarId} size={20} />
                      {isHost && (
                        <div className="chip-crown" title="Host">
                          <Crown size={8} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="score-chip-name">{p.name}</span>
                    <strong className="score-chip-pts">{p.score} PTS</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabletop Board Engine */}
          <GenericGameEngine
            gameId={room.gameId}
            currentUserPlayer={currentUserPlayer}
            players={room.players}
            onPlayerScore={onPlayerScore}
            onActionNotification={onDispatchSystemNotice}
          />
        </div>

        {/* Fixed-height Chat Sidebar */}
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
              Are you sure you want to leave the game?
              {currentUserPlayer.isHost && (
                <strong> As the host, leadership of the room will automatically pass to another player.</strong>
              )}
              {room.players.length <= room.minPlayers && (
                <span> If active players drop below the minimum required ({room.minPlayers}), the remaining player will win automatically!</span>
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
                YES, LEAVE GAME
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .arena-page-layout {
          max-width: 1120px;
          margin: 0 auto;
          padding: 14px 16px 36px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .arena-hud-bar {
          padding: 10px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .brass-stopwatch-housing {
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thick);
          border-radius: 999px;
          padding: 2px;
          box-shadow: var(--shadow-cel-sm);
          flex-shrink: 0;
        }
        .stopwatch-dial {
          position: relative;
          width: 72px;
          height: 72px;
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
          font-size: 18px;
          color: var(--color-ink-black);
          letter-spacing: 0.04em;
        }
        .digits-sub {
          font-family: var(--font-theatre-rye);
          font-size: 8px;
          letter-spacing: 0.1em;
          color: var(--color-cuphead-red);
        }
        .timer-urgent circle:nth-child(2) {
          stroke: #d33833;
        }
        .hud-center-meta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          text-align: center;
        }
        .hud-room-title {
          font-size: 22px;
          color: var(--color-ink-black);
        }
        .hud-quorum-text {
          font-family: var(--font-typewriter-elite);
          font-size: 11px;
          color: #655444;
        }
        .hud-actions-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .arena-stage-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 14px;
          align-items: start;
        }
        .arena-center-stage {
          display: flex;
          flex-direction: column;
          gap: 12px;
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
          padding: 3px 8px;
          box-shadow: var(--shadow-cel-sm);
          font-size: 12px;
        }
        .score-chip-me {
          background-color: var(--color-golden-buttercup);
          border-color: var(--color-ink-black);
        }
        .score-avatar-wrap {
          position: relative;
        }
        .chip-crown {
          position: absolute;
          top: -3px;
          right: -3px;
          background-color: var(--color-golden-buttercup);
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .score-chip-name {
          font-family: var(--font-luckiest-guy);
          color: var(--color-ink-black);
        }
        .score-chip-pts {
          font-family: var(--font-typewriter-elite);
          font-size: 12px;
          color: var(--color-cuphead-red);
        }
        .arena-chat-sidebar {
          height: 100%;
          max-height: 520px;
        }
        .arena-chat-card {
          height: 520px;
        }
        .forfeit-modal {
          max-width: 420px;
          padding: 20px;
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
          color: var(--color-ink-black);
        }
        .forfeit-warning-text {
          font-size: 13.5px;
          color: #4b3d32;
          line-height: 1.35;
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
