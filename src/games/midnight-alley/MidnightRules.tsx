import React from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  BossIcon,
  FemmeFataleIcon,
  GangsterIcon,
  ChameleonIcon,
  AlibiIcon,
  SuitIcon,
} from './MidnightCards';

export const MidnightRules: React.FC = () => {
  return (
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
  );
};
