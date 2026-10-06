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

  // Only show public rooms that are waiting for players (in-progress games are removed from the list)
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
      {/* Hero Callout */}
      <div className="browser-hero-card cel-card-gold">
        <div className="hero-content">
          <span className="ribbon-banner">ONLINE BOARD GAMES</span>
          <h2 className="woodcut-title browser-hero-heading">PUBLIC ROOMS</h2>
          <p className="browser-hero-lead">
            Browse available game rooms, join an active lobby, or create a private room to play with friends.
          </p>
        </div>

        <div className="hero-cta-group">
          <button
            onClick={() => {
              soundstage.playTap();
              onCreateRoomClick();
            }}
            className="btn-cel btn-brawl-primary hero-main-btn"
          >
            <Plus size={18} strokeWidth={3} />
            <span>CREATE ROOM</span>
          </button>
          <button
            onClick={() => {
              soundstage.playTap();
              onJoinByCodeClick();
            }}
            className="btn-cel btn-brawl-neutral"
          >
            <Key size={16} strokeWidth={2.8} />
            <span>JOIN WITH CODE</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="cel-card browser-filter-bar">
        <div className="filter-row-top">
          {/* Search Box */}
          <div className="search-box-wrap">
            <Search size={18} strokeWidth={2.8} className="search-box-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by room name, game, or host..."
              className="ink-input search-box-input"
            />
          </div>

          {/* Game Selector Dropdown */}
          <div className="filter-select-wrap">
            <select
              value={selectedGameFilter}
              onChange={(e) => {
                soundstage.playTap();
                setSelectedGameFilter(e.target.value as GameId | 'all');
              }}
              className="ink-select"
            >
              <option value="all">All Games ({availableRooms.length})</option>
              {GAMES_CATALOG.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Badges & Toggle */}
        <div className="filter-row-bottom">
          <div className="game-tabs-pills">
            <button
              onClick={() => {
                soundstage.playTap();
                setSelectedGameFilter('all');
              }}
              className={`filter-pill ${selectedGameFilter === 'all' ? 'pill-active' : ''}`}
            >
              All
            </button>
            {GAMES_CATALOG.map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  soundstage.playTap();
                  setSelectedGameFilter(game.id);
                }}
                className={`filter-pill ${selectedGameFilter === game.id ? 'pill-active' : ''}`}
              >
                {game.title.split(':')[0]}
              </button>
            ))}
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
      </div>

      {/* Rooms List (Vertical List View) */}
      <div className="rooms-catalog-section">
        <div className="catalog-header">
          <h3 className="section-title">AVAILABLE ROOMS ({filteredRooms.length})</h3>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="cel-card empty-rooms-slate">
            <div className="empty-icon-box">
              <Users size={32} strokeWidth={2.5} />
            </div>
            <h3 className="empty-title">NO ROOMS FOUND</h3>
            <p className="empty-desc">
              No active public rooms match your current filters. Create a new room to start playing!
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

              return (
                <div key={room.id} className="cel-card room-list-row">
                  {/* Column 1: Game & Room Title (Reserved Slot) */}
                  <div className="room-row-main">
                    <div className="room-row-badge-line">
                      <span className="room-game-badge">{game ? game.title : 'Board Game'}</span>
                      <div className="room-status-chip status-waiting">
                        OPEN LOBBY
                      </div>
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
                    <div className="spec-item" title="Players in room">
                      <Users size={14} strokeWidth={2.5} />
                      <span>
                        {room.players.length}/{room.maxPlayers}
                      </span>
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
                      <span>{isFull ? 'ROOM FULL' : 'JOIN GAME'}</span>
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
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px 16px 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .browser-hero-card {
          padding: 20px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .hero-content {
          max-width: 620px;
        }
        .browser-hero-heading {
          font-size: 32px;
          color: #1c1511;
          margin: 4px 0 6px;
        }
        .browser-hero-lead {
          font-size: 15px;
          color: #2b1e17;
          line-height: 1.35;
        }
        .hero-cta-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }
        .hero-main-btn {
          font-size: 17px;
          padding: 10px 20px;
        }
        .browser-filter-bar {
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .filter-row-top {
          display: flex;
          gap: 10px;
          align-items: center;
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
          color: var(--color-ink-black);
          pointer-events: none;
        }
        .search-box-input {
          padding-left: 38px;
        }
        .filter-select-wrap {
          min-width: 190px;
        }
        .filter-row-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 6px;
          border-top: 1.5px dashed var(--color-ink-black);
        }
        .game-tabs-pills {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .filter-pill {
          background-color: var(--color-parchment-deep);
          border: 1.5px solid var(--color-ink-black);
          border-radius: 999px;
          padding: 3px 10px;
          font-family: var(--font-theatre-rye);
          font-size: 11px;
          letter-spacing: 0.05em;
          color: var(--color-ink-black);
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 1.5px 1.5px 0 var(--color-ink-black);
        }
        .filter-pill.pill-active {
          background-color: var(--color-cuphead-red);
          color: var(--color-glove-ivory);
        }
        .checkbox-filter-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-comic-fredoka);
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
        }
        .ink-checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--color-cuphead-red);
          cursor: pointer;
        }
        .rooms-catalog-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .section-title {
          font-family: var(--font-luckiest-guy);
          font-size: 20px;
          letter-spacing: 0.04em;
          color: var(--color-ink-black);
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
          padding: 1px 6px;
          background-color: var(--color-parchment-deep);
          border: 1px solid var(--color-ink-black);
          border-radius: 4px;
          color: var(--color-ink-black);
        }
        .room-status-chip {
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          letter-spacing: 0.06em;
          padding: 1px 6px;
          border-radius: 999px;
          border: 1px solid var(--color-ink-black);
        }
        .status-waiting {
          background-color: #d4edd2;
          color: #1f5e1f;
        }
        .status-live {
          background-color: #fcdbd8;
          color: var(--color-cuphead-red);
        }
        .room-row-title {
          font-family: var(--font-luckiest-guy);
          font-size: 18px;
          letter-spacing: 0.03em;
          color: var(--color-ink-black);
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
          border: 1.5px solid var(--color-ink-black);
          border-radius: 6px;
          overflow: hidden;
          background-color: var(--color-golden-buttercup);
          flex-shrink: 0;
        }
        .host-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .host-label {
          font-family: var(--font-theatre-rye);
          font-size: 8px;
          letter-spacing: 0.06em;
          color: var(--color-cuphead-red);
          line-height: 1;
        }
        .host-name {
          font-family: var(--font-luckiest-guy);
          font-size: 13px;
          color: var(--color-ink-black);
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
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-main);
          background-color: var(--color-canvas-parchment);
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--color-ink-stroke);
          white-space: nowrap;
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
          border: 2px solid var(--color-ink-black);
          border-radius: 12px;
          padding: 12px;
        }
        .empty-title {
          font-family: var(--font-luckiest-guy);
          font-size: 20px;
          color: var(--color-ink-black);
        }
        .empty-desc {
          max-width: 380px;
          font-size: 13.5px;
          color: #655444;
        }

        @media (max-width: 840px) {
          .browser-hero-card { flex-direction: column; text-align: center; }
          .hero-cta-group { flex-direction: row; }
          .filter-row-top { flex-direction: column; }
          .filter-select-wrap { width: 100%; }
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
