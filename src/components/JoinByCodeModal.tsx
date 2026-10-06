import React, { useState } from 'react';
import { X, Key, ArrowRight, AlertTriangle } from 'lucide-react';
import { Room } from '../types';
import { soundstage } from '../utils/audio';

interface JoinByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  onJoinSuccess: (room: Room) => void;
}

export const JoinByCodeModal: React.FC<JoinByCodeModalProps> = ({
  isOpen,
  onClose,
  rooms,
  onJoinSuccess,
}) => {
  const [ticketCode, setTicketCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = ticketCode.trim().toUpperCase();
    if (!cleanCode) return;

    // Search room by code
    const targetRoom = rooms.find((r) => r.code.toUpperCase() === cleanCode);

    if (targetRoom) {
      soundstage.playRoundBell();
      onJoinSuccess(targetRoom);
      onClose();
    } else {
      soundstage.playSlideDown();
      setErrorMessage(`No parlor found with ticket code "${cleanCode}". Confirm code with host.`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content join-code-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header-strip">
          <div>
            <span className="ribbon-banner">PARLOR ACCESS</span>
            <h2 className="woodcut-title modal-title">ENTER TICKET CODE</h2>
          </div>
          <button onClick={onClose} className="btn-cel btn-brawl-neutral btn-icon-sq" aria-label="Close">
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleJoin} className="join-code-form">
          <p className="join-instruction">
            Enter the private room admission code shared by your host (e.g. <code>TB-8491</code> or <code>BONE-924</code>).
          </p>

          <div className="ticket-input-container">
            <div className="ticket-input-prefix">
              <Key size={15} strokeWidth={2.8} />
              <span>CODE:</span>
            </div>
            <input
              type="text"
              value={ticketCode}
              onChange={(e) => {
                setTicketCode(e.target.value.toUpperCase());
                setErrorMessage('');
              }}
              placeholder="TB-XXXX"
              maxLength={12}
              className="ticket-field-input"
              autoFocus
              required
            />
          </div>

          {errorMessage && (
            <div className="ticket-error-alert">
              <AlertTriangle size={16} strokeWidth={2.8} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="join-actions-bar">
            <button
              type="submit"
              disabled={!ticketCode.trim()}
              className="btn-cel btn-brawl-primary join-action-btn"
            >
              <span>ENTER TABLE</span>
              <ArrowRight size={16} strokeWidth={3} />
            </button>
          </div>
        </form>

        <style>{`
          .join-code-modal {
            max-width: 440px;
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
            font-size: 20px;
            color: var(--color-text-main);
          }
          .join-code-form {
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .join-instruction {
            font-size: 13.5px;
            color: var(--color-text-lead);
            line-height: 1.35;
          }
          .join-instruction code {
            font-family: var(--font-typewriter-elite);
            font-weight: bold;
            background-color: var(--color-parchment-deep);
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid var(--color-ink-stroke);
            color: var(--color-cuphead-red);
          }
          .ticket-input-container {
            display: flex;
            align-items: center;
            background-color: var(--color-glove-ivory);
            border: var(--border-ink-thick);
            border-radius: 10px;
            box-shadow: var(--shadow-cel-sm);
            overflow: hidden;
          }
          .ticket-input-prefix {
            display: flex;
            align-items: center;
            gap: 5px;
            background-color: var(--color-golden-buttercup);
            padding: 10px 12px;
            border-right: 2px dashed var(--color-ink-stroke);
            font-family: var(--font-theatre-rye);
            font-size: 11px;
            letter-spacing: 0.08em;
            color: var(--color-ink-black);
          }
          .ticket-field-input {
            flex: 1;
            padding: 10px 14px;
            border: none;
            outline: none;
            background: transparent;
            font-family: var(--font-typewriter-elite);
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.12em;
            color: var(--color-cuphead-red);
            text-transform: uppercase;
          }
          .ticket-error-alert {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: var(--color-status-error-bg);
            border: 1.5px solid var(--color-status-error-text);
            border-radius: 7px;
            padding: 8px 10px;
            font-size: 12.5px;
            color: var(--color-status-error-text);
            font-weight: 600;
          }
          .join-actions-bar {
            margin-top: 2px;
          }
          .join-action-btn {
            width: 100%;
            font-size: 15.5px;
            padding: 10px;
          }
        `}</style>
      </div>
    </div>
  );
};
