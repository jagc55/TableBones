import React from 'react';
import { Trophy, Crown, RotateCcw, ArrowLeft, Award } from 'lucide-react';
import { Player } from '../types';
import { AvatarIcon } from '../utils/avatars';
import { soundstage } from '../utils/audio';

interface VictoryModalProps {
  isOpen: boolean;
  winnerPlayer: Player | null;
  allPlayers: Player[];
  winReason?: string | null;
  onRematch: () => void;
  onReturnToLobby: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  winnerPlayer,
  allPlayers,
  winReason,
  onRematch,
  onReturnToLobby,
}) => {
  if (!isOpen || !winnerPlayer) return null;

  // Sort players by score descending
  const sortedPlayers = [...allPlayers].sort((a, b) => b.score - a.score);

  return (
    <div className="modal-overlay victory-overlay-wrap">
      <div className="modal-content victory-modal-card">
        {/* Top Theatrical Banner */}
        <div className="victory-banner-top">
          <span className="ribbon-banner">THE JUDGES’ VERDICT</span>
          <h2 className="woodcut-title victory-main-title">KNOCKOUT!</h2>
          <span className="victory-subtitle">CHAMPION DECLARED</span>
        </div>

        {/* Walkover / Specific Bout Outcome Banner */}
        {winReason && (
          <div className="win-reason-strip">
            <Award size={18} strokeWidth={2.8} className="win-award-icon" />
            <div className="win-reason-text">
              <strong>JUDGES' NOTICE:</strong>
              <span>{winReason}</span>
            </div>
          </div>
        )}

        {/* The Winner Podium Card */}
        <div className="podium-section">
          <div className="champion-podium-card cel-card-gold">
            <div className="podium-crown-ring">
              <Crown size={22} strokeWidth={3} className="crown-svg" />
            </div>

            <div className="champion-avatar-box">
              <AvatarIcon id={winnerPlayer.avatarId} size={70} />
            </div>

            <div className="champion-details">
              <span className="champion-title-tag">PARLOR VICTOR</span>
              <h3 className="woodcut-title champion-name">{winnerPlayer.name}</h3>
              <div className="champion-score-pill">
                <Trophy size={14} strokeWidth={2.8} />
                <span>{winnerPlayer.score} TOTAL POINTS</span>
              </div>
            </div>
          </div>

          {/* Other Players Standings */}
          {sortedPlayers.length > 1 && (
            <div className="runnerups-standings">
              <h4 className="standings-heading">FINAL STANDINGS</h4>
              <div className="standings-list">
                {sortedPlayers.map((player, idx) => (
                  <div
                    key={player.id}
                    className={`standings-row ${player.id === winnerPlayer.id ? 'standing-champ-row' : ''}`}
                  >
                    <span className="standing-rank">#{idx + 1}</span>
                    <div className="standing-avatar">
                      <AvatarIcon id={player.avatarId} size={22} />
                    </div>
                    <span className="standing-name">{player.name}</span>
                    <strong className="standing-score">{player.score} PTS</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="victory-actions-footer">
          <button
            onClick={() => {
              soundstage.playTap();
              onReturnToLobby();
            }}
            className="btn-cel btn-brawl-neutral btn-sm"
          >
            <ArrowLeft size={15} strokeWidth={2.8} />
            <span>RETURN TO LOBBY</span>
          </button>

          <button
            onClick={() => {
              soundstage.playRoundBell();
              onRematch();
            }}
            className="btn-cel btn-brawl-primary rematch-btn"
          >
            <RotateCcw size={16} strokeWidth={3} />
            <span>ANOTHER BOUT</span>
          </button>
        </div>

        <style>{`
          .victory-overlay-wrap {
            z-index: 1300;
          }
          .victory-modal-card {
            max-width: 520px;
            text-align: center;
            overflow: hidden;
          }
          .victory-banner-top {
            background-color: var(--color-cuphead-red);
            color: var(--color-glove-ivory);
            padding: 16px 20px 12px;
            border-bottom: var(--border-ink-thick);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
          }
          .victory-banner-top .ribbon-banner {
            color: var(--color-golden-buttercup);
          }
          .victory-main-title {
            font-size: 32px;
            color: #ffffff;
            margin: 2px 0;
            text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.4);
          }
          .victory-subtitle {
            font-family: var(--font-theatre-rye);
            font-size: 10px;
            letter-spacing: 0.12em;
            color: var(--color-golden-buttercup);
          }
          .win-reason-strip {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background-color: var(--color-golden-buttercup);
            border-bottom: var(--border-ink-thin);
            padding: 8px 14px;
            text-align: left;
            color: #1c1511;
          }
          .win-award-icon {
            color: #1c1511;
            flex-shrink: 0;
          }
          .win-reason-text {
            display: flex;
            flex-direction: column;
            font-size: 12.5px;
            line-height: 1.2;
          }
          .win-reason-text strong {
            font-family: var(--font-theatre-rye);
            font-size: 9.5px;
            letter-spacing: 0.08em;
            color: var(--color-cuphead-red);
          }
          .podium-section {
            padding: 20px 18px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
          }
          .champion-podium-card {
            width: 100%;
            max-width: 360px;
            padding: 20px 16px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            background-color: var(--color-golden-buttercup);
            color: #1c1511;
          }
          .podium-crown-ring {
            position: absolute;
            top: -16px;
            background-color: var(--color-cuphead-red);
            color: var(--color-golden-buttercup);
            border: 2px solid var(--color-ink-stroke);
            border-radius: 999px;
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--shadow-cel-sm);
          }
          .champion-avatar-box {
            border: 2.5px solid var(--color-ink-stroke);
            border-radius: 12px;
            overflow: hidden;
            background-color: var(--color-glove-ivory);
            margin-top: 6px;
            box-shadow: var(--shadow-cel-sm);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .champion-details {
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
          }
          .champion-title-tag {
            font-family: var(--font-theatre-rye);
            font-size: 9.5px;
            letter-spacing: 0.1em;
            color: var(--color-cuphead-red);
            font-weight: 700;
          }
          .champion-name {
            font-size: 22px;
            color: #1c1511;
          }
          .champion-score-pill {
            display: flex;
            align-items: center;
            gap: 5px;
            background-color: var(--color-glove-ivory);
            border: 1.5px solid var(--color-ink-stroke);
            border-radius: 999px;
            padding: 3px 12px;
            font-family: var(--font-luckiest-guy);
            font-size: 13px;
            color: #1c1511;
            box-shadow: var(--shadow-cel-sm);
          }
          .runnerups-standings {
            width: 100%;
            max-width: 360px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .standings-heading {
            font-family: var(--font-theatre-rye);
            font-size: 9.5px;
            letter-spacing: 0.08em;
            color: var(--color-text-muted);
            text-align: left;
          }
          .standings-list {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .standings-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: var(--color-glove-ivory);
            border: var(--border-ink-thin);
            border-radius: 7px;
            padding: 6px 10px;
            box-shadow: var(--shadow-cel-sm);
          }
          .standing-champ-row {
            background-color: var(--color-golden-buttercup);
            border-color: var(--color-ink-stroke);
            color: #1c1511;
          }
          .standing-rank {
            font-family: var(--font-luckiest-guy);
            font-size: 13px;
            width: 20px;
            color: var(--color-text-main);
          }
          .standing-avatar {
            border: 1px solid var(--color-ink-stroke);
            border-radius: 4px;
            overflow: hidden;
            margin-right: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .standing-name {
            flex: 1;
            text-align: left;
            font-family: var(--font-comic-fredoka);
            font-weight: 700;
            font-size: 13px;
            color: var(--color-text-main);
          }
          .standing-score {
            font-family: var(--font-typewriter-elite);
            font-size: 13px;
            color: var(--color-cuphead-red);
          }
          .victory-actions-footer {
            padding: 12px 18px 16px;
            background-color: var(--color-parchment-deep);
            border-top: var(--border-ink-standard);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .rematch-btn {
            font-size: 15px;
            padding: 9px 18px;
          }
        `}</style>
      </div>
    </div>
  );
};
