import {
  startExpedition,
  selectToken,
  releaseToken,
  confirmToken,
  unconfirmToken,
  nextExpedition,
  recomputeAvailableTokens,
  canAdvancePhase,
  advancePhase,
  MAX_EXPEDITIONS,
  TARGET_SUCCESSES,
  MAX_FAILURES,
} from './rules.js';
import { projectState } from './projection.js';
import { getAutomaticDoomedMineAction } from './bot.js';
import { setDeadline } from '../deadline.js';

export const doomedMineEngine = {
  id: 'doomed-mine',
  minPlayers: 2,
  maxPlayers: 6,

  createState: (room, matchId) => {
    const players = room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarId: p.avatarId,
      isBot: Boolean(p.isBot),
    }));

    const roundDuration = Number(room.settings?.roundDurationSec) || 60;
    const matchSeed = room.settings?.matchSeed || null;
    const hostId = room.hostId || room.players[0]?.id || null;

    const state = {
      id: matchId,
      roomId: room.id,
      hostId,
      gameId: 'doomed-mine',
      matchSeed,
      phase: 'pre_flop',
      expedition: 1,
      maxExpeditions: MAX_EXPEDITIONS,
      successes: 0,
      failures: 0,
      communityCards: [],
      privateCards: {},
      tokens: {},
      ready: {},
      tokenHistory: {},
      availableTokens: [],
      players,
      showdownResult: null,
      deadline: null,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      startedAt: Date.now(),
      roundDurationSec: roundDuration,
      actionLog: [],
      pendingGameOver: null,
    };

    setDeadline(state, roundDuration);

    startExpedition(state, 1, matchSeed);
    return state;
  },

  applyAction: (state, userId, action, rootDir) => {
    if (!state.players.some((p) => p.id === userId)) {
      throw new Error('Only match players can submit game actions.');
    }

    if (action.type === 'SELECT_TOKEN') {
      selectToken(state, userId, Number(action.token));
      if (canAdvancePhase(state)) {
        return advancePhase(state);
      }
      return { finished: false };
    }

    if (action.type === 'ADVANCE_PHASE') {
      const result = advancePhase(state, userId);
      return result;
    }

    if (action.type === 'RELEASE_TOKEN') {
      releaseToken(state, userId);
      return { finished: false };
    }

    if (action.type === 'CONFIRM_TOKEN') {
      const result = confirmToken(state, userId);
      return result;
    }

    if (action.type === 'UNCONFIRM_TOKEN') {
      unconfirmToken(state, userId);
      return { finished: false };
    }

    if (action.type === 'NEXT_EXPEDITION') {
      const result = nextExpedition(state);
      return result;
    }

    throw new Error(`Unsupported game action: ${action.type}`);
  },

  onDeadline: (state, rootDir) => {
    if (state.phase === 'game_over') {
      return { finished: true };
    }

    // Critical: If deadline has not passed (e.g. called from botDelay), do not advance
    if (state.deadline && Date.now() < state.deadline - 100) {
      return { finished: false };
    }

    if (state.phase === 'showdown') {
      // Auto-advance to next expedition or finish
      return nextExpedition(state);
    }

    // Force-assign any unassigned tokens to players when deadline truly expires
    for (const p of state.players) {
      if (state.tokens[p.id] === null || state.tokens[p.id] === undefined) {
        if (state.availableTokens && state.availableTokens.length > 0) {
          state.tokens[p.id] = state.availableTokens.shift();
        } else {
          state.tokens[p.id] = 1;
        }
      }
      state.ready[p.id] = true;
    }

    return advancePhase(state);
  },

  getAutomaticAction: (state) => {
    return getAutomaticDoomedMineAction(state);
  },

  getBotDelay: (state) => {
    if (state.phase === 'showdown' || state.phase === 'game_over') return null;
    const hasUnreadyBot = state.players.some(
      (p) => p.isBot && state.tokens[p.id] === null
    );
    if (hasUnreadyBot) {
      return 1500;
    }
    return null;
  },

  onWalkover: (state, winnerId) => {
    state.phase = 'game_over';
    state.winnerId = winnerId;
    state.winReason = 'Walkover: other miners abandoned the expedition.';
    state.finishedAt = Date.now();
  },

  onPlayerLeaveReschedule: (state) => {
    recomputeAvailableTokens(state);
    return null;
  },

  removePlayer: (state, userId) => {
    delete state.privateCards[userId];
    delete state.tokens[userId];
    delete state.ready[userId];
    delete state.scores[userId];
    delete state.tokenHistory[userId];
    recomputeAvailableTokens(state);
    return true;
  },

  getScores: (state) => ({ ...state.scores }),

  getPlayerBreakdowns: (state) => {
    const result = {};
    const isSuccess = state.successes >= TARGET_SUCCESSES;
    const isColapsed = state.failures >= MAX_FAILURES;

    for (const player of state.players) {
      const history = state.tokenHistory[player.id] || {};
      const items = [
        {
          label: 'Shafts Secured',
          value: `${state.successes} / ${TARGET_SUCCESSES}`,
          variant: state.successes > 0 ? 'primary' : 'neutral',
        },
        {
          label: 'Cave-ins in the Shaft',
          value: `${state.failures} / ${MAX_FAILURES}`,
          variant: state.failures > 0 ? 'secondary' : 'neutral',
        },
        {
          label: 'Expedition Reached',
          value: `${state.expedition} of ${MAX_EXPEDITIONS}`,
          variant: 'neutral',
        },
      ];

      result[player.id] = {
        score: state.scores[player.id] || 0,
        sections: [
          {
            title: 'Mine Expedition',
            badge: isSuccess ? 'RESCUED' : isColapsed ? 'COLLAPSE' : 'INCOMPLETE',
            items,
          },
        ],
      };
    }
    return result;
  },

  projectState: (state, userId) => {
    return projectState(state, userId);
  },
};
