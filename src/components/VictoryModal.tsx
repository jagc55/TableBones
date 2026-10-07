import React, { useState } from 'react';
import { Trophy, Crown, RotateCcw, ArrowLeft, Award, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Record<string, boolean>>({});

  if (!isOpen || !winnerPlayer) return null;

  // Sort players by score descending
  const sortedPlayers = [...allPlayers].sort((a, b) => b.score - a.score);

  const togglePlayerExpanded = (playerId: string) => {
    soundstage.playTap();
    setExpandedPlayerIds((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  return (
    <div className="modal-overlay victory-overlay-wrap">
      <div className="modal-content victory-modal-card">
        {/* Top Theatrical Banner */}
        <div className="victory-banner-top">
          <span className="ribbon-banner">MATCH RESULTS</span>
          <h2 className="woodcut-title victory-main-title">VICTORY!</h2>
          <span className="victory-subtitle">WINNER DECLARED</span>
        </div>

        {/* Walkover / Outcome Banner */}
        {winReason && (
          <div className="win-reason-strip">
            <Award size={26} strokeWidth={2.8} className="win-award-icon" />
            <div className="win-reason-text">
              <strong>NOTICE:</strong>
              <span>{winReason}</span>
            </div>
          </div>
        )}

        {/* The Winner Podium Card */}
        <div className="podium-section">
          <div className="champion-podium-card cel-card-gold">
            <div className="podium-crown-ring">
              <Crown size={28} strokeWidth={3} className="crown-svg" />
            </div>

            <div className="champion-avatar-box">
              <AvatarIcon id={winnerPlayer.avatarId} size={88} />
            </div>

            <div className="champion-details">
              <span className="champion-title-tag">MATCH WINNER</span>
              <h3 className="woodcut-title champion-name">{winnerPlayer.name}</h3>
              <div className="champion-score-pill">
                <Trophy size={18} strokeWidth={2.8} />
                <span>{winnerPlayer.score} TOTAL POINTS</span>
              </div>
            </div>
          </div>

          {/* All Players Standings with Expanders */}
          <div className="runnerups-standings">
            <h4 className="standings-heading">FINAL STANDINGS & FOUND WORDS</h4>
            <div className="standings-list">
              {sortedPlayers.map((player, idx) => {
                const isExpanded = !!expandedPlayerIds[player.id];
                const breakdown = player.wordsBreakdown;
                const hasWords =
                  breakdown &&
                  (breakdown.uniqueWords.length > 0 || breakdown.sharedWords.length > 0);

                return (
                  <div key={player.id} className="player-standings-item">
                    <div
                      className={`standings-row ${
                        player.id === winnerPlayer.id ? 'standing-champ-row' : ''
                      } ${hasWords ? 'standings-row-clickable' : ''}`}
                      onClick={() => hasWords && togglePlayerExpanded(player.id)}
                      title={hasWords ? 'Click to view found words' : undefined}
                    >
                      <span className="standing-rank">#{idx + 1}</span>
                      <div className="standing-avatar">
                        <AvatarIcon id={player.avatarId} size={30} />
                      </div>
                      <span className="standing-name">{player.name}</span>
                      <div className="standing-score-wrap">
                        <strong className="standing-score">{player.score} PTS</strong>
                        {hasWords && (
                          <button
                            type="button"
                            className="standing-chevron-btn"
                            aria-label="Toggle words details"
                          >
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Word Details Expander */}
                    {isExpanded && breakdown && (
                      <div className="player-words-expander cel-card">
                        {/* Unique Words */}
                        <div className="expander-section">
                          <span className="expander-subtitle">
                            ★ Unique Words ({breakdown.uniqueWords.length}) <small className="mult-label">x2 PTS</small>
                          </span>
                          <div className="expander-chips-box">
                            {breakdown.uniqueWords.length === 0 ? (
                              <span className="expander-empty">None found</span>
                            ) : (
                              breakdown.uniqueWords.map((uw) => (
                                <span key={uw.word} className="word-chip unique-chip">
                                  {uw.word} <strong>+{uw.pts}</strong>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Shared Words */}
                        <div className="expander-section">
                          <span className="expander-subtitle">
                            ≈ Shared Words ({breakdown.sharedWords.length}) <small className="mult-label neutral">x1 PT</small>
                          </span>
                          <div className="expander-chips-box">
                            {breakdown.sharedWords.length === 0 ? (
                              <span className="expander-empty">None found</span>
                            ) : (
                              breakdown.sharedWords.map((sw) => (
                                <span key={sw.word} className="word-chip shared-chip">
                                  {sw.word} <strong>+{sw.pts}</strong>
                                  {sw.sharedWith && sw.sharedWith.length > 0 && (
                                    <small className="chip-with">({sw.sharedWith.join(', ')})</small>
                                  )}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
            <span>PLAY AGAIN</span>
          </button>
        </div>

        <style>{`
          .victory-overlay-wrap {
            z-index: 1300;
          }
          .victory-modal-card {
            max-width: 720px;
            width: 95vw;
            max-height: 92vh;
            text-align: center;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border-width: 3.5px;
          }
          .podium-section {
            padding: 22px 24px;
            display: flex;
            flex-direction: column;
            gap: 18px;
            align-items: center;
            overflow-y: auto;
            max-height: calc(92vh - 200px);
          }
          .victory-banner-top {
            background-color: var(--color-cuphead-red);
            color: var(--color-glove-ivory);
            padding: 22px 26px 18px;
            border-bottom: var(--border-ink-thick);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
          }
          .victory-banner-top .ribbon-banner {
            color: var(--color-golden-buttercup);
            font-size: 15px;
            letter-spacing: 0.12em;
          }
          .victory-main-title {
            font-size: 50px;
            color: #ffffff;
            margin: 2px 0;
            text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.55);
            letter-spacing: 0.04em;
          }
          .victory-subtitle {
            font-family: var(--font-theatre-rye);
            font-size: 13px;
            letter-spacing: 0.14em;
            color: var(--color-golden-buttercup);
          }
          .win-reason-strip {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            background-color: var(--color-golden-buttercup);
            border-bottom: var(--border-ink-thick);
            padding: 12px 20px;
            text-align: left;
            color: #1c1511;
          }
          .win-award-icon {
            color: var(--color-cuphead-red);
            flex-shrink: 0;
          }
          .win-reason-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 17px;
            font-family: var(--font-comic-fredoka);
            font-weight: 700;
            line-height: 1.3;
          }
          .win-reason-text strong {
            font-family: var(--font-theatre-rye);
            font-size: 13px;
            letter-spacing: 0.12em;
            color: var(--color-cuphead-red);
          }
          .champion-podium-card {
            width: 100%;
            max-width: 580px;
            padding: 28px 26px 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            background-color: var(--color-golden-buttercup);
            color: #1c1511;
            border-width: 3px;
            border-radius: 16px;
          }
          .podium-crown-ring {
            position: absolute;
            top: -22px;
            background-color: var(--color-cuphead-red);
            color: var(--color-golden-buttercup);
            border: 2.5px solid var(--color-ink-stroke);
            border-radius: 999px;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--shadow-cel-sm);
          }
          .champion-avatar-box {
            border: 3px solid var(--color-ink-stroke);
            border-radius: 16px;
            overflow: hidden;
            background-color: var(--color-glove-ivory);
            margin-top: 10px;
            box-shadow: var(--shadow-cel-sm);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .champion-details {
            margin-top: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
          }
          .champion-title-tag {
            font-family: var(--font-theatre-rye);
            font-size: 13px;
            letter-spacing: 0.12em;
            color: var(--color-cuphead-red);
            font-weight: 700;
          }
          .champion-name {
            font-size: 34px;
            color: #1c1511;
          }
          .champion-score-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: var(--color-glove-ivory);
            border: 2.5px solid var(--color-ink-stroke);
            border-radius: 999px;
            padding: 6px 20px;
            font-family: var(--font-luckiest-guy);
            font-size: 18px;
            color: #1c1511;
            box-shadow: var(--shadow-cel-sm);
          }
          .runnerups-standings {
            width: 100%;
            max-width: 700px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .standings-heading {
            font-family: var(--font-theatre-rye);
            font-size: 14px;
            letter-spacing: 0.08em;
            color: var(--color-text-muted);
            text-align: left;
          }
          .standings-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .standings-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: var(--color-glove-ivory);
            border: 2px solid var(--color-ink-stroke);
            border-radius: 12px;
            padding: 12px 18px;
            box-shadow: var(--shadow-cel-sm);
          }
          .standing-champ-row {
            background-color: var(--color-golden-buttercup);
            border-color: var(--color-ink-stroke);
            color: #1c1511;
          }
          .standing-rank {
            font-family: var(--font-luckiest-guy);
            font-size: 18px;
            width: 30px;
            color: var(--color-text-main);
          }
          .standing-avatar {
            border: 2px solid var(--color-ink-stroke);
            border-radius: 8px;
            overflow: hidden;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .standing-name {
            flex: 1;
            text-align: left;
            font-family: var(--font-comic-fredoka);
            font-weight: 700;
            font-size: 18px;
            color: var(--color-text-main);
          }
          .standing-score {
            font-family: var(--font-typewriter-elite);
            font-size: 20px;
            color: var(--color-cuphead-red);
          }
          .player-standings-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .standings-row-clickable {
            cursor: pointer;
            transition: transform 0.1s ease, filter 0.1s ease;
          }
          .standings-row-clickable:hover {
            transform: translateY(-1.5px);
            filter: brightness(1.02);
          }
          .standing-score-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .standing-chevron-btn {
            background: none;
            border: none;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-ink-stroke);
            cursor: pointer;
          }
          .player-words-expander {
            background-color: var(--color-parchment-deep);
            border: 2.5px solid var(--color-ink-stroke);
            border-radius: 10px;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            text-align: left;
            margin-top: 2px;
            animation: fadeIn 0.15s ease-out;
          }
          .expander-section {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .expander-subtitle {
            font-family: var(--font-theatre-rye);
            font-size: 13.5px;
            letter-spacing: 0.06em;
            color: var(--color-text-main);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .mult-label {
            font-size: 11.5px;
            padding: 2px 8px;
            border-radius: 4px;
            background-color: var(--color-cuphead-red);
            color: var(--color-glove-ivory);
            font-weight: 700;
          }
          .mult-label.neutral {
            background-color: var(--color-ink-stroke);
          }
          .expander-chips-box {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .expander-empty {
            font-size: 13.5px;
            color: var(--color-text-muted);
            font-style: italic;
          }
          .word-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 6px;
            border: 2px solid var(--color-ink-stroke);
            font-family: var(--font-comic-fredoka);
            font-size: 15px;
            font-weight: 700;
          }
          .unique-chip {
            background-color: var(--color-golden-buttercup);
            color: #1c1511;
          }
          .unique-chip strong {
            color: var(--color-cuphead-red);
          }
          .shared-chip {
            background-color: var(--color-glove-ivory);
            color: #1c1511;
          }
          .chip-with {
            font-size: 11px;
            color: var(--color-text-muted);
            font-weight: 400;
          }
          .victory-actions-footer {
            padding: 16px 24px 20px;
            background-color: var(--color-parchment-deep);
            border-top: var(--border-ink-thick);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          .rematch-btn {
            font-size: 17px;
            padding: 12px 24px;
          }
        `}</style>
      </div>
    </div>
  );
};
