import { isPlayable } from './rules.js';

export const calculateBid = (hand) => Math.max(0, Math.min(hand.length, Math.round(hand.reduce((total, card) => {
  if (card.role === 'boss') return total + 1;
  if (card.role === 'gangster') return total + 0.85;
  if (card.role === 'femme-fatale') return total + 0.75;
  if (card.role === 'chameleon') return total + 0.5;
  if (card.role === 'fat-vinnie') return total + 0.2;
  if (card.role === 'alibi' || card.role === 'briefcase' || card.role === 'police') return total - 0.1;
  if (card.suit === 'black') return total + (card.value >= 12 ? 0.85 : card.value >= 8 ? 0.5 : 0.2);
  return total + (card.value >= 13 ? 0.45 : card.value >= 11 ? 0.2 : 0);
}, 0))));

export const choosePlay = (state, playerId) => {
  const hand = state.hands[playerId];
  const legal = hand.filter((card) => isPlayable(card, hand, state.currentTrick));
  const needsTrick = state.tricksWon[playerId] < state.bids[playerId];

  const escapeCard = legal.find((card) => card.role === 'alibi' || card.role === 'briefcase');
  if (!needsTrick && escapeCard) return { card: escapeCard };

  // If we don't need tricks and hold The Police, destroying the trick is a safe escape
  const policeCard = legal.find((card) => card.role === 'police');
  if (!needsTrick && policeCard) return { card: policeCard };

  const chameleon = legal.find((card) => card.role === 'chameleon');
  if (chameleon) return { card: chameleon, chameleonChoice: needsTrick ? 'gangster' : 'alibi' };

  const ordered = [...legal].sort((left, right) => ((right.suit === 'black' ? 20 : 0) + (right.value || 0)) - ((left.suit === 'black' ? 20 : 0) + (left.value || 0)));
  return { card: needsTrick ? ordered[0] : ordered[ordered.length - 1] };
};

export const automaticMidnightAction = (state) => {
  if (state.phase === 'trick_resolved') {
    return { userId: state.playerOrder[0], action: { type: 'ADVANCE_TRICK' } };
  }
  if (state.phase === 'round_summary') {
    return { userId: state.playerOrder[0], action: { type: 'NEXT_ROUND' } };
  }
  if (state.phase === 'bidding') {
    for (const player of state.players) {
      if (player.isBot && state.bids[player.id] === undefined) {
        return { userId: player.id, action: { type: 'PLACE_BID', bid: calculateBid(state.hands[player.id] || []) } };
      }
    }
    if (state.turnPlayerId && state.bids[state.turnPlayerId] === undefined) {
      return { userId: state.turnPlayerId, action: { type: 'PLACE_BID', bid: calculateBid(state.hands[state.turnPlayerId] || []) } };
    }
    return null;
  }
  if (state.phase === 'playing') {
    const playerId = state.turnPlayerId;
    if (!playerId) return null;
    const play = choosePlay(state, playerId);
    return { userId: playerId, action: { type: 'PLAY_CARD', cardId: play.card.id, chameleonChoice: play.chameleonChoice } };
  }
  return null;
};
