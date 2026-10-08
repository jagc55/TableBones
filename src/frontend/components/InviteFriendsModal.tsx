import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Wifi, Globe } from 'lucide-react';
import { Room } from '../types';
import { soundstage } from '../utils/audio';
import { buildInviteUrl, fetchNetworkInfo, getCachedLanUrl } from '../websocket/client';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  isOpen,
  onClose,
  room,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lanUrl, setLanUrl] = useState<string>(getCachedLanUrl());

  useEffect(() => {
    fetchNetworkInfo().then((url) => {
      if (url) setLanUrl(url);
    });
  }, []);

  if (!isOpen) return null;

  const fullInviteUrl = buildInviteUrl(room);

  const handleCopyLink = async () => {
    soundstage.playTap();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullInviteUrl);
      } else {
        const input = document.createElement('input');
        input.value = fullInviteUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy invite link:', fullInviteUrl);
    }
  };

  const handleCopyCodeOnly = async () => {
    soundstage.playTap();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(room.code);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      window.prompt('Copy room code:', room.code);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invite-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header-strip">
          <div>
            <span className="ribbon-banner">PLAY WITH FRIENDS</span>
            <h2 className="woodcut-title modal-title">INVITE TO TABLE</h2>
          </div>
          <button onClick={onClose} className="btn-cel btn-brawl-neutral btn-icon-sq" aria-label="Close">
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        <div className="invite-modal-body">
          <p className="invite-intro">
            Your friends can join your local match directly from their own computer, tablet, or phone!
          </p>

          {/* Quick Room Code Stub */}
          <div className="invite-code-pill-hero">
            <span className="code-pill-label">ROOM CODE:</span>
            <span className="code-pill-code">{room.code}</span>
            <button
              onClick={handleCopyCodeOnly}
              className="btn-cel btn-brawl-neutral btn-sm"
              title="Copy code only"
            >
              {copiedCode ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={2.5} />}
              <span>{copiedCode ? 'COPIED!' : 'CODE'}</span>
            </button>
          </div>

          {/* Wi-Fi / Local Network Option */}
          <div className="invite-section-card">
            <div className="section-card-header">
              <div className="section-badge-pill wifi-pill">
                <Wifi size={14} strokeWidth={2.8} />
                <span>SAME WI-FI / LOCAL NETWORK</span>
              </div>
              <span className="status-badge-ready">{lanUrl ? 'ONLINE' : 'ACTIVE'}</span>
            </div>

            <p className="section-desc">
              Share this link with anyone connected to the same Wi-Fi router. Opening it immediately joins your table.
            </p>

            <div className="invite-link-box">
              <input
                type="text"
                readOnly
                value={fullInviteUrl}
                className="invite-link-input"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyLink}
                className="btn-cel btn-brawl-primary copy-link-action-btn"
              >
                {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
                <span>{copied ? 'COPIED!' : 'COPY LINK'}</span>
              </button>
            </div>
          </div>

          {/* Remote / Internet Friends Option */}
          <div className="invite-section-card remote-card">
            <div className="section-card-header">
              <div className="section-badge-pill globe-pill">
                <Globe size={14} strokeWidth={2.8} />
                <span>FRIENDS OUTSIDE YOUR HOUSE (INTERNET)</span>
              </div>
            </div>

            <p className="section-desc">
              If your friends are in another house or on mobile data, run this command in your project terminal to create a free public internet tunnel:
            </p>

            <div className="terminal-snippet-box">
              <code>npm run tunnel</code>
            </div>

            <span className="terminal-hint">
              This outputs a public link (e.g. <code>https://....loca.lt</code>) that your friends can open anywhere in the world!
            </span>
          </div>
        </div>

        <div className="invite-modal-footer">
          <button onClick={onClose} className="btn-cel btn-brawl-secondary btn-full">
            <span>CLOSE</span>
          </button>
        </div>

        <style>{`
          .invite-modal-card {
            max-width: 580px;
            width: 95%;
          }
          .invite-modal-body {
            padding: 18px 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .invite-intro {
            font-size: 14px;
            color: var(--color-text-lead);
            line-height: 1.4;
            margin: 0;
          }
          .invite-code-pill-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: var(--color-golden-buttercup);
            border: 2px solid var(--color-ink-black);
            border-radius: 8px;
            padding: 8px 14px;
            box-shadow: 2px 2px 0px var(--color-ink-black);
          }
          .code-pill-label {
            font-family: var(--font-theatre-rye);
            font-size: 11px;
            color: var(--color-ink-black);
            letter-spacing: 0.08em;
          }
          .code-pill-code {
            font-family: var(--font-typewriter-elite);
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.12em;
            color: var(--color-cuphead-red);
          }
          .invite-section-card {
            background-color: var(--color-canvas-parchment);
            border: 2px solid var(--color-ink-black);
            border-radius: 9px;
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-shadow: 2px 2px 0px var(--color-ink-black);
          }
          .section-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .section-badge-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-family: var(--font-theatre-rye);
            font-size: 10px;
            letter-spacing: 0.05em;
            padding: 3px 9px;
            border-radius: 5px;
            border: 1.5px solid var(--color-ink-black);
            font-weight: 700;
          }
          .wifi-pill {
            background-color: #d1fae5;
            color: #065f46;
          }
          .globe-pill {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .status-badge-ready {
            font-family: var(--font-theatre-rye);
            font-size: 9px;
            letter-spacing: 0.08em;
            background-color: #10b981;
            color: #ffffff;
            padding: 2px 7px;
            border-radius: 4px;
            border: 1px solid var(--color-ink-black);
            font-weight: 700;
          }
          .section-desc {
            font-size: 13px;
            color: var(--color-text-main);
            margin: 0;
            line-height: 1.35;
          }
          .invite-link-box {
            display: flex;
            align-items: stretch;
            gap: 8px;
          }
          .invite-link-input {
            flex: 1;
            padding: 8px 12px;
            font-family: var(--font-typewriter-elite);
            font-size: 12px;
            background-color: #ffffff;
            border: 2px solid var(--color-ink-black);
            border-radius: 6px;
            color: var(--color-ink-black);
            outline: none;
            cursor: pointer;
          }
          .copy-link-action-btn {
            white-space: nowrap;
            padding: 8px 14px;
            font-size: 12px;
          }
          .remote-card {
            background-color: #f8fafc;
          }
          .terminal-snippet-box {
            background-color: var(--color-ink-black);
            border-radius: 6px;
            padding: 8px 12px;
            color: #4ade80;
            font-family: var(--font-typewriter-elite);
            font-size: 13px;
            letter-spacing: 0.05em;
          }
          .terminal-hint {
            font-size: 11.5px;
            color: var(--color-text-muted);
            line-height: 1.3;
          }
          .invite-modal-footer {
            padding: 12px 20px 18px;
          }
        `}</style>
      </div>
    </div>
  );
};
