import React, { useState } from 'react';
import { BaseGameEngineProps } from '../../types';
import { soundstage } from '../../utils/audio';
import { Dices, Swords } from 'lucide-react';
import { DiceBid } from './types';
import { rollDiceSet, evaluateBluff } from './skullBonesLogic';

export const SkullBonesEngine: React.FC<BaseGameEngineProps> = ({
  currentUserPlayer,
  onPlayerScore,
  onActionNotification,
}) => {
  const [myDice, setMyDice] = useState<number[]>([4, 2, 6, 5, 3]);
  const [currentBid, setCurrentBid] = useState<DiceBid>({ count: 2, face: 4 });
  const [bluffResult, setBluffResult] = useState<string | null>(null);

  const handleRollDice = () => {
    soundstage.playRoundBell();
    const newDice = rollDiceSet(5);
    setMyDice(newDice);
    setBluffResult(null);
    onActionNotification(`${currentUserPlayer.name} rattled their leather dice cup!`);
  };

  const handleCallBluff = () => {
    soundstage.playScoreTrumpet();
    const { isBluff, matchCount } = evaluateBluff(myDice, currentBid);
    if (isBluff) {
      onPlayerScore(currentUserPlayer.id, 8);
      setBluffResult(`BLUFF CAUGHT! Only ${matchCount} of Face ${currentBid.face} existed. +8 PTS!`);
      onActionNotification(`${currentUserPlayer.name} exposed a treacherous liar!`);
    } else {
      setBluffResult(`BID WAS HONEST! ${matchCount} dice matched. Match continues!`);
      onActionNotification(`${currentUserPlayer.name} called an honest bid.`);
    }
  };

  return (
    <div className="dice-stage">
      <div className="dice-cup-card cel-card">
        <span className="stage-subhead">YOUR LEATHER DICE CUP</span>
        <div className="cup-dice-tray">
          {myDice.map((val, idx) => (
            <div key={idx} className="bone-die-face">
              <span className="bone-die-num">{val}</span>
            </div>
          ))}
        </div>
        <button onClick={handleRollDice} className="btn-cel btn-brawl-secondary roll-cup-btn">
          <Dices size={18} strokeWidth={2.8} />
          <span>RATTLE & ROLL CUP</span>
        </button>
      </div>

      <div className="saloon-bid-card cel-card">
        <span className="stage-subhead">TABLE BIDDING STATUS</span>
        <div className="current-bid-box">
          <span className="bid-label">HIGHEST BID CALL:</span>
          <strong className="bid-quote">
            {currentBid.count} Dice of Face {currentBid.face}
          </strong>
        </div>

        {bluffResult && <div className="bluff-feedback-banner">{bluffResult}</div>}

        <div className="bid-actions-row">
          <button
            onClick={() => {
              soundstage.playTap();
              setCurrentBid({ count: currentBid.count + 1, face: currentBid.face });
              onPlayerScore(currentUserPlayer.id, 3);
              onActionNotification(`${currentUserPlayer.name} raised the bid to ${currentBid.count + 1}!`);
            }}
            className="btn-cel btn-brawl-neutral btn-sm"
          >
            <span>RAISE BID (+1)</span>
          </button>

          <button onClick={handleCallBluff} className="btn-cel btn-brawl-primary btn-sm">
            <Swords size={16} strokeWidth={2.8} />
            <span>CALL LIAR / BLUFF!</span>
          </button>
        </div>
      </div>

      <style>{`
        .dice-stage {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          width: 100%;
        }
        @media (max-width: 720px) {
          .dice-stage {
            grid-template-columns: 1fr;
          }
        }
        .dice-cup-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          background-color: var(--color-canvas-parchment);
        }
        .stage-subhead {
          font-family: var(--font-theatre-rye);
          font-size: 11px;
          letter-spacing: 0.08em;
          color: var(--color-cuphead-red);
        }
        .cup-dice-tray {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          padding: 10px;
          background-color: #241711;
          border: var(--border-ink-thick);
          border-radius: 12px;
          min-width: 220px;
        }
        .bone-die-face {
          width: 44px;
          height: 44px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-cel-sm);
        }
        .bone-die-num {
          font-family: var(--font-luckiest-guy);
          font-size: 24px;
          color: var(--color-ink-black);
        }
        .roll-cup-btn {
          width: 100%;
          font-size: 15px;
          padding: 8px 16px;
        }
        .saloon-bid-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background-color: var(--color-canvas-parchment);
        }
        .current-bid-box {
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: 10px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: var(--shadow-cel-sm);
        }
        .bid-label {
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
        }
        .bid-quote {
          font-family: var(--font-luckiest-guy);
          font-size: 20px;
          color: var(--color-text-main);
          letter-spacing: 0.04em;
        }
        .bluff-feedback-banner {
          background-color: var(--color-golden-buttercup);
          border: var(--border-ink-thin);
          border-radius: 6px;
          padding: 8px 12px;
          font-family: var(--font-comic-fredoka);
          font-size: 13px;
          font-weight: 700;
          color: var(--color-ink-black);
          text-align: center;
          animation: popIn 0.15s ease;
        }
        .bid-actions-row {
          display: flex;
          gap: 10px;
          margin-top: auto;
        }
        .bid-actions-row button {
          flex: 1;
        }
      `}</style>
    </div>
  );
};
