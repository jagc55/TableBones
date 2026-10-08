import { createDeck, shuffleDeck, evaluateBestHand, compareHandScores } from './poker.js';
import { setDeadline } from '../deadline.js';

export const TARGET_SUCCESSES = 3; // 3 Cámaras Acorazadas / Bóvedas para ganar
export const MAX_FAILURES = 3;      // 3 Alarmas / Derrumbes = derrota
export const MAX_EXPEDITIONS = 5;   // De 3 a 5 golpes

export function getPhaseLabel(phase) {
  switch (phase) {
    case 'pre_flop': return 'El Sondeo (Pre-Flop)';
    case 'flop': return 'El Flop (3 cartas)';
    case 'turn': return 'El Turn (4ª carta)';
    case 'river': return 'El River (5ª carta)';
    case 'showdown': return 'El Veredicto (Showdown)';
    case 'game_over': return 'Fin de la Partida';
    default: return phase;
  }
}

/**
 * Initializes a new heist / expedition (Golpe).
 */
export function startExpedition(state, expeditionNumber = 1, seed = undefined) {
  state.expedition = expeditionNumber;
  state.phase = 'pre_flop';
  state.communityCards = [];
  state.showdownResult = null;
  state.pendingGameOver = null;
  state.actionLog = state.actionLog || [];

  const players = state.players;
  const numPlayers = players.length;

  // Deck of 52 cards
  const rawDeck = createDeck();
  const deck = shuffleDeck(
    rawDeck,
    seed !== undefined && seed !== null ? `${seed}-${expeditionNumber}` : null
  );

  // Deal 2 pocket cards to each player
  state.privateCards = {};
  state.tokens = {};
  state.ready = {};
  state.tokenHistory = {};

  for (const p of players) {
    state.privateCards[p.id] = [deck.pop(), deck.pop()];
    state.tokens[p.id] = null;
    state.ready[p.id] = false;
    state.tokenHistory[p.id] = {};
  }

  // Reserve 5 community cards (burn 1 card for classic poker flavor)
  deck.pop(); // burn
  const flop1 = deck.pop();
  const flop2 = deck.pop();
  const flop3 = deck.pop();
  deck.pop(); // burn
  const turn = deck.pop();
  deck.pop(); // burn
  const river = deck.pop();

  state.hiddenCommunityCards = [flop1, flop2, flop3, turn, river];
  state.availableTokens = Array.from({ length: numPlayers }, (_, i) => i + 1);

  setDeadline(state, state.roundDurationSec || 60);

  state.actionLog.push({
    id: `${Date.now()}-start-${expeditionNumber}`,
    type: 'NEW_EXPEDITION',
    text: `💣 Comienza la Expedición ${expeditionNumber} de ${state.maxExpeditions}. Cartas secretas repartidas.`,
    timestamp: Date.now(),
  });
}

/**
 * Recomputes available tokens (1..N not currently assigned).
 */
export function recomputeAvailableTokens(state) {
  const assigned = new Set(Object.values(state.tokens).filter((v) => v !== null && v !== undefined));
  const total = state.players.length;
  const available = [];
  for (let i = 1; i <= total; i++) {
    if (!assigned.has(i)) {
      available.push(i);
    }
  }
  state.availableTokens = available;
}

/**
 * Releases a player's current token, leaving them without any token.
 */
export function releaseToken(state, userId) {
  if (state.phase === 'showdown' || state.phase === 'game_over') {
    return;
  }
  const prevToken = state.tokens[userId];
  if (prevToken === null || prevToken === undefined) {
    return;
  }
  const player = state.players.find((p) => p.id === userId);
  const playerName = player?.name || 'Un minero';

  state.tokens[userId] = null;
  state.ready[userId] = false;
  state.actionLog = state.actionLog || [];
  state.actionLog.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'TOKEN_RELEASE',
    text: `↩ ${playerName} soltó la Ficha ${prevToken}`,
    timestamp: Date.now(),
    senderId: userId,
    senderName: playerName,
  });
  recomputeAvailableTokens(state);
}

