import React, { useState } from 'react';
import { Crown, Check, UserX, Copy, Play, ArrowLeft, Bot, AlertCircle, Users, Settings, HelpCircle, Share2, Eye, EyeOff } from 'lucide-react';
import { Room, UserProfile, ChatMessage, RoomSettings } from '../types';
import { GAMES_CATALOG } from '../utils/mockData';
import { AvatarIcon, AVATAR_LIST } from '../utils/avatars';
import { ChatPanel } from './ChatPanel';
import { RulesModal } from './RulesModal';
import { InviteFriendsModal } from './InviteFriendsModal';
import { soundstage } from '../utils/audio';
import { getGameManifest } from '../games';
import { RoomSettingsModal } from './RoomSettingsModal';
import { buildInviteUrl } from '../websocket/client';


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
  onUpdateRoomSettings?: (newSettings: RoomSettings, newTitle?: string, isPrivate?: boolean) => void;
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
  onUpdateRoomSettings,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCodeHidden, setIsCodeHidden] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const manifest = getGameManifest(room.gameId);
  const gameDef = manifest?.definition || GAMES_CATALOG.find((g) => g.id === room.gameId) || GAMES_CATALOG[0];
  const isHost = room.hostId === currentUser.id;
  const myPlayerState = room.players.find((p) => p.id === currentUser.id);

  const canStart =
    room.players.length >= room.minPlayers &&
    room.players.every((p) => p.isReady || p.isHost || p.isBot);

  const copyTextToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyRoomCode = async () => {
    soundstage.playTap();
    await copyTextToClipboard(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLinkOnly = async () => {
    soundstage.playTap();
    const inviteUrl = buildInviteUrl(room);
    await copyTextToClipboard(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenInviteModal = () => {
    soundstage.playTap();
    setShowInviteModal(true);
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
      {/* Top Banner Navigation & Ticket Stub */}
      <div className="lobby-top-bar">
        <div className="lobby-top-left-actions">
          <button
            onClick={() => {
              soundstage.playTap();
              onLeaveLobby();
            }}
            className="btn-cel btn-brawl-neutral btn-sm"
            title="Return to Room Browser"
          >
            <ArrowLeft size={16} strokeWidth={2.8} />
            <span>LEAVE LOBBY</span>
          </button>
          <button
            onClick={() => {
              soundstage.playTap();
              setShowRulesModal(true);
            }}
            className="btn-cel btn-brawl-neutral btn-sm"
            title="View game rules & character hierarchy"
          >
            <HelpCircle size={16} strokeWidth={2.8} />
            <span>RULES</span>
          </button>
          <button
            onClick={handleOpenInviteModal}
            className="btn-cel btn-brawl-primary btn-sm invite-link-btn"
            title="Open invite friends modal"
          >
            <Share2 size={16} strokeWidth={2.8} />
            <span>INVITE FRIENDS</span>
          </button>
        </div>

        {/* Right side actions: Settings gear + Split Room Code & Share Link containers */}
        <div className="lobby-top-right-actions">
          <button
            onClick={() => {
              soundstage.playTap();
              setIsSettingsModalOpen(true);
            }}
            className="btn-cel btn-brawl-neutral btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title={isHost ? "Configure Game Settings" : "View Room Settings"}
          >
            <Settings size={16} strokeWidth={2.8} />
            <span>SETTINGS</span>
          </button>

          {/* Button to the left of room code container to hide/show code */}
          <button
            type="button"
            onClick={() => {
              soundstage.playTap();
              setIsCodeHidden((prev) => !prev);
            }}
            className="btn-ticket-visibility"
            title={isCodeHidden ? 'Show room code' : 'Hide room code'}
            aria-label={isCodeHidden ? 'Show room code' : 'Hide room code'}
          >
            {isCodeHidden ? <Eye size={16} strokeWidth={2.6} /> : <EyeOff size={16} strokeWidth={2.6} />}
          </button>

          {/* Container 1: Room Code */}
          <div
            className="lobby-ticket-hero lobby-ticket-code"
            onClick={handleCopyRoomCode}
            title="Copy room code"
            role="button"
            tabIndex={0}
          >
            <div className="ticket-value ticket-value-code">
              <span className="code-sizer" aria-hidden="true">{room.code}</span>
              <span className="code-display">{isCodeHidden ? '****' : room.code}</span>
            </div>
            <button
              type="button"
              className="ticket-copy-action"
              aria-label="Copy room code"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyRoomCode();
              }}
            >
              {copiedCode ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
            </button>
          </div>

          {/* Container 2: Share Link */}
          <div
            className="lobby-ticket-hero"
            onClick={handleCopyInviteLinkOnly}
            title="Copy room invite link"
            role="button"
            tabIndex={0}
          >
            <div className="ticket-value ticket-value-share">
              SHARE LINK
            </div>
            <button
              type="button"
              className="ticket-copy-action"
              aria-label="Copy room invite link"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyInviteLinkOnly();
              }}
            >
              {copiedLink ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
            </button>
          </div>
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
              <div className="summary-header-actions">
                <button
                  type="button"
                  onClick={() => {
                    soundstage.playTap();
                    setShowRulesModal(true);
                  }}
                  className="btn-cel btn-brawl-secondary btn-sm"
                  title="View complete rules"
                >
                  <HelpCircle size={14} strokeWidth={2.8} />
                  <span>RULES</span>
                </button>
                <span className="game-kind-pill">{room.isPrivate ? 'Private Room' : 'Public Room'}</span>
              </div>
            </div>

            <p className="summary-desc">{gameDef.description}</p>

            <div className="summary-meta-chips">
              <span className="meta-chip">
                <strong>Capacity:</strong> {room.minPlayers}–{room.maxPlayers} Contenders
              </span>
              <span className="meta-chip">
                {manifest?.formatBadge ? (
                  <>
                    <strong>Format:</strong> {manifest.formatBadge}
                  </>
                ) : (
                  <>
                    <strong>Round Clock:</strong> {room.settings.roundDurationSec}s
                  </>
                )}
              </span>
              {manifest?.lobbyMetaChips?.(room)}
              <span className="meta-chip">
                <strong>Access:</strong> {room.isPrivate ? 'Ticket Code' : 'Public Lobby'}
              </span>
            </div>
          </div>

          {/* Roster & Host Kick Controls */}
          <div className="cel-card roster-card">
            <div className="roster-header">
              <div className="roster-header-left">
                <Users size={18} strokeWidth={2.8} />
                <h3 className="woodcut-title roster-heading">
                  CONTENDERS ({room.players.length}/{room.maxPlayers})
                </h3>
              </div>

              {isHost && room.players.length < room.maxPlayers && (
                <button
                  onClick={handleAddRandomBot}
                  className="btn-cel btn-brawl-secondary btn-sm"
                  title="Add simulated contender to test game"
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
                const isReady = player.isReady || isThisPlayerHost || player.isBot;

                return (
                  <div
                    key={player.id}
                    className={`roster-player-item ${isThisPlayerHost ? 'player-is-host' : ''}`}
                  >
                    <div className="roster-avatar-wrap">
                      <AvatarIcon id={player.avatarId} size={38} />
                      {isThisPlayerHost && (
                        <div className="crown-badge" title="Room Host">
                          <Crown size={10} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="roster-info-wrap">
                      <div className="player-name-row">
                        <strong className="roster-player-name">{player.name}</strong>
                        {isMe && <span className="player-tag you-tag">(You)</span>}
                        {player.isBot && <span className="player-tag bot-tag">(Bot)</span>}
                      </div>
                      <div className="player-subline">
                        <span className={`ready-tag ${isReady ? 'ready-tag-yes' : 'ready-tag-waiting'}`}>
                          {isThisPlayerHost ? 'HOST' : isReady ? 'READY' : 'WAITING'}
                        </span>
                      </div>
                    </div>

                    {/* Host Controls: Kick & Transfer */}
                    {isHost && !isMe && (
                      <div className="roster-actions">
                        <button
                          onClick={() => {
                            soundstage.playTap();
                            onTransferHost(player.id);
                          }}
                          className="btn-cel btn-brawl-neutral btn-sm"
                          title="Pass host mantle to this contender"
                        >
                          <Crown size={12} strokeWidth={2.5} />
                          <span>PASS CROWN</span>
                        </button>
                        <button
                          onClick={() => {
                            onKickPlayer(player.id);
                          }}
                          className="btn-cel btn-brawl-primary btn-sm kick-btn"
                          title={`Dismiss ${player.name} from room`}
                        >
                          <UserX size={13} strokeWidth={2.8} />
                          <span>KICK</span>
                        </button>
                      </div>
                    )}
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
                          ? `Requires at least ${room.minPlayers} players to ring the bell.`
                          : 'Waiting for all contenders to ready up...'}
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
                    <span>START MATCH</span>
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
                    <span>{myPlayerState?.isReady ? 'CANCEL READY' : 'READY TO PLAY'}</span>
                  </button>
                  <span className="waiting-host-hint">
                    Waiting for the host to start the match...
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

      {/* Room Settings Configuration Modal */}
      <RoomSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        room={room}
        isHost={isHost}
        onUpdateSettings={(newSettings, newTitle, isPrivate) => {
          if (onUpdateRoomSettings) {
            onUpdateRoomSettings(newSettings, newTitle, isPrivate);
          }
        }}
      />

      {/* Game Rules Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        gameId={room.gameId}
      />

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        room={room}
      />

      <style>{`
        .lobby-top-left-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .invite-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(180deg, #df3737 0%, #ba2020 100%);
          color: #ffffff !important;
          font-weight: 700;
          box-shadow: 2px 2px 0px var(--color-ink-black);
        }
        .invite-link-btn:hover {
          background: linear-gradient(180deg, #ee4040 0%, #ca2525 100%);
        }
        .summary-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lobby-page-container {
          max-width: 1040px;
          margin: 0 auto;
          padding: 18px 16px 40px;
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
        .lobby-top-right-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .btn-ticket-visibility {
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: 9px;
          box-shadow: var(--shadow-cel-sm);
          height: 38px;
          width: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-main);
          transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.1s ease;
          flex-shrink: 0;
        }
        .btn-ticket-visibility:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-cel-md);
          background-color: var(--color-canvas-parchment);
        }
        .lobby-ticket-hero {
          display: flex;
          align-items: center;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: 9px;
          box-shadow: var(--shadow-cel-sm);
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.08s ease, box-shadow 0.08s ease;
          height: 38px;
        }
        .lobby-ticket-hero:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-cel-md);
        }
        .ticket-value {
          font-family: var(--font-typewriter-elite);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 6px 12px;
          color: var(--color-text-main);
          user-select: none;
        }
        .ticket-value-code {
          display: inline-grid;
          place-items: center;
          position: relative;
        }
        .code-sizer {
          grid-area: 1 / 1;
          visibility: hidden;
          pointer-events: none;
          user-select: none;
        }
        .code-display {
          grid-area: 1 / 1;
          text-align: center;
          white-space: nowrap;
        }
        .ticket-value-share {
          font-family: var(--font-theatre-rye);
          font-size: 13px;
          letter-spacing: 0.08em;
          font-weight: 700;
          color: var(--color-text-main);
        }
        .ticket-copy-action {
          background: none;
          border: none;
          border-left: 1.5px dashed var(--color-ink-stroke);
          padding: 6px 10px;
          color: var(--color-text-main);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          transition: background-color 0.1s ease;
        }
        .ticket-copy-action:hover {
          background-color: rgba(0, 0, 0, 0.06);
        }
        .lobby-grid {
          display: grid;
          grid-template-columns: 1fr 370px;
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
          color: var(--color-text-main);
          margin-top: 2px;
        }
        .game-kind-pill {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.06em;
          background-color: var(--color-golden-buttercup);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 6px;
          padding: 2px 8px;
          color: var(--color-ink-black);
          font-weight: 700;
        }
        .summary-desc {
          font-size: 14px;
          color: var(--color-text-lead);
          line-height: 1.35;
        }
        .summary-meta-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 4px;
        }
        .meta-chip {
          background-color: var(--color-canvas-parchment);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 6px;
          padding: 3px 8px;
          font-family: var(--font-comic-fredoka);
          font-size: 12px;
          color: var(--color-text-main);
        }
        .meta-chip strong {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.04em;
          color: var(--color-cuphead-red);
          margin-right: 3px;
        }
        .roster-card {
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .roster-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid var(--color-ink-stroke);
          padding-bottom: 8px;
        }
        .roster-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .roster-heading {
          font-size: 18px;
          color: var(--color-text-main);
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
          border: var(--border-ink-thin);
          border-radius: 8px;
          padding: 7px 12px;
          box-shadow: var(--shadow-cel-sm);
        }
        .player-is-host {
          background-color: var(--color-parchment-deep);
        }
        .roster-avatar-wrap {
          position: relative;
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 6px;
          background-color: var(--color-golden-buttercup);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .crown-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background-color: var(--color-golden-buttercup);
          color: var(--color-ink-black);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 999px;
          width: 16px;
          height: 16px;
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
        .player-tag {
          font-size: 11.5px;
          font-family: var(--font-comic-fredoka);
          color: var(--color-text-muted);
        }
        .you-tag {
          color: var(--color-cuphead-red);
          font-weight: 600;
        }
        .ready-tag {
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          letter-spacing: 0.06em;
          padding: 1px 6px;
          border-radius: 4px;
          border: 1px solid var(--color-ink-stroke);
          align-self: flex-start;
          display: inline-block;
        }
        .ready-tag-yes {
          background-color: var(--color-status-success-bg);
          color: var(--color-status-success-text);
        }
        .ready-tag-waiting {
          background-color: var(--color-status-warn-bg);
          color: var(--color-status-warn-text);
        }
        .roster-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .kick-btn {
          background-color: var(--color-cuphead-red);
        }
        .roster-footer-controls {
          margin-top: 4px;
          padding-top: 12px;
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
          font-size: 12.5px;
          color: var(--color-cuphead-red);
          font-weight: 600;
        }
        .start-match-btn {
          width: 100%;
          font-size: 16px;
          padding: 11px;
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
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .lobby-right-column {
          height: 100%;
          max-height: 520px;
        }
        @media (max-width: 800px) {
          .lobby-top-bar { flex-direction: column; align-items: stretch; gap: 12px; }
          .lobby-top-left-actions { flex-wrap: wrap; }
          .lobby-top-right-actions { flex-wrap: wrap; }
          .lobby-grid { grid-template-columns: 1fr; }
          .roster-player-item { flex-direction: column; align-items: flex-start; }
          .roster-actions { width: 100%; justify-content: flex-end; }
        }
      `}</style>
    </div>
  );
};
