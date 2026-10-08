import React, { useState } from 'react';
import { X, Lock, Globe, Check, Clock, Settings } from 'lucide-react';
import { Room, RoomSettings } from '../types';
import { soundstage } from '../utils/audio';
import { getGameManifest } from '../games';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  isHost: boolean;
  onUpdateSettings: (newSettings: RoomSettings, newTitle?: string, isPrivate?: boolean) => void;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  room,
  isHost,
  onUpdateSettings,
}) => {
  const [roomTitle, setRoomTitle] = useState(room.title);
  const [isPrivate, setIsPrivate] = useState(room.isPrivate);
  const [localSettings, setLocalSettings] = useState<RoomSettings>({ ...room.settings });

  const handleUpdateSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  const manifest = getGameManifest(room.gameId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHost) {
      onClose();
      return;
    }
    soundstage.playTap();
    onUpdateSettings(
      localSettings,
      roomTitle.trim() || room.title,
      isPrivate
    );
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-modal-box room-settings-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header matching CreateRoomModal */}
        <div className="modal-header-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="toggle-icon-wrap" style={{ width: '42px', height: '42px' }}>
              <Settings size={24} strokeWidth={2.8} />
            </div>
            <div>
              <span className="ribbon-banner">ROOM CONFIGURATION</span>
              <h2 className="woodcut-title modal-title">GAME SETTINGS</h2>
            </div>
          </div>
          <button onClick={onClose} className="btn-cel btn-brawl-neutral btn-icon-sq" aria-label="Close">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-room-form">
          {!isHost && (
            <div className="host-only-notice">
              ⚠️ <strong>OBSERVER MODE:</strong> Only the room host can modify these settings. You can review the active configuration below.
            </div>
          )}

          {/* Room Title */}
          <div className="form-group">
            <label className="group-label">1. ROOM NAME</label>
            <input
              type="text"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              disabled={!isHost}
              maxLength={36}
              required
              className="ink-input room-title-input"
              placeholder="E.g. Barnaby’s Ring..."
            />
          </div>

          {/* Privacy Toggle matching CreateRoomModal cards */}
          <div className="form-group">
            <label className="group-label">2. ROOM ACCESS</label>
            <div className="privacy-toggle-grid">
              <button
                type="button"
                disabled={!isHost}
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
                disabled={!isHost}
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

          {/* Game-specific custom options */}
          {manifest?.settingsComponent && (
            <manifest.settingsComponent
              settings={localSettings}
              onUpdateSetting={handleUpdateSetting}
              isHost={isHost}
              stepOffset={3}
            />
          )}

          {/* Round Duration */}
          {manifest?.hasRoundTimer !== false && (
            <div className="form-group">
              <label className="group-label">
                {manifest?.settingsComponent ? '5.' : '3.'} ROUND DURATION
              </label>
              <div className="clock-options-row">
                {[60, 120, 180, 240].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    disabled={!isHost}
                    onClick={() => {
                      soundstage.playTap();
                      handleUpdateSetting('roundDurationSec', dur);
                    }}
                    className={`duration-chip ${localSettings.roundDurationSec === dur ? 'duration-selected' : ''}`}
                  >
                    <Clock size={16} strokeWidth={2.5} />
                    <span>{dur / 60} MIN</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="settings-actions-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-cel btn-brawl-neutral btn-sm"
            >
              <span>{isHost ? 'CANCEL' : 'CLOSE'}</span>
            </button>
            {isHost && (
              <button
                type="submit"
                className="btn-cel btn-brawl-primary btn-sm save-settings-btn"
              >
                <Check size={18} strokeWidth={3} />
                <span>SAVE CHANGES</span>
              </button>
            )}
          </div>
        </form>

        <style>{`
          .room-settings-modal-box {
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
          .host-only-notice {
            background-color: var(--color-status-warn-bg);
            color: var(--color-status-warn-text);
            border: 2px solid var(--color-ink-stroke);
            padding: 12px 16px;
            border-radius: 8px;
            font-family: var(--font-comic-fredoka);
            font-size: 13.5px;
            line-height: 1.4;
            box-shadow: var(--shadow-cel-sm);
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
          .privacy-toggle-card:hover:not(:disabled) {
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
          .duration-chip:hover:not(:disabled) {
            transform: translateY(-2px);
          }
          .duration-selected {
            background-color: var(--color-cuphead-red);
            color: var(--color-glove-ivory);
            border-color: var(--color-ink-stroke);
          }
          .settings-actions-footer {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 12px;
            margin-top: 8px;
            padding-top: 18px;
            border-top: var(--border-ink-standard);
          }
          .save-settings-btn {
            font-size: 15px;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          @media (max-width: 680px) {
            .privacy-toggle-grid { grid-template-columns: 1fr; }
            .clock-options-row { flex-wrap: wrap; }
          }
        `}</style>
      </div>
    </div>
  );
};
