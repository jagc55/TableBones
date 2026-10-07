import React from 'react';
import { Dices } from 'lucide-react';

export const SkullBonesRules: React.FC = () => {
  return (
    <>
      <div className="codex-header">
        <Dices size={32} strokeWidth={2.6} />
        <h3 className="woodcut-title codex-title">LIAR&apos;S DICE: DUEL RULES</h3>
      </div>

      <div className="codex-body">
        <div className="codex-section">
          <h4>1. CUP &amp; SECRET ROLLS</h4>
          <p>
            Each contender rolls 5 dice concealed beneath their cup. You know only your own values, but bids are made on the <strong>total dice across all cups on the table</strong>!
          </p>
        </div>

        <div className="codex-section">
          <h4>2. BIDDING PROGRESSION</h4>
          <p>
            Players raise the stakes by claiming higher counts or higher faces (e.g. &ldquo;Three 4s&rdquo; &rarr; &ldquo;Four 4s&rdquo; or &ldquo;Three 5s&rdquo;).
          </p>
        </div>

        <div className="codex-section">
          <h4>3. CALLING BLUFFS</h4>
          <div className="codex-scoring-grid">
            <div className="codex-score-row">
              <span className="score-rule-badge badge-pos">CAUGHT BLUFF</span>
              <p>If you call bluff and the table count is <strong>strictly less</strong> than the bid, you win the challenge (+6 PTS)!</p>
            </div>
            <div className="codex-score-row">
              <span className="score-rule-badge badge-neg">FAILED CHALLENGE</span>
              <p>If the bidder was honest or had enough dice, the bidder wins the standoff!</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