/**
 * Selects or steals a token (1..N) for a player.
 * Rule 1: Picking a token immediately makes the player ready.
 * Rule 2: Cannot pick a new token or release voluntarily while holding one;
 *         can only get rid of it if someone steals it from you.
 */
export function selectToken(state, userId, token) {
  if (state.phase === 'showdown' || state.phase === 'game_over') {
    throw new Error('No se pueden seleccionar fichas durante el veredicto o fin de partida.');
  }

  const numPlayers = state.players.length;
  if (!Number.isInteger(token) || token < 1 || token > numPlayers) {
    throw new Error(`La ficha debe ser un número entre 1 y ${numPlayers}.`);
  }

  const prevToken = state.tokens[userId] || null;

  // If player already holds this exact token, keep it (no-op)
  if (prevToken === token) {
    return;
  }

  // Cannot voluntarily switch or drop your token; only if someone steals it!
  if (prevToken !== null) {
    throw new Error('Ya tienes una ficha asignada. Solo te puedes librar de ella si otro minero te la quita.');
  }

  const player = state.players.find((p) => p.id === userId);
  const playerName = player?.name || 'Un minero';
  const currentHolderId = Object.keys(state.tokens).find((id) => state.tokens[id] === token);
  const currentHolder = state.players.find((p) => p.id === currentHolderId);

  state.actionLog = state.actionLog || [];

  if (currentHolderId && currentHolderId !== userId) {
    // Steal token from another player: current holder loses it and is no longer ready
    state.tokens[userId] = token;
    state.ready[userId] = true;
    state.tokens[currentHolderId] = null;
    state.ready[currentHolderId] = false;
    state.actionLog.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'TOKEN_DISPLACE',
      text: `⚡ ${playerName} le quitó la Ficha ${token} a ${currentHolder?.name || 'otro minero'}`,
      timestamp: Date.now(),
      senderId: userId,
      senderName: playerName,
    });
  } else {
    // Pick an available token: immediately ready
    state.tokens[userId] = token;
    state.ready[userId] = true;
    state.actionLog.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'TOKEN_CLAIM',
      text: `⛏ ${playerName} eligió la Ficha ${token}`,
      timestamp: Date.now(),
      senderId: userId,
      senderName: playerName,
    });
  }

  recomputeAvailableTokens(state);
}

/**
 * Checks if all players currently hold a token, allowing round advancement.
 */
export function canAdvancePhase(state) {
  if (state.phase === 'showdown' || state.phase === 'game_over') return false;
  return state.players.every((p) => state.tokens[p.id] !== null && state.tokens[p.id] !== undefined);
}

/**
 * Marks player as ready with their current token (or advances phase if host).
 */
export function confirmToken(state, userId) {
  if (state.phase === 'showdown' || state.phase === 'game_over') {
    throw new Error('No se pueden confirmar fichas en esta fase.');
  }

  if (state.tokens[userId] === null || state.tokens[userId] === undefined) {
    throw new Error('Debes seleccionar una ficha antes de apuntalar.');
  }

  state.ready[userId] = true;

  if (canAdvancePhase(state)) {
    const hostId = state.hostId || state.players[0]?.id;
    if (userId === hostId) {
      return advancePhase(state, userId);
    }
  }

  return { finished: false };
}

/**
 * Unmarks player ready status.
 */
export function unconfirmToken(state, userId) {
  state.ready[userId] = false;
}

/**
 * Advances the current expedition phase (pre_flop -> flop -> turn -> river -> showdown).
 * Requires all players to hold a token. Only host can advance manually.
 */
