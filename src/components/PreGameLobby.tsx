import React, { useState } from 'react';
import { Crown, Check, UserX, Copy, Play, ArrowLeft, Bot, AlertCircle, Users } from 'lucide-react';
import { Room, UserProfile, ChatMessage } from '../types';
import { GAMES_CATALOG } from '../utils/mockData';
import { AvatarIcon, AVATAR_LIST } from '../utils/avatars';
import { ChatPanel } from './ChatPanel';
import { soundstage } from '../utils/audio';

interface PreGameLobbyProps {
  room: Room;
  currentUser: UserProfile;
  chatMessages: ChatMessage[];
  onStartGame: () => void;
  onLeaveLobby: () => void;
  onKickPlayer: (playerId: string) => void;
  onTransferHost: (newHostId: string) => void;
  onToggleReady: () => void;
  onAddBotPlayer: (botName: string, avatarId: string) => void;
  onSendMessage: (text: string) => void;
  onToggleMutePlayer: (playerId: string, playerName: string) => void;
}

export const PreGameLobby: React.FC<PreGameLobbyProps> = ({
  room,
  currentUser,
  chatMessages,
  onStartGame,
  onLeaveLobby,
  onKickPlayer,
  onTransferHost,
  onToggleReady,
  onAddBotPlayer,
  onSendMessage,
  onToggleMutePlayer,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const gameDef = GAMES_CATALOG.find((g) => g.id === room.gameId) || GAMES_CATALOG[0];
  const isHost = room.hostId === currentUser.id;
  const myPlayerState = room.players.find((p) => p.id === currentUser.id);

  const canStart =
    room.players.length >= room.minPlayers &&
    room.players.every((p) => p.isReady || p.isHost);

  const handleCopyCode = () => {
    soundstage.playTap();
    navigator.clipboard.writeText(room.code);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddRandomBot = () => {
    soundstage.playTap();
    const botNames = [
      'Player Bot Alpha',
      'Player Bot Beta',
      'Player Bot Gamma',
      'Player Bot Delta',
    ];
    const availableNames = botNames.filter((n) => !room.players.some((p) => p.name === n));
    const randomName = availableNames[0] || `Bot ${room.players.length + 1}`;
    const randomAvatar = AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)].id;
    onAddBotPlayer(randomName, randomAvatar);
  };

  return (
    <div className="lobby-page-container">
      {/* Top Banner Navigation */}
      <div className="lobby-top-bar">
        <button
          onClick={() => {
            soundstage.playTap();
            onLeaveLobby();
          }}
          className="btn-cel btn-brawl-neutral btn-sm"
          title="Leave Lobby"
        >
          <ArrowLeft size={16} strokeWidth={2.8} />
          <span>LEAVE LOBBY</span>
        </button>

        {/* Room Code Badge */}
        <div className="lobby-ticket-hero" onClick={handleCopyCode} title="Click to copy room code">
          <div className="ticket-tag">
            <span className="ticket-tag-title">ROOM CODE</span>
            <span className="ticket-tag-sub">{room.isPrivate ? 'PRIVATE' : 'PUBLIC'}</span>
          </div>
          <div className="ticket-value">{room.code}</div>
          <button className="ticket-copy-action" aria-label="Copy code">
            {copiedLink ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="lobby-grid">
        {/* Left Column: Game Rules & Player Roster */}
        <div className="lobby-left-column">
          {/* Game Overview Card */}
          <div className="cel-card game-summary-card">
            <div className="summary-header">
              <div>
                <span className="ribbon-banner">{gameDef.title}</span>
                <h2 className="woodcut-title summary-game-title">{room.title}</h2>
              </div>
              <span className="game-kind-pill">{room.isPrivate ? 'Private Room' : 'Public Room'}</span>
            </div>

            <p className="summary-desc">{gameDef.description}</p>

            <div className="summary-specs-grid">
              <div className="spec-cell">
                <span className="spec-label">PLAYERS</span>
                <span className="spec-value">
                  Min {room.minPlayers} / Max {room.maxPlayers}
                </span>
              </div>
              <div className="spec-cell">
                <span className="spec-label">ROUND TIME</span>
                <span className="spec-value">{room.settings.roundDurationSec} Seconds</span>
              </div>
              <div className="spec-cell">
                <span className="spec-label">ACCESS</span>
                <span className="spec-value">{room.isPrivate ? 'Code Only' : 'Public'}</span>
              </div>
            </div>
          </div>

          {/* Roster & Host Kick Controls */}
          <div className="cel-card roster-card">
            <div className="roster-header">
              <div className="roster-header-left">
                <Users size={18} strokeWidth={2.8} />
                <h3 className="woodcut-title roster-heading">
                  PLAYERS ({room.players.length}/{room.maxPlayers})
                </h3>
              </div>

              {isHost && room.players.length < room.maxPlayers && (
                <button
                  onClick={handleAddRandomBot}
                  className="btn-cel btn-brawl-secondary btn-sm"
                  title="Add simulated player to test room"
                >
                  <Bot size={14} strokeWidth={2.6} />
                  <span>ADD BOT</span>
                </button>
              )}
            </div>

            <div className="roster-list">
              {room.players.map((player) => {
                const isThisPlayerHost = player.id === room.hostId;
                const isMe = player.id === currentUser.id;

                return (
                  <div
                    key={player.id}
                    className={`roster-player-item ${isThisPlayerHost ? 'player-is-host' : ''}`}
                  >
                    <div className="roster-avatar-wrap">
                      <AvatarIcon id={player.avatarId} size={40} />
                      {isThisPlayerHost && (
                        <div className="crown-badge" title="Room Host">
                          <Crown size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="roster-info-wrap">
                      <div className="player-name-row">
                        <strong className="roster-player-name">{player.name}</strong>
                        {isMe && <span className="you-chip">YOU</span>}
                        {player.isBot && <span className="bot-chip">BOT</span>}
                      </div>

                      <div className="player-subline">
                        {isThisPlayerHost ? (
                          <span className="role-tag-host">HOST</span>
                        ) : (
                          <span className="role-tag-contender">PLAYER</span>
                        )}
                        <span
                          className={`ready-status-pill ${
                            player.isReady || isThisPlayerHost ? 'ready-yes' : 'ready-no'
                          }`}
                        >
                          {player.isReady || isThisPlayerHost ? 'READY' : 'NOT READY'}
                        </span>
                      </div>
                    </div>

                    {/* Host Controls: Kick & Transfer */}
                    <div className="roster-actions">
                      {isHost && !isMe && (
                        <div className="host-management-btns">
                          <button
                            onClick={() => {
                              soundstage.playTap();
                              onTransferHost(player.id);
                            }}
                            className="btn-cel btn-brawl-neutral btn-sm"
                            title="Make this player host"
                          >
                            <Crown size={13} strokeWidth={2.5} />
                            <span>MAKE HOST</span>
                          </button>
                          <button
                            onClick={() => {
                              onKickPlayer(player.id);
                            }}
                            className="btn-cel btn-brawl-primary btn-sm kick-btn"
                            title={`Kick ${player.name} from room`}
                          >
                            <UserX size={14} strokeWidth={2.8} />
                            <span>KICK</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Match Triggers */}
            <div className="roster-footer-controls">
              {isHost ? (
                <div className="host-start-wrapper">
                  {!canStart && (
                    <div className="quorum-notice">
                      <AlertCircle size={14} strokeWidth={2.5} />
                      <span>
                        {room.players.length < room.minPlayers
                          ? `Requires at least ${room.minPlayers} players to start.`
                          : 'Waiting for all players to be ready.'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      soundstage.playRoundBell();
                      onStartGame();
                    }}
                    disabled={!canStart}
                    className="btn-cel btn-brawl-primary start-match-btn"
                  >
                    <Play size={18} strokeWidth={3} />
                    <span>START GAME</span>
                  </button>
                </div>
              ) : (
                <div className="contender-ready-wrapper">
                  <button
                    onClick={() => {
                      soundstage.playTap();
                      onToggleReady();
                    }}
                    className={`btn-cel ready-toggle-btn ${
                      myPlayerState?.isReady ? 'btn-brawl-neutral' : 'btn-brawl-secondary'
                    }`}
                  >
                    <Check size={16} strokeWidth={3} />
                    <span>{myPlayerState?.isReady ? 'CANCEL READY' : 'READY'}</span>
                  </button>
                  <span className="waiting-host-hint">
                    Waiting for the host to start the game...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Room Chat */}
        <div className="lobby-right-column">
          <ChatPanel
            messages={chatMessages}
            currentUserId={currentUser.id}
            mutedPlayerIds={currentUser.mutedPlayerIds}
            onSendMessage={onSendMessage}
            onToggleMutePlayer={onToggleMutePlayer}
            title="ROOM CHAT"
            className="lobby-chat-card"
          />
        </div>
      </div>

      <style>{`
        .lobby-page-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px 16px 36px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .lobby-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .lobby-ticket-hero {
          display: flex;
          align-items: center;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-thick);
          border-radius: 10px;
          box-shadow: var(--shadow-cel-sm);
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .lobby-ticket-hero:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-cel-md);
        }
        .ticket-tag {
          background-color: var(--color-cuphead-red);
          color: var(--color-glove-ivory);
          padding: 6px 12px;
          display: flex;
          flex-direction: column;
          border-right: 2px dashed var(--color-ink-black);
        }
        .ticket-tag-title {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.08em;
          line-height: 1;
        }
        .ticket-tag-sub {
          font-family: var(--font-theatre-rye);
          font-size: 8px;
          opacity: 0.9;
        }
        .ticket-value {
          font-family: var(--font-typewriter-elite);
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.12em;
          padding: 6px 14px;
          color: var(--color-ink-black);
        }
        .ticket-copy-action {
          background: none;
          border: none;
          padding: 6px 10px;
          color: var(--color-ink-black);
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .lobby-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 16px;
          align-items: start;
        }
        .lobby-left-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .game-summary-card {
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .summary-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .summary-game-title {
          font-size: 24px;
          color: var(--color-ink-black);
          margin-top: 2px;
        }
        .game-kind-pill {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.06em;
          background-color: var(--color-golden-buttercup);
          border: 1.5px solid #1c1511;
          border-radius: 6px;
          padding: 3px 8px;
          color: #1c1511;
          font-weight: 700;
        }
        .summary-desc {
          font-size: 14px;
          color: var(--color-text-lead);
          line-height: 1.35;
        }
        .summary-specs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          background-color: var(--color-canvas-parchment);
          border: 1.5px solid var(--color-ink-black);
          border-radius: 8px;
          padding: 8px 12px;
        }
        .spec-cell {
          display: flex;
          flex-direction: column;
        }
        .spec-label {
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          letter-spacing: 0.08em;
          color: var(--color-cuphead-red);
        }
        .spec-value {
          font-family: var(--font-typewriter-elite);
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-ink-black);
        }
        .roster-card {
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .roster-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid var(--color-ink-black);
          padding-bottom: 8px;
        }
        .roster-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .roster-heading {
          font-size: 18px;
          color: var(--color-ink-black);
        }
        .roster-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .roster-player-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-standard);
          border-radius: 10px;
          padding: 8px 12px;
          box-shadow: var(--shadow-cel-sm);
        }
        .player-is-host {
          background-color: var(--color-parchment-deep);
        }
        .roster-avatar-wrap {
          position: relative;
          border: 1.5px solid var(--color-ink-black);
          border-radius: 8px;
          overflow: visible;
          background-color: var(--color-golden-buttercup);
          flex-shrink: 0;
        }
        .crown-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
          border: 1.5px solid #1c1511;
          border-radius: 999px;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .roster-info-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .player-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .roster-player-name {
          font-family: var(--font-luckiest-guy);
          font-size: 15px;
          color: var(--color-text-main);
        }
        .you-chip, .bot-chip {
          font-family: var(--font-theatre-rye);
          font-size: 8.5px;
          letter-spacing: 0.05em;
          padding: 1px 5px;
          border-radius: 3px;
          border: 1px solid var(--color-ink-stroke);
        }
        .you-chip {
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
          border-color: #1c1511;
          font-weight: 700;
        }
        .bot-chip {
          background-color: var(--color-parchment-deep);
          color: var(--color-text-main);
        }
        .player-subline {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .role-tag-host {
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          color: var(--color-cuphead-red);
          font-weight: bold;
        }
        .role-tag-contender {
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          color: var(--color-text-muted);
        }
        .ready-status-pill {
          font-family: var(--font-theatre-rye);
          font-size: 8.5px;
          letter-spacing: 0.05em;
          padding: 1px 5px;
          border-radius: 3px;
          border: 1px solid var(--color-ink-stroke);
        }
        .ready-yes {
          background-color: #d4edd2;
          color: #1f5e1f;
        }
        .ready-no {
          background-color: #fcedd0;
          color: #8c5b1b;
        }
        [data-theme="night"] .ready-yes {
          background-color: rgba(98, 216, 151, 0.2);
          color: #62d897;
          border-color: #62d897;
        }
        [data-theme="night"] .ready-no {
          background-color: rgba(230, 72, 67, 0.2);
          color: #ff8580;
          border-color: #ff8580;
        }
        .roster-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .host-management-btns {
          display: flex;
          gap: 5px;
        }
        .kick-btn {
          background-color: var(--color-cuphead-red);
        }
        .roster-footer-controls {
          margin-top: 6px;
          padding-top: 14px;
          border-top: 1.5px dashed var(--color-ink-stroke);
        }
        .host-start-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .quorum-notice {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-cuphead-red);
          font-weight: 600;
        }
        .start-match-btn {
          width: 100%;
          font-size: 17px;
          padding: 12px;
        }
        .contender-ready-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
        }
        .ready-toggle-btn {
          width: 100%;
          font-size: 15px;
          padding: 10px;
        }
        .waiting-host-hint {
          font-size: 11.5px;
          font-style: italic;
          color: var(--color-text-muted);
        }
        .lobby-right-column {
          height: 100%;
          max-height: 520px;
        }
        .lobby-chat-card {
          height: 520px;
        }

        @media (max-width: 800px) {
          .lobby-grid { grid-template-columns: 1fr; }
          .summary-specs-grid { grid-template-columns: 1fr; }
          .roster-player-item { flex-direction: column; align-items: flex-start; }
          .roster-actions { width: 100%; justify-content: flex-end; }
        }
      `}</style>
    </div>
  );
};
