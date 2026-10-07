import React from 'react';
import { HelpCircle } from 'lucide-react';

export const VortilexRules: React.FC = () => {
  return (
    <>
      <div className="codex-header">
        <HelpCircle size={32} strokeWidth={2.6} />
        <h3 className="woodcut-title codex-title">VORTILEX: WORD SEARCH RULES</h3>
      </div>

      <div className="codex-body">
        <div className="codex-section">
          <h4>1. GRID NAVIGATION</h4>
          <p>
            Connect adjacent letter dice on the 4x4 stone board. Letters must be horizontally or vertically adjacent.
            Spell out valid words of 3 letters or more to earn points.
          </p>
        </div>

        <div className="codex-section">
          <h4>2. SCORING BREAKDOWN</h4>
          <div className="codex-scoring-grid">
            <div className="codex-score-row">
              <span className="score-rule-badge badge-pos">BASE SCORE</span>
              <p>Each letter in a valid word awards <strong>2 points</strong>.</p>
            </div>
            <div className="codex-score-row">
              <span className="score-rule-badge badge-bonus">LENGTH BONUS</span>
              <p>Words with <strong>5 or more letters</strong> earn an additional <strong>+4 bonus points</strong>!</p>
            </div>
          </div>
        </div>

        <div className="codex-section">
          <h4>3. VICTORY CONDITIONS</h4>
          <p>
            The player who racks up the highest score before the clock runs out is crowned champion of the Vortilex vault.
          </p>
        </div>
      </div>
    </>
  );
};