export function advancePhase(state, userId = null) {
  if (userId) {
    const hostId = state.hostId || state.players[0]?.id;
    if (userId !== hostId) {
      throw new Error('Solo el Capataz (anfitrión) puede avanzar a la siguiente ronda.');
    }
  }

  if (!canAdvancePhase(state)) {
    throw new Error('Todos los mineros deben tener una ficha asignada antes de avanzar de ronda.');
  }

  const currentTokens = { ...state.tokens };

  // Record token history for the finished phase
  for (const p of state.players) {
    const hist = state.tokenHistory[p.id] || {};
    if (state.phase === 'pre_flop') {
      hist.preFlop = currentTokens[p.id];
      hist.r1 = currentTokens[p.id];
    } else if (state.phase === 'flop') {
      hist.flop = currentTokens[p.id];
      hist.r2 = currentTokens[p.id];
    } else if (state.phase === 'turn') {
      hist.turn = currentTokens[p.id];
      hist.r3 = currentTokens[p.id];
    } else if (state.phase === 'river') {
      hist.river = currentTokens[p.id];
      hist.r4 = currentTokens[p.id];
    }
    state.tokenHistory[p.id] = hist;
  }

  if (state.phase === 'pre_flop') {
    state.phase = 'flop';
    state.communityCards = state.hiddenCommunityCards.slice(0, 3);
    resetPhaseTokens(state);
    setDeadline(state, state.roundDurationSec || 60);
    logPhaseChange(state);
    return { finished: false };
  }

  if (state.phase === 'flop') {
    state.phase = 'turn';
    state.communityCards = state.hiddenCommunityCards.slice(0, 4);
    resetPhaseTokens(state);
    setDeadline(state, state.roundDurationSec || 60);
    logPhaseChange(state);
    return { finished: false };
  }

  if (state.phase === 'turn') {
    state.phase = 'river';
    state.communityCards = state.hiddenCommunityCards.slice(0, 5);
    resetPhaseTokens(state);
    setDeadline(state, state.roundDurationSec || 60);
    logPhaseChange(state);
    return { finished: false };
  }

  if (state.phase === 'river') {
    // Showdown! Tokens from River are preserved for final hand evaluation
    return evaluateShowdown(state);
  }

  return { finished: false };
}

function logPhaseChange(state) {
  state.actionLog = state.actionLog || [];
  state.actionLog.push({
    id: `${Date.now()}-phase-${state.phase}`,
    type: 'PHASE_CHANGE',
    text: `🔄 La cuadrilla avanzó a ${getPhaseLabel(state.phase)}`,
    timestamp: Date.now(),
  });
}

/**
 * Resets held tokens between rounds so players choose fresh tokens for the new card state.
 */
function resetPhaseTokens(state) {
  for (const p of state.players) {
    state.tokens[p.id] = null;
    state.ready[p.id] = false;
  }
  recomputeAvailableTokens(state);
}

/**
 * Evaluates the final showdown at the end of River phase.
 */
