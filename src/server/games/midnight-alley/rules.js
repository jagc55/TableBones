export const leadSuit = (trick) => trick.find((entry) => entry.card.type === 'suit')?.card.suit || null;

export const effectiveRole = (entry) => entry.card.role === 'chameleon' ? (entry.chameleonChoice || 'gangster') : entry.card.role;

export const isPlayable = (card, hand, trick) => {
  if (card.type === 'special') return true;
  const lead = leadSuit(trick);
  return !lead || card.suit === lead || !hand.some((item) => item.type === 'suit' && item.suit === lead);
};

export const evaluateTrick = (trick) => {
  const boss = trick.find((entry) => entry.card.role === 'boss');
  const femmes = trick.filter((entry) => effectiveRole(entry) === 'femme-fatale');
  const gangsters = trick.filter((entry) => effectiveRole(entry) === 'gangster');
  if (boss && femmes.length) return { ...femmes[0], bonusPoints: 50, bonusReason: 'Femme Fatale captivated The Boss.' };
  if (boss) return { ...boss, bonusPoints: gangsters.length * 30, bonusReason: gangsters.length ? 'The Boss captured Gangsters.' : undefined };
  if (gangsters.length) return { ...gangsters[0], bonusPoints: 0 };
  if (femmes.length) return { ...femmes[0], bonusPoints: 0 };
  const trumps = trick.filter((entry) => entry.card.type === 'suit' && entry.card.suit === 'black');
  if (trumps.length) {
    const winner = trumps.reduce((best, entry) => (entry.card.value > best.card.value ? entry : best));
    return { ...winner, bonusPoints: winner.card.value === 14 ? 20 : 0 };
  }
  const lead = leadSuit(trick);
  const suited = lead ? trick.filter((entry) => entry.card.type === 'suit' && entry.card.suit === lead) : [];
  if (suited.length) {
    const winner = suited.reduce((best, entry) => (entry.card.value > best.card.value ? entry : best));
    return { ...winner, bonusPoints: winner.card.value === 14 ? 10 : 0 };
  }
  const nonAlibi = trick.find((entry) => effectiveRole(entry) !== 'alibi');
  return { ...(nonAlibi || trick[0]), bonusPoints: 0 };
};

export const scoreRound = (state) => {
  const breakdown = {};
  for (const playerId of state.playerOrder) {
    const bid = state.bids[playerId] || 0;
    const won = state.tricksWon[playerId] || 0;
    const bonus = state.roundBonuses[playerId] || 0;
    const bidScore = bid === 0 ? (won === 0 ? 10 * state.round : -10 * state.round) : (won === bid ? 20 * bid : -10 * Math.abs(won - bid));
    const bonusScore = bid > 0 && won === bid ? bonus : 0;
    const totalRoundScore = bidScore + bonusScore;
    state.cumulativeScores[playerId] += totalRoundScore;
    breakdown[playerId] = { playerId, bid, tricksWon: won, bidScore, bonusScore, totalRoundScore, cumulativeScore: state.cumulativeScores[playerId] };
  }
  return breakdown;
};
