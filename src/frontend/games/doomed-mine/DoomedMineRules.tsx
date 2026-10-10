import React, { useState } from 'react';
import { Pickaxe, Shield, AlertTriangle, Trophy, Layers, Sparkles, HelpCircle } from 'lucide-react';

export const DoomedMineRules: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mission' | 'phases' | 'tokens' | 'poker'>('mission');

  return (
    <div className="doomed-mine-rules-card">
      {/* Navigation Tabs */}
      <div className="rules-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab('mission')}
          className={`btn-cel btn-sm ${activeTab === 'mission' ? 'btn-brawl-primary' : 'btn-brawl-neutral'}`}
        >
          <Pickaxe size={14} />
          <span>1. THE MISSION</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('phases')}
          className={`btn-cel btn-sm ${activeTab === 'phases' ? 'btn-brawl-primary' : 'btn-brawl-neutral'}`}
        >
          <Layers size={14} />
          <span>2. PHASES</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tokens')}
          className={`btn-cel btn-sm ${activeTab === 'tokens' ? 'btn-brawl-primary' : 'btn-brawl-neutral'}`}
        >
          <Shield size={14} />
          <span>3. TOKENS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('poker')}
          className={`btn-cel btn-sm ${activeTab === 'poker' ? 'btn-brawl-primary' : 'btn-brawl-neutral'}`}
        >
          <Trophy size={14} />
          <span>4. POKER HANDS</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="rules-tab-panel">
        {activeTab === 'mission' && (
          <div className="rules-panel-content">
            <div className="ribbon-banner">CREW OBJECTIVE</div>
            <h3 className="woodcut-title panel-heading">SHORE UP 3 SHAFTS BEFORE 3 CAVE-INS</h3>

            <p className="panel-lead-text">
              You are a crew of <strong>skeleton miners</strong> trapped in the depths of an unstable,
              collapsing gold mine. To escape safely to the surface, you must cooperate to calibrate rock tension using poker cards.
            </p>

            <div className="panel-two-cards-grid">
              <div className="cel-card panel-callout-card victory-callout">
                <div className="callout-title-row">
                  <Trophy size={18} className="gold-icon" />
                  <span className="woodcut-title">3 SHAFTS SECURED</span>
                </div>
                <p>
                  If the crew accurately estimates the relative strength hierarchy in 3 expeditions, the master timber beams hold and <strong>you win the game</strong>.
                </p>
              </div>

              <div className="cel-card panel-callout-card defeat-callout">
                <div className="callout-title-row">
                  <AlertTriangle size={18} className="crimson-icon" />
                  <span className="woodcut-title">3 CAVE-INS</span>
                </div>
                <p>
                  If anyone misjudges the tension and pressure tokens contradict actual hand strength at showdown, the gallery collapses. 3 cave-ins and <strong>the mine caves in entirely</strong>.
                </p>
              </div>
            </div>

            <div className="cel-card-deep panel-golden-rule">
              <div className="golden-rule-title">
                <HelpCircle size={17} />
                <span className="woodcut-title">THE GOLDEN RULE OF SILENCE</span>
              </div>
              <p>
                Deep in the shaft, there is no speaking and cards are kept secret. Your <strong>only way to communicate</strong> with teammates is through the <strong>Pressure Token</strong> you claim or swap on the table each phase.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'phases' && (
          <div className="rules-panel-content">
            <div className="ribbon-banner">EXPEDITION STRUCTURE</div>
            <h3 className="woodcut-title panel-heading">4 PROSPECTING PHASES (TEXAS HOLD'EM)</h3>

            <div className="phases-flow-stack">
              <div className="cel-card phase-flow-card">
                <div className="phase-num-chip">1</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">PRE-FLOP (THE SOUNDING)</strong>
                  <p>Each miner receives <strong>2 private pocket cards</strong>. With this preliminary info, every player claims an initial Pressure Token (1 to N).</p>
                </div>
              </div>

              <div className="cel-card phase-flow-card">
                <div className="phase-num-chip">2</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">THE FLOP (3 COMMUNITY ROCKS)</strong>
                  <p>3 community cards are revealed in the center. Re-evaluate your hand! Tokens reset so everyone can claim tokens matching their upgraded strength.</p>
                </div>
              </div>

              <div className="cel-card phase-flow-card">
                <div className="phase-num-chip">3</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">THE TURN (4TH COMMUNITY ROCK)</strong>
                  <p>Timbers groan as a 4th community card appears. Fresh token selection allows players to fine-tune the pressure hierarchy.</p>
                </div>
              </div>

              <div className="cel-card phase-flow-card">
                <div className="phase-num-chip">4</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">THE RIVER (5TH COMMUNITY ROCK)</strong>
                  <p>Final rock on the table. All 5 community cards are now visible. This is your <strong>definitive estimate</strong> before the verdict.</p>
                </div>
              </div>

              <div className="cel-card phase-flow-card showdown-phase-card">
                <div className="phase-num-chip showdown-chip">★</div>
                <div className="phase-flow-info">
                  <strong className="phase-flow-title">THE SHOWDOWN (THE VERDICT)</strong>
                  <p>All private cards flip over. The engine evaluates everyone's best 5-card poker hand. If the order from weakest to strongest matches the tokens, the shaft is secured!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="rules-panel-content">
            <div className="ribbon-banner">COOPERATIVE STRATEGY</div>
            <h3 className="woodcut-title panel-heading">PRESSURE TOKENS & CALIBRATION</h3>

            <p className="panel-lead-text">
              On a table of N players, tokens are numbered <strong>1 to N</strong>. Each number represents your hand's relative ranking at the showdown:
            </p>

            <div className="tokens-guide-grid">
              <div className="cel-card token-guide-item">
                <div className="token-guide-chip chip-low">1</div>
                <div>
                  <strong className="woodcut-title">TOKEN 1 (MINIMUM TENSION)</strong>
                  <p>For the weakest hand in the crew (e.g. low high card or disconnected low pair).</p>
                </div>
              </div>

              <div className="cel-card token-guide-item">
                <div className="token-guide-chip chip-mid">2 ... N-1</div>
                <div>
                  <strong className="woodcut-title">INTERMEDIATE TOKENS</strong>
                  <p>For moderate combinations (high pairs, two pair, strong draws).</p>
                </div>
              </div>

              <div className="cel-card token-guide-item">
                <div className="token-guide-chip chip-high">N</div>
                <div>
                  <strong className="woodcut-title">TOKEN N (MAXIMUM TENSION)</strong>
                  <p>Reserved for the crew's powerhouse hand (three of a kind, straight, flush, or full house).</p>
                </div>
              </div>
            </div>

            <div className="cel-card-deep panel-hint-box">
              <Sparkles size={16} className="gold-icon" />
              <span>
                <strong>Veteran Miner Tip:</strong> Once you claim a token, you cannot voluntarily release it. Another miner must steal it from you to free you up!
              </span>
            </div>
          </div>
        )}

        {activeTab === 'poker' && (
          <div className="rules-panel-content">
            <div className="ribbon-banner">OFFICIAL TEXAS HOLD'EM RANKINGS</div>
            <h3 className="woodcut-title panel-heading">HAND HIERARCHY (WEAKEST TO STRONGEST)</h3>

            <div className="poker-hierarchy-table">
              {[
                { rank: 1, name: '1. High Card', example: 'A ♦ 10 ♠ 8 ♣ 6 ♥ 2 ♦', desc: 'No combinations; highest card value determines strength.' },
                { rank: 2, name: '2. One Pair', example: 'J ♠ J ♥ 9 ♣ 5 ♦ 2 ♠', desc: 'Two cards of the exact same rank.' },
                { rank: 3, name: '3. Two Pair', example: 'K ♠ K ♦ 7 ♣ 7 ♥ 4 ♠', desc: 'Two different pairs.' },
                { rank: 4, name: '4. Three of a Kind', example: '8 ♠ 8 ♥ 8 ♦ K ♣ 3 ♠', desc: 'Three cards of the exact same rank.' },
                { rank: 5, name: '5. Straight', example: '5 ♠ 6 ♦ 7 ♣ 8 ♥ 9 ♠', desc: 'Five consecutive cards of mixed suits.' },
                { rank: 6, name: '6. Flush', example: 'K ♠ J ♠ 8 ♠ 6 ♠ 2 ♠', desc: 'Five cards of the same suit.' },
                { rank: 7, name: '7. Full House', example: 'Q ♠ Q ♥ Q ♦ 10 ♣ 10 ♠', desc: 'Three of a kind combined with a pair.' },
                { rank: 8, name: '8. Four of a Kind', example: '4 ♠ 4 ♥ 4 ♦ 4 ♣ A ♠', desc: 'Four cards of the same rank.' },
                { rank: 9, name: '9. Straight Flush', example: '6 ♥ 7 ♥ 8 ♥ 9 ♥ 10 ♥', desc: 'Five consecutive cards of the same suit.' },
                { rank: 10, name: '10. Royal Flush', example: '10 ♠ J ♠ Q ♠ K ♠ A ♠', desc: 'The unbeatable poker hand: 10 to Ace of the same suit.' },
              ].map((item) => (
                <div key={item.rank} className="poker-hand-row cel-card">
                  <div className="poker-rank-tag">{item.rank}</div>
                  <div className="poker-hand-details">
                    <strong className="woodcut-title poker-hand-title">{item.name}</strong>
                    <span className="poker-hand-desc">{item.desc}</span>
                  </div>
                  <div className="poker-example-stub ticket-stub">
                    <span className="ticket-stub-code">{item.example}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .doomed-mine-rules-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          user-select: none;
        }
        .rules-tabs-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          border-bottom: var(--border-ink-thin);
          padding-bottom: 12px;
        }
        .rules-panel-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .panel-heading {
          font-size: 20px;
          color: var(--color-text-main);
          letter-spacing: 0.02em;
        }
        .panel-lead-text {
          font-family: var(--font-body);
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-lead);
        }
        .panel-two-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 640px) {
          .panel-two-cards-grid {
            grid-template-columns: 1fr;
          }
        }
        .panel-callout-card {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .victory-callout {
          border-left: 5px solid var(--color-golden-buttercup);
        }
        .defeat-callout {
          border-left: 5px solid var(--color-cuphead-red);
        }
        .callout-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        .panel-callout-card p {
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--color-text-lead);
          margin: 0;
          line-height: 1.4;
        }
        .panel-golden-rule {
          padding: 12px 14px;
          border-radius: var(--radius-cel-box);
          border: var(--border-ink-standard);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .golden-rule-title {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--color-cuphead-red);
          font-size: 14px;
        }
        .panel-golden-rule p {
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--color-text-main);
          margin: 0;
          line-height: 1.4;
        }
        .gold-icon { color: var(--color-golden-buttercup); }
        .crimson-icon { color: var(--color-cuphead-red); }

        /* Phases Flow */
        .phases-flow-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .phase-flow-card {
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .phase-num-chip {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background-color: var(--color-golden-buttercup);
          color: var(--color-ink-black);
          border: var(--border-ink-standard);
          box-shadow: var(--shadow-cel-sm);
          font-family: var(--font-heading);
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .showdown-phase-card {
          border-left: 5px solid var(--color-cuphead-red);
        }
        .showdown-chip {
          background-color: var(--color-cuphead-red);
          color: #ffffff;
        }
        .phase-flow-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .phase-flow-title {
          font-family: var(--font-heading);
          font-size: 14px;
          color: var(--color-text-main);
        }
        .phase-flow-info p {
          font-family: var(--font-body);
          font-size: 12.5px;
          color: var(--color-text-lead);
          margin: 0;
          line-height: 1.35;
        }

        /* Tokens Guide */
        .tokens-guide-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        .token-guide-item {
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .token-guide-chip {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: var(--border-ink-standard);
          box-shadow: var(--shadow-cel-sm);
          font-family: var(--font-heading);
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .chip-low { background-color: var(--color-mugman-cyan); color: #fff; }
        .chip-mid { background-color: var(--color-golden-buttercup); color: #1c1511; }
        .chip-high { background-color: var(--color-cuphead-red); color: #fff; }
        .token-guide-item p {
          font-family: var(--font-body);
          font-size: 12px;
          color: var(--color-text-lead);
          margin: 2px 0 0 0;
        }
        .panel-hint-box {
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--color-text-main);
        }

        /* Poker Hierarchy */
        .poker-hierarchy-table {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .poker-hand-row {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .poker-rank-tag {
          font-family: var(--font-heading);
          font-size: 14px;
          color: var(--color-cuphead-red);
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }
        .poker-hand-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .poker-hand-title {
          font-size: 13.5px;
          color: var(--color-text-main);
        }
        .poker-hand-desc {
          font-family: var(--font-body);
          font-size: 11.5px;
          color: var(--color-text-lead);
        }
        .poker-example-stub {
          flex-shrink: 0;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
