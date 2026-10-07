import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import { GameId } from '../types';
import { GAMES_CATALOG } from '../utils/mockData';
import {
  BossIcon,
  FemmeFataleIcon,
  GangsterIcon,
  ChameleonIcon,
  AlibiIcon,
  SuitIcon,
} from '../midnight-alley/MidnightCards';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: GameId;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, gameId }) => {
  if (!isOpen) return null;

  const gameDef = GAMES_CATALOG.find((g) => g.id === gameId) || GAMES_CATALOG[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content codex-modal-card" onClick={(e) => e.stopPropagation()}>
        {gameId === 'midnight-alley' ? (
          <>
            <div className="codex-header">
              <ShieldCheck size={32} strokeWidth={2.6} />
              <h3 className="woodcut-title codex-title">MAFIA CODEX: MIDNIGHT ALLEY RULES</h3>
            </div>

            <div className="codex-body">
              <div className="codex-section">
                <h4>1. TOURNAMENT HANDS &amp; DEAL</h4>
                <p>
                  In Hand 1, each player receives 1 card; in Hand 2, 2 cards; scaling up each hand until Hand 10 with 10 cards.
                </p>
              </div>

              <div className="codex-section">
                <h4>2. BIDDING PHASE</h4>
                <p>
                  At the start of each hand, all players choose their bid simultaneously (from 0 up to the hand number). Bids remain hidden until everyone has placed their bid, at which point all bids are revealed and become public for the entire round.
                </p>
              </div>

              <div className="codex-section">
                <h4>3. GAME HIERARCHY</h4>
                <div className="codex-roles-grid">
                  <div className="codex-role-item role-boss">
                    <BossIcon size={44} />
                    <div>
                      <strong>THE BOSS</strong>
                      <p>Rules the city. Defeats all Gangsters, Tommy Guns, and standard suits. Loses ONLY to a Femme Fatale!</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-femme">
                    <FemmeFataleIcon size={44} />
                    <div>
                      <strong>FEMME FATALE</strong>
                      <p>Seductive and lethal. Defeats normal cards and enchants The Boss (wins the trick and grants +50 bonus). Loses to Gangsters.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-gangster">
                    <GangsterIcon size={44} />
                    <div>
                      <strong>GANGSTER</strong>
                      <p>Armed muscle. Defeats Femme Fatales, Tommy Guns, and normal suits. The first Gangster played wins the trick. Loses to The Boss.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-chameleon">
                    <ChameleonIcon size={44} />
                    <div>
                      <strong>THE CHAMELEON</strong>
                      <p>Undercover chameleon. Can shoot as a Gangster or blend into the crowd as an Alibi.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-tommy">
                    <div className="codex-suit-icon-box">
                      <SuitIcon suit="black" size={32} />
                    </div>
                    <div>
                      <strong>TOMMY GUNS (BLACK)</strong>
                      <p>The Trump Suit! Beats standard civil suits (gold, cyan, ruby). Loses to Gangsters and The Boss.</p>
                    </div>
                  </div>

                  <div className="codex-role-item role-alibi">
                    <AlibiIcon size={44} />
                    <div>
                      <strong>ALIBI</strong>
                      <p>Value 0. Loses against everything. If all players present an Alibi, the first Alibi played wins the trick.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="codex-section">
                <h4>4. FOLLOWING SUIT RULE</h4>
                <p>
                  If the first card played in a trick is numbered, you <strong>MUST</strong> follow that suit if you hold cards of that suit. Special cards (Gangsters, The Boss, Femme Fatales, Alibis, Chameleon) can <strong>ALWAYS</strong> be played at any time!
                </p>
              </div>

              <div className="codex-section">
                <h4>5. THE UNDERWORLD LEDGER (SCORING)</h4>
                <div className="codex-scoring-grid">
                  <div className="codex-score-row">
                    <span className="score-rule-badge badge-pos">EXACT BID</span>
                    <p><strong>Successful Bid (Bid &gt; 0):</strong> +20 points per trick bid + captured bonuses.</p>
                  </div>
                  <div className="codex-score-row">
                    <span className="score-rule-badge badge-neg">MISSED BID</span>
                    <p><strong>Failed Bid (Bid &gt; 0):</strong> -10 points for each trick of difference (bonuses are lost).</p>
                  </div>
                  <div className="codex-score-row">
                    <span className="score-rule-badge badge-pos">ZERO BID</span>
                    <p><strong>Successful Zero Bid (Bid = 0):</strong> +10 points &times; Hand Number.</p>
                  </div>
                  <div className="codex-score-row">
                    <span className="score-rule-badge badge-neg">FAILED ZERO</span>
                    <p><strong>Failed Zero Bid (Bid = 0):</strong> -10 points &times; Hand Number.</p>
                  </div>
                  <div className="codex-score-row score-bonuses-row">
                    <span className="score-rule-badge badge-bonus">BONUSES</span>
                    <p>
                      <strong>The Boss</strong> capturing Gangsters (+30 each) &bull;{' '}
                      <strong>Femme Fatale</strong> enchanting The Boss (+50) &bull;{' '}
                      Winning trick with a <strong>14</strong> (+10 standard suit, +20 Tommy Gun).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="codex-header">
              <HelpCircle size={32} strokeWidth={2.6} />
              <h3 className="woodcut-title codex-title">{gameDef.title.toUpperCase()} RULES</h3>
            </div>

            <div className="codex-body">
              <div className="codex-section">
                <h4>OVERVIEW</h4>
                <p>{gameDef.description}</p>
              </div>

              <div className="codex-section">
                <h4>CAPACITY &amp; TIMING</h4>
                <p>
                  Designed for {gameDef.minPlayers} to {gameDef.maxPlayers} players. Estimated match time: ~{gameDef.estimatedTimeMin} minutes.
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
