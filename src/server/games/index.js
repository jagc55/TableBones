import { bonegleEngine, createBonegleState, submitBonegleWord, resolveBonegle } from './bonegle/engine.js';
import { midnightAlleyEngine, createMidnightState, submitMidnightAction, projectMatchState } from './midnight-alley/engine.js';
import { dealMidnightRound } from './midnight-alley/deck.js';
import { automaticMidnightAction } from './midnight-alley/bot.js';
import { doomedMineEngine } from './doomed-mine/engine.js';

export {
  bonegleEngine,
  createBonegleState,
  submitBonegleWord,
  resolveBonegle,
  midnightAlleyEngine,
  createMidnightState,
  submitMidnightAction,
  projectMatchState,
  automaticMidnightAction,
  dealMidnightRound,
  doomedMineEngine,
};
export { setDeadline } from './deadline.js';

export const GAME_ENGINES = {
  bonegle: bonegleEngine,
  'midnight-alley': midnightAlleyEngine,
  'doomed-mine': doomedMineEngine,
};

export const getGameEngine = (gameId) => GAME_ENGINES[gameId] || null;

export const registerGameEngine = (engine) => {
  GAME_ENGINES[engine.id] = engine;
};

export const createMatchState = (room, matchId) => {
  const engine = getGameEngine(room.gameId);
  if (!engine) throw new Error(`Unsupported game: ${room.gameId}`);
  return engine.createState(room, matchId);
};

export const removePlayerFromMatch = (state, userId) => {
  if (!state.players.some((player) => player.id === userId)) return false;
  state.players = state.players.filter((player) => player.id !== userId);
  const engine = getGameEngine(state.gameId);
  if (engine?.removePlayer) {
    return engine.removePlayer(state, userId);
  }
  return true;
};

export const matchScores = (state) => {
  const engine = getGameEngine(state.gameId);
  if (engine?.getScores) return engine.getScores(state);
  return {};
};

export const getPlayerBreakdowns = (state) => {
  const engine = getGameEngine(state.gameId);
  if (engine?.getPlayerBreakdowns) return engine.getPlayerBreakdowns(state);
  return {};
};

export const projectStateForUser = (state, userId) => {
  const engine = getGameEngine(state.gameId);
  if (engine?.projectState) return engine.projectState(state, userId);
  return state;
};
