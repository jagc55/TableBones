/**
 * Sanitizes the Doomed Mine state for transmission to a specific user.
 * During active rounds, opponents' pocket cards and unrevealed community cards are completely withheld.
 * During showdown and game_over, all cards are revealed.
 */
export function projectState(state, userId) {
  if (!state) return state;

  const isRevealed = state.phase === 'showdown' || state.phase === 'game_over';

  const projectedPrivateCards = {};
  for (const player of state.players || []) {
    if (isRevealed || player.id === userId) {
      projectedPrivateCards[player.id] = state.privateCards?.[player.id] || [];
    } else {
      // Withhold opponent cards from the client
      projectedPrivateCards[player.id] = [];
    }
  }

  // Shallow copy state without server-internal secrets
  const { hiddenCommunityCards, ...sanitized } = state;

  return {
    ...sanitized,
    privateCards: projectedPrivateCards,
  };
}
