import React from 'react';
import { ShieldCheck, AlertOctagon } from 'lucide-react';
import {
  BossIcon,
  FemmeFataleIcon,
  GangsterIcon,
  ChameleonIcon,
  AlibiIcon,
  PoliceIcon,
  FatVinnieIcon,
  BriefcaseIcon,
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
          <h4>1. DECK COMPOSITION &amp; DEAL</h4>
          <p>
            The standard deck contains exactly <strong>70 cards</strong>:
          </p>
          <ul style={{ paddingLeft: '20px', margin: '6px 0 12px', fontSize: '13px' }}>
            <li><strong>1 The Boss</strong> (Supreme Kingpin)</li>
            <li><strong>2 Femme Fatales</strong> (Mob Sirens)</li>
            <li><strong>5 Gangsters</strong> (Hitmen Enforcers)</li>
            <li><strong>1 The Chameleon</strong> (Undercover Infiltrator)</li>
            <li><strong>5 Alibis</strong> (Escape Cards)</li>
            <li>
              <strong>56 Numbered Cards</strong> (values 1–14 across 4 suits: 14 Black Midnight Syndicate trumps, 14 Gold, 14 Cyan, and 14 Ruby).
            </li>
          </ul>
        </div>

        <div className="codex-section" style={{ borderLeft: '3px solid #d33833', paddingLeft: '12px' }}>
          <h4>2. DEAL RESTRICTIONS FOR 7 &amp; 8 PLAYERS</h4>
          <p>
            With a limited deck, large tables of 7 or 8 players apply freezing rules in the late rounds to ensure cards never run short and mystery cards always remain in the hidden discard reserve:
          </p>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
            <div style={{ background: 'rgba(0,0,0,0.04)', padding: '8px 10px', borderRadius: '6px' }}>
              <strong>For 7-Player Games:</strong>
              <p style={{ margin: '4px 0 0' }}>
                Rounds 1 through 9 progress normally (dealing 1 to 9 cards, using 63 cards in Round 9).
                <strong> Round 10 is frozen at 9 cards:</strong> Round 10 deals 9 cards to each player instead of 10. The maximum bid in Round 10 is 9 tricks.
              </p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.04)', padding: '8px 10px', borderRadius: '6px' }}>
              <strong>For 8-Player Games:</strong>
              <p style={{ margin: '4px 0 0' }}>
                Rounds 1 through 8 progress normally (dealing 1 to 8 cards, using 64 cards in Round 8).
                <strong> Rounds 9 and 10 are frozen at 8 cards:</strong> Both rounds repeat the 8-card deal. The maximum bid in Rounds 8, 9, and 10 is 8 tricks.
              </p>
            </div>
            <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--color-text-lead)' }}>
              These deal limits apply to both Classic and Advanced game modes.
            </p>
          </div>
        </div>

        <div className="codex-section">
          <h4>3. BIDDING PHASE</h4>
          <p>
            At the start of each round, all players simultaneously place their bid (from 0 up to the maximum cards dealt in that round). Bids remain secret until all players have committed, at which point all bids are revealed simultaneously for public tracking.
          </p>
        </div>

        <div className="codex-section">
          <h4>4. CARD HIERARCHY &amp; SUITS</h4>
          <div className="codex-roles-grid">
            <div className="codex-role-item role-boss">
              <BossIcon size={44} />
              <div>
                <strong>THE BOSS (1 in deck)</strong>
                <p>Rules the city. Defeats all Gangsters, Tommy Guns, and standard suits. Loses ONLY to a Femme Fatale!</p>
              </div>
            </div>

            <div className="codex-role-item role-femme">
              <FemmeFataleIcon size={44} />
              <div>
                <strong>FEMME FATALE (2 in deck)</strong>
                <p>Seductive and lethal. Defeats normal cards and enchants The Boss (wins trick +50 bonus). Loses to Gangsters.</p>
              </div>
            </div>

            <div className="codex-role-item role-gangster">
              <GangsterIcon size={44} />
              <div>
                <strong>GANGSTER (5 in deck)</strong>
                <p>Armed muscle. Defeats Femme Fatales, Tommy Guns, and normal suits. The first Gangster played wins the trick. Loses to The Boss.</p>
              </div>
            </div>

            <div className="codex-role-item role-chameleon">
              <ChameleonIcon size={44} />
              <div>
                <strong>THE CHAMELEON (1 in deck)</strong>
                <p>Undercover infiltrator. Can shoot as a Gangster or blend into the background as an Alibi.</p>
              </div>
            </div>

            <div className="codex-role-item role-tommy">
              <div className="codex-suit-icon-box">
                <SuitIcon suit="black" size={32} />
              </div>
              <div>
                <strong>TOMMY GUNS (BLACK • 14 in deck)</strong>
                <p>The Trump Suit! Beats civil suits (gold, cyan, ruby). Highest black card wins unless special cards intervene.</p>
              </div>
            </div>

            <div className="codex-role-item role-alibi">
              <AlibiIcon size={44} />
              <div>
                <strong>ALIBI (5 in deck)</strong>
                <p>Value 0 escape card. Avoids capturing unwanted tricks. If all cards played are Alibis, the first one played wins.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="codex-section" style={{ borderLeft: '3px solid #1e5f38', paddingLeft: '12px' }}>
          <h4>5. ADVANCED MODE EXPANSION (74 CARDS TOTAL)</h4>
          <p>
            When Advanced Mode is enabled during room creation, 4 special expansion cards are shuffled into the deck:
          </p>

          <div className="codex-roles-grid" style={{ marginTop: '10px' }}>
            <div className="codex-role-item" style={{ borderColor: '#1b2a4a' }}>
              <PoliceIcon size={44} />
              <div>
                <strong>THE POLICE (1 in deck • Kraken)</strong>
                <p>
                  A full-force raid! Destroys everything on the table. Nobody wins the trick; all cards are discarded. The next trick is led by the player situated to the left of whoever played The Police. Players who haven't played yet in the trick must still play a card.
                </p>
              </div>
            </div>

            <div className="codex-role-item" style={{ borderColor: '#bfa15f' }}>
              <FatVinnieIcon size={44} />
              <div>
                <strong>FAT VINNIE (1 in deck • White Whale)</strong>
                <p>
                  Disables all special card powers (they turn into Alibis) and strips numeric cards of their suits (they become white numbers). The trick is not destroyed: it is won by the player with the highest numeric card (1–14). Ties go to the first one played on the table!
                </p>
              </div>
            </div>

            <div className="codex-role-item" style={{ borderColor: '#1e5f38' }}>
              <BriefcaseIcon size={44} />
              <div>
                <strong>BLACK MONEY BRIEFCASE (2 in deck • Loot)</strong>
                <p>
                  Acts as an Alibi. The trick winner forms an alliance with you! If BOTH you and the associated player hit your exact bids at round end, BOTH get +20 bonus points. If you win your own briefcase trick, you get +20 alone upon hitting your exact bid.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#1c1511', marginBottom: '4px' }}>
              <AlertOctagon size={15} color="#d33833" />
              <span>THE POLICE VS. FAT VINNIE CLASH:</span>
            </div>
            <p style={{ margin: 0 }}>
              When The Police and Fat Vinnie are played in the same trick, the second one played wins the clash and nullifies the first! The first card played automatically turns into an Alibi, and only the second card's effect resolves.
            </p>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-lead)' }}>
              &bull; <strong>Briefcase in Police Trick:</strong> If a briefcase is played in a trick destroyed by The Police, nobody wins, no alliance is formed, and no bonus points are awarded.<br />
              &bull; <strong>Briefcase in Fat Vinnie Trick:</strong> Fat Vinnie strips special powers, turning the briefcase into a plain escape; no alliance is formed.
            </div>
          </div>
        </div>

        <div className="codex-section">
          <h4>6. FOLLOWING SUIT RULE</h4>
          <p>
            If the first card played in a trick is numbered, you <strong>MUST</strong> follow that suit if you hold cards of that suit. Special cards (The Boss, Femme Fatales, Gangsters, Chameleon, Alibis, Police, Fat Vinnie, Briefcases) can <strong>ALWAYS</strong> be played at any time!
          </p>
        </div>

        <div className="codex-section">
          <h4>7. THE UNDERWORLD LEDGER (SCORING)</h4>
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
              <p><strong>Successful Zero Bid (Bid = 0):</strong> +10 points &times; Hand card count.</p>
            </div>
            <div className="codex-score-row">
              <span className="score-rule-badge badge-neg">FAILED ZERO</span>
              <p><strong>Failed Zero Bid (Bid = 0):</strong> -10 points &times; Hand card count.</p>
            </div>
            <div className="codex-score-row score-bonuses-row">
              <span className="score-rule-badge badge-bonus">BONUSES</span>
              <p>
                <strong>The Boss</strong> capturing Gangsters (+30 each) &bull;{' '}
                <strong>Femme Fatale</strong> enchanting The Boss (+50) &bull;{' '}
                Winning trick with a <strong>14</strong> (+10 standard suit, +20 Tommy Gun) &bull;{' '}
                <strong>Briefcase Alliance</strong> (+20 to each partner upon exact bids).
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
