import React from 'react';
import { HelpCircle } from 'lucide-react';
import { GameId } from '../types';
import { getGameManifest, getGameDefinition } from '../games';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: GameId;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, gameId }) => {
  if (!isOpen) return null;

  const manifest = getGameManifest(gameId);
  const gameDef = manifest?.definition || getGameDefinition(gameId);
  const RulesComponent = manifest?.rulesComponent;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content codex-modal-card" onClick={(e) => e.stopPropagation()}>
        {RulesComponent ? (
          <RulesComponent />
        ) : (
          <>
            <div className="codex-header">
              <HelpCircle size={32} strokeWidth={2.6} />
              <h3 className="woodcut-title codex-title">{gameDef?.title.toUpperCase()} RULES</h3>
            </div>

            <div className="codex-body">
              <div className="codex-section">
                <h4>OVERVIEW</h4>
                <p>{gameDef?.description}</p>
              </div>

              <div className="codex-section">
                <h4>CAPACITY &amp; TIMING</h4>
                <p>
                  Designed for {gameDef?.minPlayers} to {gameDef?.maxPlayers} players. Estimated match time: ~{gameDef?.estimatedTimeMin} minutes.
                </p>
              </div>

              <div className="codex-section">
                <h4>HOW TO PLAY</h4>
                <p>
                  Take turns making your moves on the board. Score points based on tactical placement and strategy. The player with the highest score when time runs out or objectives are met wins!
                </p>
              </div>
            </div>
          </>
        )}

        <div className="codex-footer">
          <button onClick={onClose} className="btn-cel btn-brawl-primary">
            <span>CLOSE RULES</span>
          </button>
        </div>

        <style>{`
          .codex-modal-card {
            max-width: 780px !important;
            width: 95% !important;
            max-height: 88vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 18px;
            padding: 28px 32px !important;
          }
          .codex-header {
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--color-cuphead-red);
            border-bottom: 2px solid var(--color-ink-stroke);
            padding-bottom: 12px;
          }
          .codex-title {
            font-size: 24px;
            margin: 0;
          }
          .codex-body {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
          .codex-section h4 {
            font-family: var(--font-heading);
            font-size: 16px;
            color: var(--color-text-main);
            margin: 0 0 8px 0;
            border-bottom: 1.5px dashed var(--color-ink-stroke);
            padding-bottom: 4px;
          }
          .codex-section p {
            font-family: var(--font-body);
            font-size: 14px !important;
            color: var(--color-text-lead);
            line-height: 1.6;
            margin: 0;
          }
          .codex-roles-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .codex-role-item {
            display: flex;
            align-items: center;
            gap: 14px;
            background-color: var(--color-canvas-parchment);
            border: var(--border-ink-thin);
            border-radius: 10px;
            padding: 12px 16px;
          }
          .codex-role-item strong {
            font-family: var(--font-heading);
            font-size: 15px;
            color: var(--color-text-main);
            display: block;
            margin-bottom: 3px;
          }
          .codex-role-item p {
            font-size: 13.5px !important;
            line-height: 1.45;
            margin: 0;
          }
          .codex-suit-icon-box {
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #1c1511;
            border: 2px solid #ffd043;
            border-radius: 8px;
            flex-shrink: 0;
          }
          .codex-scoring-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .codex-score-row {
            display: flex;
            align-items: center;
            gap: 12px;
            background-color: var(--color-canvas-parchment);
            border: var(--border-ink-thin);
            border-radius: 8px;
            padding: 8px 12px;
          }
          .codex-score-row p {
            margin: 0 !important;
            font-size: 13.5px !important;
            line-height: 1.4 !important;
          }
          .score-rule-badge {
            font-family: var(--font-accent);
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 0.05em;
            padding: 3px 8px;
            border-radius: 4px;
            border: 1px solid var(--color-ink-stroke);
            white-space: nowrap;
            min-width: 90px;
            text-align: center;
          }
          .score-rule-badge.badge-pos {
            background-color: #2e7d32;
            color: #fdfbf5;
          }
          .score-rule-badge.badge-neg {
            background-color: var(--color-cuphead-red);
            color: #fdfbf5;
          }
          .score-rule-badge.badge-bonus {
            background-color: var(--color-golden-buttercup);
            color: #1c1511;
          }
          .score-bonuses-row {
            background-color: rgba(255, 208, 67, 0.12);
            border-color: #ffd043;
          }
          .codex-footer {
            display: flex;
            justify-content: flex-end;
            margin-top: 6px;
          }
        `}</style>
      </div>
    </div>
  );
};
