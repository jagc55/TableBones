import { createBonegleState } from './bonegle/engine.js';
import { createMidnightState } from './midnight-alley/engine.js';
import { dealMidnightRound } from './midnight-alley/deck.js';
export { submitBonegleWord, resolveBonegle } from './bonegle/engine.js';
export { submitMidnightAction, projectMatchState } from './midnight-alley/engine.js';
export { automaticMidnightAction } from './midnight-alley/bot.js';
export { setDeadline } from './deadline.js';
export const createMatchState = (room, matchId) => room.gameId === 'bonegle'
  ? createBonegleState(room, matchId)
  : createMidnightState(room, matchId);
export const removePlayerFromMatch = (state, userId) => {
  if (!state.players.some((player) => player.id === userId)) return false;

  state.players = state.players.filter((player) => player.id !== userId);
  if (state.gameId === 'bonegle') {
    delete state.submittedWords[userId];
    if (state.breakdowns) delete state.breakdowns[userId];
    return true;
  }

  state.playerOrder = state.playerOrder.filter((playerId) => playerId !== userId);
  delete state.hands[userId];
  delete state.bids[userId];
  delete state.tricksWon[userId];
  delete state.roundBonuses[userId];
  delete state.cumulativeScores[userId];
  state.currentTrick = [];

  if (state.playerOrder.length > 0 && state.phase !== 'game_over') {
    dealMidnightRound(state);
  } else {
    state.turnPlayerId = null;
    state.leadPlayerId = null;
  }
  return true;
};

export const matchScores = (state) => {
  if (state.gameId === 'bonegle') return Object.fromEntries(state.players.map((player) => [player.id, state.breakdowns?.[player.id]?.score || 0]));
  return { ...state.cumulativeScores };
};
