import React, { useState } from 'react';
import { Search, Plus, Key, Users, Clock, Play } from 'lucide-react';
import { Room, GameId, GameDefinition } from '../types';
import { GAMES_CATALOG } from '../utils/mockData';
import { soundstage } from '../utils/audio';
import { AvatarIcon } from '../utils/avatars';

interface RoomBrowserProps {
  rooms: Room[];
  onCreateRoomClick: () => void;
  onJoinByCodeClick: () => void;
  onJoinRoom: (room: Room) => void;
}

export const RoomBrowser: React.FC<RoomBrowserProps> = ({
  rooms,
  onCreateRoomClick,
  onJoinByCodeClick,
  onJoinRoom,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameFilter, setSelectedGameFilter] = useState<GameId | 'all'>('all');
  const [onlyOpenSlots, setOnlyOpenSlots] = useState(false);

  // Filter public rooms
  const availableRooms = rooms.filter((r) => !r.isPrivate);

  const filteredRooms = availableRooms.filter((room) => {
    // Game filter
    if (selectedGameFilter !== 'all' && room.gameId !== selectedGameFilter) {
      return false;
    }

    // Slots filter
    if (onlyOpenSlots && room.players.length >= room.maxPlayers) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = room.title.toLowerCase().includes(q);
      const matchHost = room.players.some(
        (p) => p.isHost && p.name.toLowerCase().includes(q)
      );
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
          <div className="ribbon-banner">BOARD GAMES</div>
          <h2 className="woodcut-title browser-main-title">PUBLIC ROOMS</h2>
          <p className="browser-main-subtitle">
            Choose an open table to join the game, or create your own room.
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
            <Plus size={20} strokeWidth={3} />
            <span>CREATE ROOM</span>
          </button>
          <button
            onClick={() => {
              soundstage.playTap();
              onJoinByCodeClick();
            }}
            className="btn-cel btn-brawl-neutral browser-cta-btn"
          >
            <Key size={18} strokeWidth={2.8} />
            <span>JOIN BY CODE</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Unified, single-tier controls) */}
      <div className="cel-card browser-filter-toolbar">
        <div className="filter-search-row">
          <div className="search-box-wrap">
            <Search size={20} strokeWidth={2.8} className="search-box-icon" />
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
            <div className="empty-mascot-box">
              <img src="/logo.png" alt="Tablebones Mascot" className="empty-mascot-img" />
            </div>
            <h3 className="empty-title">NO ACTIVE ROOMS FOUND</h3>
            <p className="empty-desc">
              No public rooms match your current filters. Create a new room to start playing!
            </p>
            <button
              onClick={() => {
                soundstage.playTap();
                onCreateRoomClick();
              }}
              className="btn-cel btn-brawl-primary empty-create-btn"
            >
              <Plus size={18} strokeWidth={3} />
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
                  {/* Column 1: Game & Room Title */}
                  <div className="room-row-main">
                    <div className="room-row-badge-line">
                      <span className="room-game-badge">{game ? game.title : 'Board Game'}</span>
                    </div>
                    <h4 className="room-row-title" title={room.title}>{room.title}</h4>
                  </div>

                  {/* Column 2: Host Info */}
                  <div className="room-host-info">
                    <div className="host-avatar-ring">
                      <AvatarIcon id={host ? host.avatarId : 'boxer'} size={32} />
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
                    <div className="spec-item" title="Players in room">
                      <Users size={16} strokeWidth={2.5} />
                      <span>
                        {room.players.length}/{room.maxPlayers}
                      </span>
                      <small className="spec-sub">({openSlots > 0 ? `${openSlots} open` : 'full'})</small>
                    </div>
                    <div className="spec-item" title={room.gameId === 'midnight-alley' ? 'Tournament format' : 'Round timer'}>
                      <Clock size={16} strokeWidth={2.5} />
                      <span>{room.gameId === 'midnight-alley' ? '10 Rounds' : `${room.settings.roundDurationSec}s`}</span>
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
                      className={`btn-cel room-join-btn ${
                        isFull ? 'btn-brawl-neutral' : 'btn-brawl-primary'
                      }`}
                    >
                      <Play size={16} strokeWidth={3} />
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
          max-width: 1240px;
          width: 100%;
          margin: 0 auto;
          padding: 28px 24px 56px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .browser-header-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .browser-header-copy {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .browser-main-title {
          font-size: 38px;
          color: var(--color-ink-black);
          line-height: 1.05;
        }
        .browser-main-subtitle {
          font-size: 16.5px;
          color: var(--color-text-lead);
        }
        .browser-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .browser-cta-btn {
          font-size: 16px;
          padding: 11px 20px;
          gap: 8px;
        }
        .browser-filter-toolbar {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .filter-search-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .search-box-wrap {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-box-icon {
          position: absolute;
          left: 14px;
          color: var(--color-ink-stroke);
          pointer-events: none;
        }
        .search-box-input {
          font-size: 16px;
          padding: 12px 18px 12px 44px;
        }
        .checkbox-filter-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-body);
          font-size: 14.5px;
          font-weight: 700;
          color: var(--color-text-main);
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .ink-checkbox {
          width: 18px;
          height: 18px;
          accent-color: var(--color-cuphead-red);
          cursor: pointer;
        }
        .game-tabs-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .filter-tab {
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thin);
          border-radius: 999px;
          padding: 7px 16px;
          font-family: var(--font-theatre-rye);
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
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
          gap: 12px;
        }
        .rooms-list-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .room-list-row {
          padding: 16px 24px;
          display: grid;
          grid-template-columns: minmax(320px, 1.4fr) minmax(200px, 0.9fr) minmax(180px, 0.9fr) auto;
          align-items: center;
          gap: 24px;
          transition: transform 0.08s ease, box-shadow 0.08s ease;
        }
        .room-list-row:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-cel-lg);
        }
        .room-row-main {
          display: flex;
          flex-direction: column;
          gap: 5px;
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
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          align-self: flex-start;
          padding: 2px 9px;
          background-color: var(--color-parchment-deep);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 5px;
          color: var(--color-text-main);
        }
        .room-row-title {
          font-family: var(--font-luckiest-guy);
          font-size: 22px;
          letter-spacing: 0.02em;
          color: var(--color-text-main);
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .room-host-info {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          overflow: hidden;
        }
        .host-avatar-ring {
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
          line-height: 1.15;
        }
        .host-label {
          font-family: var(--font-theatre-rye);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: var(--color-cuphead-red);
        }
        .host-name {
          font-family: var(--font-luckiest-guy);
          font-size: 16px;
          color: var(--color-text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .room-row-specs {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .spec-item {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: var(--font-typewriter-elite);
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text-main);
          background-color: var(--color-canvas-parchment);
          padding: 6px 12px;
          border-radius: 8px;
          border: 1.5px solid var(--color-ink-stroke);
          white-space: nowrap;
        }
        .spec-sub {
          font-size: 12px;
          font-family: var(--font-theatre-rye);
          opacity: 0.85;
          font-weight: normal;
        }
        .room-row-action {
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
        }
        .room-join-btn {
          min-width: 140px;
          font-size: 15.5px;
          padding: 11px 20px;
          justify-content: center;
          gap: 8px;
        }
        .empty-rooms-slate {
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 14px;
        }
        .empty-mascot-box {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
        }
        .empty-mascot-img {
          width: 90px;
          height: 90px;
          object-fit: contain;
          filter: drop-shadow(3px 3px 0px var(--color-shadow-solid));
        }
        .empty-title {
          font-family: var(--font-luckiest-guy);
          font-size: 24px;
          color: var(--color-text-main);
        }
        .empty-desc {
          max-width: 440px;
          font-size: 15px;
          color: var(--color-text-lead);
          line-height: 1.4;
        }
        .empty-create-btn {
          font-size: 16px;
          padding: 12px 24px;
          gap: 8px;
        }

        @media (max-width: 920px) {
          .browser-header-strip {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
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
            gap: 14px;
          }
          .room-row-main {
            width: 100%;
          }
          .room-host-info {
            width: auto;
          }
          .room-row-specs {
            justify-content: flex-start;
            flex-wrap: wrap;
          }
          .room-row-action {
            width: 100%;
          }
          .room-join-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
