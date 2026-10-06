import React, { useState } from 'react';
import { Search, Plus, Key, Users, Play, Clock } from 'lucide-react';
import { Room, GameDefinition, GameId } from '../types';
import { GAMES_CATALOG } from '../utils/mockData';
import { AvatarIcon } from '../utils/avatars';
import { soundstage } from '../utils/audio';

interface RoomBrowserProps {
  rooms: Room[];
  onJoinRoom: (room: Room) => void;
  onCreateRoomClick: () => void;
  onJoinByCodeClick: () => void;
}

export const RoomBrowser: React.FC<RoomBrowserProps> = ({
  rooms,
  onJoinRoom,
  onCreateRoomClick,
  onJoinByCodeClick,
}) => {
  const [selectedGameFilter, setSelectedGameFilter] = useState<GameId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyOpenSlots, setOnlyOpenSlots] = useState(false);

  // Only show public rooms that are waiting for players
  const availableRooms = rooms.filter((r) => !r.isPrivate && r.status === 'waiting');

  const filteredRooms = availableRooms.filter((room) => {
    if (selectedGameFilter !== 'all' && room.gameId !== selectedGameFilter) {
      return false;
    }
    if (onlyOpenSlots && room.players.length >= room.maxPlayers) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = room.title.toLowerCase().includes(q);
      const host = room.players.find((p) => p.isHost);
      const matchHost = host ? host.name.toLowerCase().includes(q) : false;
      const gameDef = GAMES_CATALOG.find((g) => g.id === room.gameId);
      const matchGame = gameDef ? gameDef.title.toLowerCase().includes(q) : false;
      return matchTitle || matchHost || matchGame;
    }
    return true;
  });

  const getGameDef = (id: GameId): GameDefinition | undefined => {
    return GAMES_CATALOG.find((g) => g.id === id);
  };

  return (
    <div className="room-browser-layout">
      {/* Top Header & Primary Actions */}
      <div className="browser-header-strip">
        <div className="browser-header-copy">
          <div className="ribbon-banner">PARLOR TABLES</div>
          <h2 className="woodcut-title browser-main-title">PUBLIC ROOMS</h2>
          <p className="browser-main-subtitle">
            Choose an open table to join the bout, or open your own parlor room.
          </p>
        </div>

        <div className="browser-header-actions">
          <button
            onClick={() => {
              soundstage.playTap();
              onCreateRoomClick();
            }}
            className="btn-cel btn-brawl-primary browser-cta-btn"
          >
            <Plus size={18} strokeWidth={3} />
            <span>CREATE ROOM</span>
          </button>
          <button
            onClick={() => {
              soundstage.playTap();
              onJoinByCodeClick();
            }}
            className="btn-cel btn-brawl-neutral browser-cta-btn"
          >
            <Key size={16} strokeWidth={2.8} />
            <span>JOIN BY CODE</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Unified, single-tier controls) */}
      <div className="cel-card browser-filter-toolbar">
        <div className="filter-search-row">
          <div className="search-box-wrap">
            <Search size={18} strokeWidth={2.8} className="search-box-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by room name, game, or host..."
              className="ink-input search-box-input"
            />
          </div>

          <label className="checkbox-filter-label">
            <input
              type="checkbox"
              checked={onlyOpenSlots}
              onChange={(e) => setOnlyOpenSlots(e.target.checked)}
              className="ink-checkbox"
            />
            <span>Open spots only</span>
          </label>
        </div>

        {/* Game Filter Tabs */}
        <div className="game-tabs-row">
          <button
            onClick={() => {
              soundstage.playTap();
              setSelectedGameFilter('all');
            }}
            className={`filter-tab ${selectedGameFilter === 'all' ? 'tab-active' : ''}`}
          >
            All Games ({availableRooms.length})
          </button>
          {GAMES_CATALOG.map((game) => {
            const count = availableRooms.filter((r) => r.gameId === game.id).length;
            return (
              <button
                key={game.id}
                onClick={() => {
                  soundstage.playTap();
                  setSelectedGameFilter(game.id);
                }}
                className={`filter-tab ${selectedGameFilter === game.id ? 'tab-active' : ''}`}
              >
                {game.title.split(':')[0]} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rooms List */}
      <div className="rooms-catalog-section">
        {filteredRooms.length === 0 ? (
          <div className="cel-card empty-rooms-slate">
            <div className="empty-icon-box">
              <Users size={32} strokeWidth={2.5} />
            </div>
            <h3 className="empty-title">NO ACTIVE PARLORS FOUND</h3>
            <p className="empty-desc">
              No public tables match your current filters. Open a new room and invite contenders to start the match!
            </p>
            <button
              onClick={() => {
                soundstage.playTap();
                onCreateRoomClick();
              }}
              className="btn-cel btn-brawl-primary"
            >
              <Plus size={16} strokeWidth={3} />
              <span>CREATE A ROOM</span>
            </button>
          </div>
        ) : (
          <div className="rooms-list-container">
            {filteredRooms.map((room) => {
              const game = getGameDef(room.gameId);
              const host = room.players.find((p) => p.isHost) || room.players[0];
              const isFull = room.players.length >= room.maxPlayers;
              const openSlots = room.maxPlayers - room.players.length;

              return (
                <div key={room.id} className="cel-card room-list-row">
                  {/* Column 1: Game & Room Title (Reserved Slot) */}
                  <div className="room-row-main">
                    <div className="room-row-badge-line">
                      <span className="room-game-badge">{game ? game.title : 'Board Game'}</span>
                    </div>
                    <h4 className="room-row-title" title={room.title}>{room.title}</h4>
                  </div>

                  {/* Column 2: Host Info (Reserved Slot) */}
                  <div className="room-host-info">
                    <div className="host-avatar-ring">
                      <AvatarIcon id={host ? host.avatarId : 'boxer'} size={24} />
                    </div>
                    <div className="host-text">
                      <span className="host-label">HOST</span>
                      <strong className="host-name" title={host ? host.name : 'Unknown'}>
                        {host ? host.name : 'Unknown'}
                      </strong>
                    </div>
                  </div>

                  {/* Column 3: Specs (Players & Round Timer) */}
                  <div className="room-row-specs">
                    <div className="spec-item" title="Contenders in room">
                      <Users size={14} strokeWidth={2.5} />
                      <span>
                        {room.players.length}/{room.maxPlayers}
                      </span>
                      <small className="spec-sub">({openSlots > 0 ? `${openSlots} open` : 'full'})</small>
                    </div>
                    <div className="spec-item" title="Round timer">
                      <Clock size={14} strokeWidth={2.5} />
                      <span>{room.settings.roundDurationSec}s</span>
                    </div>
                  </div>

                  {/* Column 4: Action Button */}
                  <div className="room-row-action">
                    <button
                      onClick={() => {
                        soundstage.playTap();
                        onJoinRoom(room);
                      }}
                      disabled={isFull}
                      className={`btn-cel btn-sm ${
                        isFull ? 'btn-brawl-neutral' : 'btn-brawl-primary'
                      }`}
                    >
                      <Play size={14} strokeWidth={3} />
                      <span>{isFull ? 'ROOM FULL' : 'JOIN TABLE'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .room-browser-layout {
          max-width: 1040px;
          margin: 0 auto;
          padding: 24px 16px 48px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .browser-header-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .browser-header-copy {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .browser-main-title {
          font-size: 32px;
          color: var(--color-ink-black);
          line-height: 1;
        }
        .browser-main-subtitle {
          font-size: 14.5px;
          color: var(--color-text-lead);
        }
        .browser-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .browser-cta-btn {
          font-size: 15px;
          padding: 9px 16px;
        }
        .browser-filter-toolbar {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .filter-search-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .search-box-wrap {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-box-icon {
          position: absolute;
          left: 12px;
          color: var(--color-ink-stroke);
          pointer-events: none;
        }
        .search-box-input {
          padding-left: 38px;
        }
        .checkbox-filter-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-comic-fredoka);
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-main);
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .ink-checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--color-cuphead-red);
          cursor: pointer;
        }
        .game-tabs-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .filter-tab {
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thin);
          border-radius: 999px;
          padding: 4px 12px;
          font-family: var(--font-theatre-rye);
          font-size: 11px;
          letter-spacing: 0.05em;
          color: var(--color-ink-black);
          cursor: pointer;
          white-space: nowrap;
          box-shadow: var(--shadow-cel-sm);
          transition: transform 0.08s ease, background-color 0.1s ease;
        }
        .filter-tab:hover {
          transform: translateY(-1px);
        }
        .filter-tab.tab-active {
          background-color: var(--color-cuphead-red);
          color: var(--color-glove-ivory);
          border-color: var(--color-ink-stroke);
        }
        .rooms-catalog-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .rooms-list-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .room-list-row {
          padding: 12px 18px;
          display: grid;
          grid-template-columns: 280px 165px 1fr auto;
          align-items: center;
          gap: 20px;
          transition: transform 0.08s ease, box-shadow 0.08s ease;
        }
        .room-list-row:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-cel-lg);
        }
        .room-row-main {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 280px;
          min-width: 0;
          overflow: hidden;
        }
        .room-row-badge-line {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .room-game-badge {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.06em;
          align-self: flex-start;
          padding: 1px 7px;
          background-color: var(--color-parchment-deep);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 4px;
          color: var(--color-text-main);
        }
        .room-row-title {
          font-family: var(--font-luckiest-guy);
          font-size: 18px;
          letter-spacing: 0.03em;
          color: var(--color-text-main);
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .room-host-info {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 165px;
          min-width: 0;
          overflow: hidden;
        }
        .host-avatar-ring {
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 6px;
          overflow: hidden;
          background-color: var(--color-golden-buttercup);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .host-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
          line-height: 1.1;
        }
        .host-label {
          font-family: var(--font-theatre-rye);
          font-size: 8px;
          letter-spacing: 0.06em;
          color: var(--color-cuphead-red);
        }
        .host-name {
          font-family: var(--font-luckiest-guy);
          font-size: 13px;
          color: var(--color-text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .room-row-specs {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .spec-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-typewriter-elite);
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-text-main);
          background-color: var(--color-canvas-parchment);
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--color-ink-stroke);
          white-space: nowrap;
        }
        .spec-sub {
          font-size: 10px;
          font-family: var(--font-theatre-rye);
          opacity: 0.8;
          font-weight: normal;
        }
        .room-row-action {
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
        }
        .room-row-action .btn-cel {
          min-width: 125px;
          justify-content: center;
        }
        .empty-rooms-slate {
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
        }
        .empty-icon-box {
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thin);
          border-radius: 12px;
          padding: 12px;
          color: var(--color-ink-black);
        }
        .empty-title {
          font-family: var(--font-luckiest-guy);
          font-size: 20px;
          color: var(--color-text-main);
        }
        .empty-desc {
          max-width: 380px;
          font-size: 13.5px;
          color: var(--color-text-lead);
        }

        @media (max-width: 840px) {
          .browser-header-strip {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .browser-header-actions {
            justify-content: flex-start;
          }
          .filter-search-row {
            flex-direction: column;
            align-items: stretch;
          }
          .room-list-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .room-row-main {
            width: 100%;
          }
          .room-host-info {
            width: auto;
          }
          .room-row-specs {
            justify-content: flex-start;
          }
          .room-row-action {
            width: 100%;
          }
          .room-row-action .btn-cel {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
