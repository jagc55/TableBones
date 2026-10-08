import { dealMidnightRound } from './deck.js';
import { isPlayable, evaluateTrick, scoreRound } from './rules.js';
import { setDeadline } from '../deadline.js';
import { automaticMidnightAction } from './bot.js';
export const submitMidnightAction = (state, userId, action) => {
  if (state.phase === 'game_over') throw new Error('This Midnight Alley match has finished.');

  if (action.type === 'PLACE_BID') {
    if (state.phase !== 'bidding') throw new Error('Bidding is not open.');
    const bid = Number(action.bid);
    if (!Number.isInteger(bid) || bid < 0 || bid > state.round) throw new Error('Bid must be between zero and the round card count.');
    state.bids[userId] = bid;
    const unbid = state.playerOrder.find((playerId) => state.bids[playerId] === undefined);
    if (unbid) {
      state.turnPlayerId = unbid;
      return { finished: false };
    }
    state.phase = 'playing';
    state.turnPlayerId = state.leadPlayerId;
    setDeadline(state, state.turnTimeLimitSec || 45);
    return { finished: false };
  }

  if (action.type === 'PLAY_CARD') {
    if (state.phase !== 'playing') throw new Error('That action is not allowed right now.');
    if (userId !== state.turnPlayerId) throw new Error('It is not your turn.');
    const hand = state.hands[userId] || [];
    const cardIndex = hand.findIndex((card) => card.id === String(action.cardId || ''));
    if (cardIndex < 0) throw new Error('You do not own that card.');
    const card = hand[cardIndex];
    if (!isPlayable(card, hand, state.currentTrick)) throw new Error('You must follow suit when possible.');
    const chameleonChoice = card.role === 'chameleon' ? (action.chameleonChoice || 'gangster') : undefined;
    if (chameleonChoice && chameleonChoice !== 'gangster' && chameleonChoice !== 'alibi') throw new Error('Chameleon must choose gangster or alibi.');
    hand.splice(cardIndex, 1);
    const player = state.players.find((entry) => entry.id === userId);
    state.currentTrick.push({ playerId: userId, playerName: player?.name || 'Player', playerAvatarId: player?.avatarId || '', card, chameleonChoice });

    if (state.currentTrick.length < state.playerOrder.length) {
      state.turnPlayerId = state.playerOrder[(state.playerOrder.indexOf(userId) + 1) % state.playerOrder.length];
      setDeadline(state, state.turnTimeLimitSec || 45);
      return { finished: false };
    }

    const result = evaluateTrick(state.currentTrick);
    state.tricksWon[result.playerId] += 1;
    state.roundBonuses[result.playerId] += result.bonusPoints;
    state.lastResult = {
      winnerPlayerId: result.playerId,
      winnerPlayerName: result.playerName,
      winningCard: result.card,
      bonusPoints: result.bonusPoints,
      bonusReason: result.bonusReason,
    };
    state.lastTrickWinnerId = result.playerId;
    state.history.push({ round: state.round, trick: [...state.currentTrick], result: state.lastResult });

    // Transition to trick_resolved for 3 seconds so cards and winner banner remain visible!
    state.phase = 'trick_resolved';
    state.turnPlayerId = null;
    setDeadline(state, 3);
    return { finished: false };
  }

  if (action.type === 'ADVANCE_TRICK') {
    if (state.phase !== 'trick_resolved') return { finished: false };
    if (Object.values(state.hands).every((cards) => cards.length === 0)) {
      const breakdown = scoreRound(state);
      state.history.push({ round: state.round, type: 'round_summary', breakdown });
      state.roundSummaryScores = breakdown;

      if (!state.roundHistory) state.roundHistory = {};
      const historyEntry = {};
      for (const pId of state.playerOrder) {
        historyEntry[pId] = {
          roundScore: breakdown[pId]?.totalRoundScore || 0,
          cumulativeScore: state.cumulativeScores[pId] || 0,
        };
      }
      state.roundHistory[state.round] = historyEntry;

      // "Si estamos en ronda 3 hay 3 manos, pues lo que me referia es que si el jugador Pepe gana la mano 1 entonces pepe empieza la mano 2. Si manolo gana la mano 3 de la ronda 3 entonces manolo empieza la mano 1 de la ronda 4."
      state.lastRoundWinnerId = state.lastTrickWinnerId || state.lastResult?.winnerPlayerId || state.playerOrder[0];
      state.lastTrickWinnerId = state.lastRoundWinnerId;

      if (state.round >= state.maxRounds) {
        const ranked = [...state.playerOrder].sort((left, right) => state.cumulativeScores[right] - state.cumulativeScores[left] || left.localeCompare(right));
        state.winnerId = ranked[0];
        state.winReason = 'Highest cumulative score after ten rounds.';
        state.phase = 'game_over';
        state.finishedAt = Date.now();
        state.currentTrick = [];
        state.turnPlayerId = null;
        return { finished: true };
      }

      state.phase = 'round_summary';
      state.turnPlayerId = null;
      setDeadline(state, 20); // 20 seconds auto-advance if no one clicks
      return { finished: false };
    }

    state.currentTrick = [];
    const nextLead = state.lastTrickWinnerId || state.lastResult?.winnerPlayerId || state.leadPlayerId;
    state.leadPlayerId = nextLead;
    state.turnPlayerId = nextLead;
    state.phase = 'playing';
    setDeadline(state, state.turnTimeLimitSec || 45);
    return { finished: false };
  }

  if (action.type === 'NEXT_ROUND') {
    if (state.phase !== 'round_summary') return { finished: false };
    if (state.round >= state.maxRounds) {
      state.phase = 'game_over';
      state.finishedAt = Date.now();
      return { finished: true };
    }
    state.round += 1;
    dealMidnightRound(state);
    setDeadline(state, state.turnTimeLimitSec || 45);
    return { finished: false };
  }

  throw new Error('Unsupported Midnight Alley action.');
};

