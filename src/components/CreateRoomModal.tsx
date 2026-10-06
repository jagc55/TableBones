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
            <span className="ribbon-banner">PARLOR SETUP</span>
            <h2 className="woodcut-title modal-title">OPEN NEW TABLE</h2>
          </div>
          <button onClick={onClose} className="btn-cel btn-brawl-neutral btn-icon-sq" aria-label="Close">
            <X size={18} strokeWidth={3} />
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
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className="game-opt-desc">{game.description}</p>
                    <div className="game-opt-footer">
                      <span>{game.minPlayers}–{game.maxPlayers} Players</span>
                      <span>~{game.estimatedTimeMin}m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Room Name */}
          <div className="form-group">
            <label className="group-label">2. TABLE NAME</label>
            <input
              type="text"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              className="ink-input"
              maxLength={36}
              required
              placeholder="E.g. Casual Friday Game"
            />
          </div>

          {/* Step 3: Visibility */}
          <div className="form-group">
            <label className="group-label">3. PARLOR ACCESS</label>
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
                  <Globe size={18} strokeWidth={2.8} />
                </div>
                <div className="toggle-info">
                  <strong className="toggle-name">PUBLIC TABLE</strong>
                  <span className="toggle-desc">Listed on the main parlor board for any contender to join.</span>
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
                  <Lock size={18} strokeWidth={2.8} />
                </div>
                <div className="toggle-info">
                  <strong className="toggle-name">PRIVATE TABLE</strong>
                  <span className="toggle-desc">Hidden from the public browser. Requires code ticket to enter.</span>
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
                    <Clock size={13} strokeWidth={2.5} />
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
              <Plus size={18} strokeWidth={3} />
              <span>CREATE TABLE & ENTER LOBBY</span>
            </button>
          </div>
        </form>

        <style>{`
          .create-modal-box {
            max-width: 600px;
          }
          .modal-header-strip {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 18px 10px;
            border-bottom: var(--border-ink-standard);
            background-color: var(--color-parchment-deep);
          }
          .modal-title {
            font-size: 22px;
            color: var(--color-text-main);
          }
          .create-room-form {
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .group-label {
            font-family: var(--font-theatre-rye);
            font-size: 10px;
            letter-spacing: 0.08em;
            color: var(--color-text-main);
          }
          .game-selection-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .game-card-option {
            background-color: var(--color-glove-ivory);
            border: var(--border-ink-thin);
            border-radius: 9px;
            padding: 9px 11px;
            cursor: pointer;
            box-shadow: var(--shadow-cel-sm);
            transition: transform 0.08s ease;
            display: flex;
            flex-direction: column;
            gap: 4px;
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
          }
          .game-opt-title {
            font-family: var(--font-luckiest-guy);
            font-size: 14px;
            color: var(--color-text-main);
          }
          .game-card-selected .game-opt-title {
            color: var(--color-ink-black);
          }
          .game-check-bubble {
            background-color: var(--color-cuphead-red);
            color: var(--color-glove-ivory);
            border-radius: 999px;
            width: 15px;
            height: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .game-opt-desc {
            font-size: 11.5px;
            color: var(--color-text-lead);
            line-height: 1.25;
            flex: 1;
          }
          .game-card-selected .game-opt-desc {
            color: var(--color-ink-stroke);
          }
          .game-opt-footer {
            display: flex;
            justify-content: space-between;
            font-family: var(--font-typewriter-elite);
            font-size: 9.5px;
            color: var(--color-text-muted);
            border-top: 1px dashed var(--color-ink-stroke);
            padding-top: 3px;
          }
          .privacy-toggle-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .privacy-toggle-card {
            background-color: var(--color-glove-ivory);
            border: var(--border-ink-thin);
            border-radius: 9px;
            padding: 9px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            cursor: pointer;
            text-align: left;
            box-shadow: var(--shadow-cel-sm);
          }
          .privacy-toggle-card.toggle-active {
            background-color: var(--color-golden-buttercup);
            border: var(--border-ink-standard);
            border-color: var(--color-ink-stroke);
          }
          .toggle-icon-wrap {
            background-color: var(--color-parchment-deep);
            border: 1.5px solid var(--color-ink-stroke);
            border-radius: 6px;
            width: 30px;
            height: 30px;
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
          }
          .toggle-name {
            font-family: var(--font-luckiest-guy);
            font-size: 13px;
            color: var(--color-text-main);
          }
          .privacy-toggle-card.toggle-active .toggle-name {
            color: var(--color-ink-black);
          }
          .toggle-desc {
            font-size: 11px;
            color: var(--color-text-lead);
            line-height: 1.2;
          }
          .privacy-toggle-card.toggle-active .toggle-desc {
            color: var(--color-ink-stroke);
          }
          .clock-options-row {
            display: flex;
            gap: 8px;
          }
          .duration-chip {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 7px;
            background-color: var(--color-glove-ivory);
            border: var(--border-ink-thin);
            border-radius: 7px;
            font-family: var(--font-theatre-rye);
            font-size: 11px;
            color: var(--color-text-main);
            cursor: pointer;
          }
          .duration-selected {
            background-color: var(--color-cuphead-red);
            color: var(--color-glove-ivory);
            border-color: var(--color-ink-stroke);
          }
          .create-actions-footer {
            margin-top: 4px;
          }
          .create-submit-btn {
            width: 100%;
            font-size: 15.5px;
            padding: 11px;
          }

          @media (max-width: 600px) {
            .game-selection-grid { grid-template-columns: 1fr; }
            .privacy-toggle-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </div>
    </div>
  );
};
