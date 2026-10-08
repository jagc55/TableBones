import React from 'react';
import { Sparkles } from 'lucide-react';

export const BonegleRules: React.FC = () => {
  return (
    <>
      <div className="codex-header">
        <Sparkles size={32} strokeWidth={2.6} />
        <h3 className="woodcut-title codex-title">BONEGLE: WORD SCRAMBLE RULES</h3>
      </div>

      <div className="codex-body">
        <div className="codex-section">
          <h4>1. THE BONEGLE ARENA</h4>
          <p>
            Connect adjacent letter dice horizontally, vertically, or diagonally to spell valid dictionary words.
            You can swipe or drag smoothly across tiles, or click letters in sequence.
            Each die may only be used <strong>once per word</strong>!
          </p>
        </div>

        <div className="codex-section">
          <h4>2. WORD LENGTH &amp; SCORING SCALE</h4>
          <div className="codex-scoring-grid">
            <div className="codex-score-row">
              <span className="score-rule-badge badge-pos">3 LETTERS</span>
              <p><strong>1 Point:</strong> Basic entry word.</p>
            </div>
            <div className="codex-score-row">
              <span className="score-rule-badge badge-pos">4 LETTERS</span>
              <p><strong>1 Point:</strong> Standard word.</p>
            </div>
            <div className="codex-score-row">
              <span className="score-rule-badge badge-pos">5 LETTERS</span>
              <p><strong>2 Points:</strong> Moderate challenge.</p>
            </div>
            <div className="codex-score-row">
              <span className="score-rule-badge badge-pos">6 LETTERS</span>
              <p><strong>3 Points:</strong> Tactical vocabulary.</p>
            </div>
            <div className="codex-score-row">
              <span className="score-rule-badge badge-pos">7 LETTERS</span>
              <p><strong>5 Points:</strong> Master wordcraft.</p>
            </div>
            <div className="codex-score-row">
              <span className="score-rule-badge badge-bonus">8+ LETTERS</span>
              <p><strong>11 Points:</strong> Supreme grandmaster bonus!</p>
            </div>
          </div>
        </div>

        <div className="codex-section">
          <h4>3. THE STASH MULTIPLIER (UNIQUE WORDS)</h4>
          <p>
            Words found by <strong>only one contender</strong> earn a <strong>x2 score multiplier</strong>!
            If two or more contenders find the exact same word, everyone keeps that word at standard (x1) value.
            Unearth uncommon vocabulary to surge ahead!
          </p>
        </div>

        <div className="codex-section">
          <h4>4. ROUND TIMER &amp; REVELATION</h4>
          <p>
            All submitted words remain completely secret during the round clock.
            When the round clock hits 00:00, the match halts and reveals every player&apos;s discovered words,
            unique bonuses, and all possible board solutions.
          </p>
        </div>
      </div>
    </>
  );
};
