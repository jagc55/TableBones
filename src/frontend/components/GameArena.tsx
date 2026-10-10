import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Crown, AlertTriangle, HelpCircle, MessageSquare, X } from 'lucide-react';
import { Room, UserProfile, ChatMessage } from '../types';
import { AvatarIcon } from '../utils/avatars';
import { GameAction, MatchState } from '../websocket/client';
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
  onLeaveMatch: () => void;
  onSendMessage: (text: string) => void;
  onToggleMutePlayer: (playerId: string, playerName: string) => void;
  onDispatchSystemNotice: (text: string) => void;
  matchState: MatchState | null;
  onGameAction: (action: GameAction) => void;
}

export const GameArena: React.FC<GameArenaProps> = ({
  room,
  currentUser,
  chatMessages,
  onLeaveMatch,
  onSendMessage,
  onToggleMutePlayer,
  onDispatchSystemNotice,
  matchState,
  onGameAction,
}) => {
  const [now, setNow] = useState(Date.now());
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const prevMessagesCountRef = useRef(chatMessages.length);

  useEffect(() => {
    if (chatMessages.length > prevMessagesCountRef.current) {
      if (!isChatOpen) {
        setHasUnreadMessages(true);
      }
    }
    prevMessagesCountRef.current = chatMessages.length;
  }, [chatMessages.length, isChatOpen]);

  const handleToggleChat = () => {
    soundstage.playTap();
    setIsChatOpen((prev) => {
      const next = !prev;
      if (next) {
        setHasUnreadMessages(false);
      }
      return next;
    });
  };

  const currentUserPlayer = room.players.find((p) => p.id === currentUser.id) || room.players[0];
  const manifest = getGameManifest(room.gameId);
  const deadline = matchState?.deadline || null;
  const timeLeftSec = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  const isUrgentTimer = timeLeftSec <= 15 && timeLeftSec > 0;

  // The clock is display-only; the server resolves deadline outcomes.
  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

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

  const totalSec = Math.max(1, room.settings.roundDurationSec);
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
            {room.gameId === 'midnight-alley' && (
              <> · Mode: {room.settings?.advancedMode ? 'Advanced Mode' : 'Normal Mode'}</>
            )}
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

      {/* Arena Stage (iframe expands to occupy the space) */}
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
              roomCode={room.code}
              roomId={room.id}
              currentUserPlayer={currentUserPlayer}
              players={room.players}
              settings={room.settings}
              timeLeftSec={timeLeftSec}
              matchState={matchState}
              onGameAction={onGameAction}
              onPlayerScore={() => undefined}
              onActionNotification={onDispatchSystemNotice}
              onLeaveMatch={onLeaveMatch}
            />
          </GameStageFrame>
        </div>
      </div>

      {/* Floating Chat Bubble Button */}
      <button
        type="button"
        className={`arena-chat-fab ${isChatOpen ? 'chat-fab-active' : ''}`}
        onClick={handleToggleChat}
        title={isChatOpen ? 'Close chat' : 'Open chat'}
        aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
      >
        {isChatOpen ? (
          <X size={24} strokeWidth={2.8} />
        ) : (
          <MessageSquare size={24} strokeWidth={2.5} />
        )}

        {/* Unread indicator badge: red circle with small inner white circle on top-right border */}
        {!isChatOpen && hasUnreadMessages && (
          <span className="chat-fab-badge" aria-label="New messages">
            <span className="chat-badge-inner" />
          </span>
        )}
      </button>

      {/* Floating Chat Window */}
      {isChatOpen && (
        <div className="arena-floating-chat-container">
          <ChatPanel
            messages={chatMessages}
            currentUserId={currentUser.id}
            mutedPlayerIds={currentUser.mutedPlayerIds}
            onSendMessage={onSendMessage}
            onToggleMutePlayer={onToggleMutePlayer}
            title="MATCH CHAT"
            className="arena-chat-floating-card"
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      )}

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
          display: inline-flex;
          align-items: center;
          justify-content: center;
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
          top: 0;
          left: 0;
          width: 72px;
          height: 72px;
          display: block;
        }
        .stopwatch-digits {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1;
          pointer-events: none;
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
        .arena-stage-grid {
          display: grid;
          grid-template-columns: 1fr;
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
        .arena-chat-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 54px;
          height: 54px;
          border-radius: 999px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-thick);
          box-shadow: var(--shadow-cel-md);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-ink-black);
          z-index: 1000;
          transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.15s ease;
        }
        .arena-chat-fab:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: var(--shadow-cel-lg);
          background-color: var(--color-golden-buttercup);
        }
        .arena-chat-fab:active {
          transform: translateY(1px) scale(0.98);
        }
        .arena-chat-fab.chat-fab-active {
          background-color: var(--color-golden-buttercup);
        }
        .chat-fab-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background-color: #dc2626;
          border: 2px solid var(--color-ink-stroke, #1c1511);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          pointer-events: none;
        }
        .chat-badge-inner {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #ffffff;
        }
        .arena-floating-chat-container {
          position: fixed;
          bottom: 88px;
          right: 24px;
          width: 360px;
          max-width: calc(100vw - 32px);
          height: 520px;
          max-height: calc(100vh - 120px);
          z-index: 999;
          display: flex;
          flex-direction: column;
          animation: chatSlideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes chatSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .arena-chat-floating-card {
          width: 100%;
          height: 100%;
          max-height: 100% !important;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-cel-lg);
        }
        @media (max-width: 600px) {
          .arena-floating-chat-container {
            bottom: 84px;
            right: 12px;
            left: 12px;
            width: auto;
            max-width: none;
            height: 460px;
          }
          .arena-chat-fab {
            bottom: 16px;
            right: 16px;
          }
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
