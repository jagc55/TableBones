import React, { useState } from 'react';
import { X, Lock, Globe, Plus, Check, Clock } from 'lucide-react';
import { GameId, Room, UserProfile } from '../types';
import { GAMES_CATALOG } from '../utils/mockData';
import { soundstage } from '../utils/audio';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCreateRoom: (roomData: Omit<Room, 'id' | 'createdAt'>) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateRoom,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<GameId>('vortilex');
  const [roomTitle, setRoomTitle] = useState(`${currentUser.name}’s Room`);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roundDurationSec, setRoundDurationSec] = useState(120);

  if (!isOpen) return null;

  const selectedGame = GAMES_CATALOG.find((g) => g.id === selectedGameId) || GAMES_CATALOG[0];

  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TB-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundstage.playRoundBell();

    const newRoom: Omit<Room, 'id' | 'createdAt'> = {
      code: generateRoomCode(),
      title: roomTitle.trim() || `${currentUser.name}’s Room`,
      gameId: selectedGameId,
      isPrivate,
      minPlayers: selectedGame.minPlayers,
      maxPlayers: selectedGame.maxPlayers,
      status: 'waiting',
      hostId: currentUser.id,
      players: [
        {
          id: currentUser.id,
          name: currentUser.name,
          avatarId: currentUser.avatarId,
          isHost: true,
          isReady: true,
          score: 0,
        },
      ],
      settings: {
        roundDurationSec,
        turnTimeLimitSec: 30,
        dictionaryLang: 'en',
      },
    };

    onCreateRoom(newRoom);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header-strip">
          <div>
            <span className="ribbon-banner">ROOM SETUP</span>
            <h2 className="woodcut-title modal-title">CREATE NEW ROOM</h2>
          </div>
          <button onClick={onClose} className="btn-cel btn-brawl-neutral btn-icon-sq" aria-label="Close">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-room-form">
          {/* Step 1: Select Game */}
          <div className="form-group">
            <label className="group-label">1. CHOOSE GAME</label>
            <div className="game-selection-grid">
              {GAMES_CATALOG.map((game) => {
                const isSelected = game.id === selectedGameId;
                return (
                  <div
                    key={game.id}
                    onClick={() => {
                      soundstage.playTap();
                      setSelectedGameId(game.id);
                    }}
                    className={`game-card-option ${isSelected ? 'game-card-selected' : ''}`}
                  >
                    <div className="game-card-top">
                      <span className="game-opt-title">{game.title}</span>
                      {isSelected && (
                        <div className="game-check-bubble">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="game-opt-desc">{game.description}</p>
                    <div className="game-opt-footer">
                      <span>{game.minPlayers}–{game.maxPlayers} Players</span>
                      <span>~{game.estimatedTimeMin} min</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Room Name */}
          <div className="form-group">
            <label className="group-label">2. ROOM NAME</label>
            <input
              type="text"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              className="ink-input room-title-input"
              maxLength={36}
              required
              placeholder="E.g. Casual Friday Game"
            />
          </div>

          {/* Step 3: Visibility */}
          <div className="form-group">
            <label className="group-label">3. ROOM ACCESS</label>
            <div className="privacy-toggle-grid">
              <button
                type="button"
                onClick={() => {
                  soundstage.playTap();
                  setIsPrivate(false);
                }}
                className={`privacy-toggle-card ${!isPrivate ? 'toggle-active' : ''}`}
              >
                <div className="toggle-icon-wrap">
                  <Globe size={22} strokeWidth={2.8} />
                </div>
                <div className="toggle-info">
                  <strong className="toggle-name">PUBLIC ROOM</strong>
                  <span className="toggle-desc">Listed on the public rooms board for any player to join.</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundstage.playTap();
                  setIsPrivate(true);
                }}
                className={`privacy-toggle-card ${isPrivate ? 'toggle-active' : ''}`}
              >
                <div className="toggle-icon-wrap icon-private">
                  <Lock size={22} strokeWidth={2.8} />
                </div>
                <div className="toggle-info">
                  <strong className="toggle-name">PRIVATE ROOM</strong>
                  <span className="toggle-desc">Hidden from the public browser. Requires room code to enter.</span>
                </div>
              </button>
            </div>
          </div>

          {/* Step 4: Round Duration (Hidden for round-based games like Midnight Alley) */}
          {selectedGameId !== 'midnight-alley' && (
            <div className="form-group">
              <label className="group-label">4. ROUND DURATION</label>
              <div className="clock-options-row">
                {[60, 120, 180, 240].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => {
                      soundstage.playTap();
                      setRoundDurationSec(dur);
                    }}
                    className={`duration-chip ${roundDurationSec === dur ? 'duration-selected' : ''}`}
                  >
                    <Clock size={16} strokeWidth={2.5} />
                    <span>{dur / 60} MIN</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="create-actions-footer">
            <button
              type="submit"
              className="btn-cel btn-brawl-primary create-submit-btn"
            >
              <Plus size={20} strokeWidth={3} />
              <span>CREATE ROOM & ENTER LOBBY</span>
            </button>
          </div>
        </form>

        <style>{`
          .create-modal-box {
            max-width: 820px;
            width: 95vw;
          }
          .modal-header-strip {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 24px 14px;
            border-bottom: var(--border-ink-standard);
            background-color: var(--color-parchment-deep);
          }
          .modal-title {
            font-size: 28px;
            color: var(--color-text-main);
            margin-top: 2px;
          }
          .create-room-form {
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            max-height: 82vh;
            overflow-y: auto;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .group-label {
            font-family: var(--font-theatre-rye);
            font-size: 13.5px;
            font-weight: 800;
            letter-spacing: 0.06em;
            color: var(--color-text-main);
          }
          .room-title-input {
            font-size: 16px;
            padding: 12px 16px;
          }
          .game-selection-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .game-card-option {
            background-color: var(--color-glove-ivory);
            border: var(--border-ink-thin);
            border-radius: 10px;
            padding: 14px 16px;
            cursor: pointer;
            box-shadow: var(--shadow-cel-sm);
            transition: transform 0.08s ease;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .game-card-option:hover {
            transform: translateY(-2px);
          }
          .game-card-selected {
            background-color: var(--color-golden-buttercup);
            border: var(--border-ink-standard);
            border-color: var(--color-cuphead-red);
            box-shadow: 0 0 0 2px var(--color-cuphead-red);
          }
          .game-card-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }
          .game-opt-title {
            font-family: var(--font-luckiest-guy);
            font-size: 17.5px;
            color: var(--color-text-main);
            line-height: 1.2;
          }
          .game-card-selected .game-opt-title {
            color: var(--color-ink-black);
          }
          .game-check-bubble {
            background-color: var(--color-cuphead-red);
            color: var(--color-glove-ivory);
            border-radius: 999px;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .game-opt-desc {
            font-size: 14px;
            color: var(--color-text-lead);
            line-height: 1.4;
            flex: 1;
          }
          .game-card-selected .game-opt-desc {
            color: var(--color-ink-stroke);
          }
          .game-opt-footer {
            display: flex;
            justify-content: space-between;
            font-family: var(--font-typewriter-elite);
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-muted);
            border-top: 1px dashed var(--color-ink-stroke);
            padding-top: 6px;
          }
          .privacy-toggle-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .privacy-toggle-card {
            background-color: var(--color-glove-ivory);
            border: var(--border-ink-thin);
            border-radius: 10px;
            padding: 14px 16px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            cursor: pointer;
            text-align: left;
            box-shadow: var(--shadow-cel-sm);
            transition: transform 0.08s ease;
          }
          .privacy-toggle-card:hover {
            transform: translateY(-2px);
          }
          .privacy-toggle-card.toggle-active {
            background-color: var(--color-golden-buttercup);
            border: var(--border-ink-standard);
            border-color: var(--color-ink-stroke);
          }
          .toggle-icon-wrap {
            background-color: var(--color-parchment-deep);
            border: 1.5px solid var(--color-ink-stroke);
            border-radius: 8px;
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: var(--color-ink-black);
          }
          .icon-private {
            color: var(--color-cuphead-red);
          }
          .toggle-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .toggle-name {
            font-family: var(--font-luckiest-guy);
            font-size: 16px;
            color: var(--color-text-main);
          }
          .privacy-toggle-card.toggle-active .toggle-name {
            color: var(--color-ink-black);
          }
          .toggle-desc {
            font-size: 13.5px;
            color: var(--color-text-lead);
            line-height: 1.35;
          }
          .privacy-toggle-card.toggle-active .toggle-desc {
            color: var(--color-ink-stroke);
          }
          .clock-options-row {
            display: flex;
            gap: 10px;
          }
          .duration-chip {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 14px;
            background-color: var(--color-glove-ivory);
            border: var(--border-ink-thin);
            border-radius: 8px;
            font-family: var(--font-theatre-rye);
            font-size: 14px;
            font-weight: 700;
            color: var(--color-text-main);
            cursor: pointer;
            transition: transform 0.08s ease;
          }
          .duration-chip:hover {
            transform: translateY(-2px);
          }
          .duration-selected {
            background-color: var(--color-cuphead-red);
            color: var(--color-glove-ivory);
            border-color: var(--color-ink-stroke);
          }
          .create-actions-footer {
            margin-top: 6px;
          }
          .create-submit-btn {
            width: 100%;
            font-size: 17px;
            padding: 14px 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          @media (max-width: 680px) {
            .game-selection-grid { grid-template-columns: 1fr; }
            .privacy-toggle-grid { grid-template-columns: 1fr; }
            .clock-options-row { flex-wrap: wrap; }
          }
        `}</style>
      </div>
    </div>
  );
};