export const projectMatchState = (state, userId) => {
  if (state.gameId !== 'midnight-alley') return state;
  const projected = structuredClone(state);
  projected.handCounts = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, state.hands[playerId]?.length || 0]));
  projected.hands = { [userId]: state.hands[userId] || [] };
  return projected;
};
export const createMidnightState = (room, matchId) => {
  const players = room.players.map((player) => ({ id: player.id, name: player.name, avatarId: player.avatarId, isBot: player.isBot }));
  const state = {
    id: matchId,
    roomId: room.id,
    gameId: room.gameId,
    players,
    playerOrder: players.map((player) => player.id),
    maxRounds: 10,
    round: 1,
    phase: 'bidding',
    hands: {},
    bids: {},
    tricksWon: {},
    roundBonuses: {},
    cumulativeScores: Object.fromEntries(players.map((player) => [player.id, 0])),
    roundHistory: {},
    leadPlayerId: null,
    turnPlayerId: null,
    currentTrick: [],
    lastResult: null,
    roundSummaryScores: null,
    lastRoundWinnerId: null,
    lastTrickWinnerId: null,
    history: [],
    deadline: null,
    startedAt: Date.now(),
  };
  dealMidnightRound(state);
  return state;
};

export const getMidnightScores = (state) => ({ ...state.cumulativeScores });

export const getMidnightPlayerBreakdowns = (state) => {
  const result = {};
  for (const player of state.players) {
    const pId = player.id;
    const items = [];
    if (state.roundHistory) {
      for (const [roundNum, entry] of Object.entries(state.roundHistory)) {
        if (entry[pId]) {
          items.push({
            label: `Round ${roundNum}`,
            value: `+${entry[pId].roundScore} PTS (Total: ${entry[pId].cumulativeScore})`,
          });
        }
      }
    }
    result[pId] = {
      score: state.cumulativeScores?.[pId] || 0,
      items,
      sections: items.length > 0 ? [{ title: 'Round History', items }] : [],
    };
  }
  return result;
};

export const midnightAlleyEngine = {
  id: 'midnight-alley',
  minPlayers: 2,
  maxPlayers: 8,
  createState: createMidnightState,
  applyAction: (state, userId, action) => {
    const res = submitMidnightAction(state, userId, action);
    return { finished: res.finished, clientResult: null };
  },
  onDeadline: () => ({ finished: false }),
  getAutomaticAction: (state) => automaticMidnightAction(state),
  getBotDelay: (state) => {
    if (state.phase === 'bidding') {
      const hasUnbidBot = state.players.some((p) => p.isBot && state.bids[p.id] === undefined);
      if (hasUnbidBot) return 300;
    } else if (state.phase === 'playing') {
      const activePlayer = state.players.find((p) => p.id === state.turnPlayerId);
      if (activePlayer?.isBot) return 450;
    }
    return null;
  },
  initDeadline: (state) => {
    setDeadline(state, state.turnTimeLimitSec || 45);
  },
  onWalkover: (state) => {
    state.phase = 'game_over';
    state.currentTrick = [];
    state.turnPlayerId = null;
    state.leadPlayerId = null;
  },
  onPlayerLeaveReschedule: (state) => {
    setDeadline(state, state.turnTimeLimitSec || 45);
  },
  removePlayer: (state, userId) => {
    state.playerOrder = state.playerOrder.filter((pId) => pId !== userId);
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
  },
  getScores: getMidnightScores,
  getPlayerBreakdowns: getMidnightPlayerBreakdowns,
  projectState: projectMatchState,
};