export function evaluateShowdown(state) {
  state.phase = 'showdown';

  const evaluations = {};
  const playerEvals = [];

  for (const p of state.players) {
    const cards = [...(state.privateCards[p.id] || []), ...state.communityCards];
    const best = evaluateBestHand(cards);
    const assignedToken = state.tokens[p.id];

    const evaluation = {
      handName: best.handName,
      category: best.category,
      categoryRank: best.categoryRank,
      bestCards: best.bestCards,
      score: best.score,
      token: assignedToken,
      rankOrder: 0,
    };

    evaluations[p.id] = evaluation;
    playerEvals.push({ id: p.id, name: p.name, evaluation });
  }

  // Sort players by hand strength ascending (weakest hand to strongest hand)
  playerEvals.sort((a, b) => compareHandScores(a.evaluation.score, b.evaluation.score));

  // Assign 1-based rankOrder based on actual strength
  playerEvals.forEach((item, idx) => {
    item.evaluation.rankOrder = idx + 1;
    evaluations[item.id].rankOrder = idx + 1;
  });

  // Check for violations:
  // For every pair (A, B) where tokenA < tokenB:
  // Hand A must NOT be strictly stronger than Hand B.
  const violations = [];

  for (let i = 0; i < state.players.length; i++) {
    for (let j = 0; j < state.players.length; j++) {
      if (i === j) continue;
      const pA = state.players[i];
      const pB = state.players[j];
      const tokenA = state.tokens[pA.id];
      const tokenB = state.tokens[pB.id];

      if (tokenA !== null && tokenB !== null && tokenA < tokenB) {
        const evalA = evaluations[pA.id];
        const evalB = evaluations[pB.id];
        const cmp = compareHandScores(evalA.score, evalB.score);

        if (cmp > 0) {
          violations.push({
            playerAId: pA.id,
            playerAName: pA.name,
            tokenA,
            handAName: evalA.handName,
            playerBId: pB.id,
            playerBName: pB.name,
            tokenB,
            handBName: evalB.handName,
            message: `${pA.name} (Ficha ${tokenA}, ${evalA.handName}) superó a ${pB.name} (Ficha ${tokenB}, ${evalB.handName}).`,
          });
        }
      }
    }
  }

  const success = violations.length === 0;

  if (success) {
    state.successes += 1;
    state.showdownResult = {
      success: true,
      message: '¡Cámara acorazada abierta! La cuadrilla estimó el orden de presión a la perfección.',
      evaluations,
      violations: [],
    };
  } else {
    state.failures += 1;
    state.showdownResult = {
      success: false,
      message: '¡Derrumbe en el pozo! La alarma sonó por estimaciones invertidas entre los mineros.',
      evaluations,
      violations,
    };
  }

  // Update scores
  updateScores(state);

  // Give generous 30s deadline for reviewing showdown results
  setDeadline(state, 30);

  // Check game over conditions
  if (state.successes >= TARGET_SUCCESSES) {
    state.pendingGameOver = 'victory';
    state.winReason = `¡Golpe maestro conseguido! La banda abrió ${state.successes} cámaras acorazadas sin ser descubierta.`;
    return { finished: false };
  }

  if (state.failures >= MAX_FAILURES) {
    state.pendingGameOver = 'defeat';
    state.winReason = `¡La alarma sonó 3 veces! La banda fue sorprendida por la policía.`;
    return { finished: false };
  }

  if (state.expedition >= state.maxExpeditions) {
    state.pendingGameOver = state.successes >= TARGET_SUCCESSES ? 'victory' : 'defeat';
    state.winReason = state.successes >= TARGET_SUCCESSES
      ? `¡Victoria! La banda consiguió ${state.successes} cámaras acorazadas en ${state.expedition} golpes.`
      : `¡Derrota! Se agotaron los ${state.maxExpeditions} golpes sin alcanzar las 3 cámaras acorazadas.`;
    return { finished: false };
  }

  return { finished: false };
}

/**
 * Calculates current scores for all players in the cooperative match.
 */
export function updateScores(state) {
  let teamScore = 0;
  if (state.successes >= TARGET_SUCCESSES) {
    teamScore = 300 - state.failures * 40;
  } else {
    teamScore = state.successes * 60;
  }

  for (const p of state.players) {
    state.scores[p.id] = Math.max(0, teamScore);
  }
}

/**
 * Advances to the next expedition (if not already finished).
 */
export function nextExpedition(state) {
  if (state.phase !== 'showdown') {
    throw new Error('Solo se puede avanzar de expedición tras completar el veredicto.');
  }

  if (state.pendingGameOver) {
    state.phase = 'game_over';
    state.winnerId = null;
    return { finished: true };
  }

  if (state.expedition >= state.maxExpeditions || state.successes >= TARGET_SUCCESSES || state.failures >= MAX_FAILURES) {
    state.phase = 'game_over';
    state.winnerId = null;
    state.winReason = state.successes >= TARGET_SUCCESSES
      ? `¡Golpe maestro conseguido! La banda abrió 3 cámaras acorazadas con éxito.`
      : `¡La alarma sonó 3 veces! La banda fue descubierta por la policía.`;
    return { finished: true };
  }

  startExpedition(state, state.expedition + 1, state.matchSeed);
  return { finished: false };
}
