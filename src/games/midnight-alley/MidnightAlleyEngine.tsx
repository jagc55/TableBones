import React, { useEffect, useState } from 'react';
import { BaseGameEngineProps } from '../../types';
import { MidnightCard } from './types';
import { MidnightCardView, ChameleonIcon } from './MidnightCards';
import { AvatarIcon } from '../../utils/avatars';
import { soundstage } from '../../utils/audio';
import { CheckCircle2, Users, Crown, X, Swords } from 'lucide-react';

export const MidnightAlleyEngine: React.FC<BaseGameEngineProps> = ({
  currentUserPlayer,
  players,
  matchState,
  onGameAction,
}) => {
  const match = matchState?.gameId === 'midnight-alley' ? matchState : null;
  const [pendingBid, setPendingBid] = useState(0);
  const [chameleonCard, setChameleonCard] = useState<MidnightCard | null>(null);

  useEffect(() => {
    setPendingBid(0);
    setChameleonCard(null);
  }, [match?.round, match?.phase]);

  if (!match) {
    return <div className="midnight-waiting cel-card">Waiting for the server to deal Midnight Alley.</div>;
  }

  const isMyTurn = match.turnPlayerId === currentUserPlayer.id;
  const myHand = match.hands[currentUserPlayer.id] || [];
  const canBid = match.phase === 'bidding' && isMyTurn;
  const canPlay = match.phase === 'playing' && isMyTurn;
  const trickWinner = match.lastResult
    ? players.find((player) => player.id === match.lastResult?.winnerPlayerId)
    : null;

  const submitCard = (card: MidnightCard, chameleonChoice?: 'gangster' | 'alibi') => {
    if (!canPlay) return;
    onGameAction?.({ type: 'PLAY_CARD', cardId: card.id, chameleonChoice });
    soundstage.playTap();
    setChameleonCard(null);
  };

  return (
    <div className="midnight-authoritative-engine">
      <div className="midnight-roster cel-card">
        <div className="midnight-roster-title"><Users size={17} /> <span>ROUND {match.round}/{match.maxRounds}</span></div>
        {players.map((player) => {
          const isTurn = player.id === match.turnPlayerId;
          return (
            <div key={player.id} className={`midnight-player-row ${isTurn ? 'midnight-player-turn' : ''}`}>
              <AvatarIcon id={player.avatarId} size={28} />
              <strong>{player.name}{player.id === currentUserPlayer.id ? ' (You)' : ''}</strong>
              {player.isHost && <Crown size={13} />}
              <span>BID {match.bids[player.id] ?? '-'}</span>
              <span>WON {match.tricksWon[player.id] || 0}</span>
              <span>{match.handCounts[player.id] || 0} cards</span>
              <b>{match.cumulativeScores[player.id] || 0} pts</b>
            </div>
          );
        })}
      </div>

      <section className="midnight-table cel-card">
        <div className="midnight-table-header">
          <span>{match.phase === 'bidding' ? 'TAKING BIDS' : match.phase === 'game_over' ? 'MATCH COMPLETE' : 'CURRENT TRICK'}</span>
          <strong>{isMyTurn ? 'YOUR TURN' : 'WAITING FOR OPPONENT'}</strong>
        </div>
        {match.currentTrick.length === 0 ? (
          <p className="midnight-empty-trick">{match.phase === 'bidding' ? 'Each contender declares a bid in turn.' : 'The lead player is choosing a card.'}</p>
        ) : (
          <div className="midnight-trick-row">
            {match.currentTrick.map((played) => {
              const player = players.find((entry) => entry.id === played.playerId);
              return (
                <div key={`${played.playerId}-${played.card.id}`} className="midnight-played-card">
                  <span>{player?.name || played.playerName}</span>
                  <MidnightCardView card={played.card} compact chameleonChoice={played.chameleonChoice} isPlayable={false} />
                </div>
              );
            })}
          </div>
        )}
        {trickWinner && <div className="midnight-result">{trickWinner.name} took the last trick{match.lastResult?.bonusPoints ? ` (+${match.lastResult.bonusPoints})` : ''}.</div>}
      </section>

      {canBid && (
        <section className="midnight-bid-panel cel-card">
          <span className="midnight-panel-label">DECLARE YOUR BID</span>
          <div className="midnight-bid-options">
            {Array.from({ length: match.round + 1 }, (_, bid) => (
              <button key={bid} type="button" className={`btn-cel ${pendingBid === bid ? 'btn-brawl-primary' : 'btn-brawl-neutral'}`} onClick={() => setPendingBid(bid)}>{bid}</button>
            ))}
          </div>
          <button type="button" className="btn-cel btn-brawl-primary" onClick={() => onGameAction?.({ type: 'PLACE_BID', bid: pendingBid })}>
            <CheckCircle2 size={16} /> <span>CONFIRM {pendingBid}</span>
          </button>
        </section>
      )}

      <section className="midnight-hand cel-card">
        <div className="midnight-hand-header"><span>YOUR HAND ({myHand.length})</span>{canPlay && <strong>PLAY A CARD</strong>}</div>
        <div className="midnight-hand-cards">
          {myHand.map((card) => (
            <MidnightCardView
              key={card.id}
              card={card}
              compact={myHand.length > 7}
              isPlayable={canPlay}
              isDimmed={!canPlay}
              onClick={() => card.role === 'chameleon' ? setChameleonCard(card) : submitCard(card)}
            />
          ))}
        </div>
      </section>

      {chameleonCard && canPlay && (
        <div className="modal-overlay" onClick={() => setChameleonCard(null)}>
          <div className="modal-content midnight-choice-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="btn-cel btn-icon-sq btn-brawl-neutral midnight-close" onClick={() => setChameleonCard(null)} title="Cancel"><X size={18} /></button>
            <ChameleonIcon size={52} />
            <h3 className="woodcut-title">CHAMELEON'S ROLE</h3>
            <div className="midnight-choice-buttons">
              <button type="button" className="btn-cel btn-brawl-primary" onClick={() => submitCard(chameleonCard, 'gangster')}><Swords size={16} /> <span>PLAY AS GANGSTER</span></button>
              <button type="button" className="btn-cel btn-brawl-neutral" onClick={() => submitCard(chameleonCard, 'alibi')}><span>PLAY AS ALIBI</span></button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .midnight-authoritative-engine { display: grid; grid-template-columns: 245px minmax(0, 1fr); gap: 14px; width: 100%; }
        .midnight-roster { padding: 12px; display: flex; flex-direction: column; gap: 7px; }
        .midnight-roster-title, .midnight-player-row, .midnight-table-header, .midnight-hand-header { display: flex; align-items: center; gap: 7px; }
        .midnight-roster-title { font-family: var(--font-luckiest-guy); }
        .midnight-player-row { flex-wrap: wrap; padding: 7px; border: 1px solid var(--color-ink-black); font-size: 11px; }
        .midnight-player-row strong { flex: 1; min-width: 105px; }
        .midnight-player-row b { color: var(--color-cuphead-red); }
        .midnight-player-turn { background: var(--color-golden-buttercup); }
        .midnight-table { min-height: 270px; padding: 14px; background: #244a37; color: var(--color-glove-ivory); }
        .midnight-table-header { justify-content: space-between; font-family: var(--font-luckiest-guy); letter-spacing: .04em; }
        .midnight-empty-trick { text-align: center; padding: 80px 12px; color: #e8dcc8; }
        .midnight-trick-row, .midnight-hand-cards { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
        .midnight-played-card { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 12px; }
        .midnight-result { text-align: center; margin-top: 12px; font-family: var(--font-luckiest-guy); color: var(--color-golden-buttercup); }
        .midnight-bid-panel, .midnight-hand { grid-column: 2; padding: 14px; }
        .midnight-panel-label { display: block; font-family: var(--font-theatre-rye); font-size: 11px; margin-bottom: 8px; }
        .midnight-bid-options { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
        .midnight-hand-header { justify-content: space-between; margin-bottom: 12px; font-family: var(--font-luckiest-guy); }
        .midnight-choice-modal { position: relative; max-width: 420px; display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 26px; }
        .midnight-close { position: absolute; top: 8px; right: 8px; }
        .midnight-choice-buttons { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        @media (max-width: 800px) { .midnight-authoritative-engine { grid-template-columns: 1fr; } .midnight-bid-panel, .midnight-hand { grid-column: 1; } }
      `}</style>
    </div>
  );
};
