import { estimateHandStrength } from './poker.js';

/**
 * Generates an automatic move for bot contenders in Doomed Mine.
 */
export function getAutomaticDoomedMineAction(state) {
  if (!state || state.phase === 'showdown' || state.phase === 'game_over') {
    return null;
  }

  const bots = state.players.filter((p) => p.isBot);
  const totalPlayers = state.players.length;

  // 1. If any bot has not selected a token yet
  for (const bot of bots) {
    const currentToken = state.tokens[bot.id];

    if (currentToken === null || currentToken === undefined) {
      const pocketCards = state.privateCards[bot.id] || [];
      const strength = estimateHandStrength(pocketCards, state.communityCards || []);
      const idealToken = Math.min(
        totalPlayers,
        Math.max(1, Math.round(1 + strength * (totalPlayers - 1)))
      );

      // Prefer available tokens
      let chosenToken = idealToken;
      const available = state.availableTokens || [];

      if (!available.includes(chosenToken)) {
        if (available.length > 0) {
          // Pick closest available
          chosenToken = available.reduce((prev, curr) =>
            Math.abs(curr - idealToken) < Math.abs(prev - idealToken) ? curr : prev
          );
        }
      }

      return {
        userId: bot.id,
        action: { type: 'SELECT_TOKEN', token: chosenToken },
      };
    }
  }

  // 2. If all players have a token, and the host is a bot, the bot host advances the phase
  const allHaveTokens = state.players.every(
    (p) => state.tokens[p.id] !== null && state.tokens[p.id] !== undefined
  );

  if (allHaveTokens) {
    const hostId = state.hostId || state.players[0]?.id;
    const hostPlayer = state.players.find((p) => p.id === hostId);
    if (hostPlayer?.isBot) {
      return {
        userId: hostId,
        action: { type: 'ADVANCE_PHASE' },
      };
    }
  }

  return null;
}
