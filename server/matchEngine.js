import fs from 'node:fs';
import path from 'node:path';

const BONEGLE_DICE = {
  en: [
    ['A', 'A', 'E', 'E', 'G', 'N'], ['A', 'B', 'B', 'J', 'O', 'O'], ['A', 'C', 'H', 'O', 'P', 'S'], ['A', 'F', 'F', 'K', 'P', 'S'], ['A', 'O', 'O', 'T', 'T', 'W'], ['C', 'I', 'M', 'O', 'T', 'U'], ['D', 'E', 'I', 'L', 'R', 'X'], ['D', 'E', 'L', 'R', 'V', 'Y'], ['D', 'I', 'S', 'T', 'T', 'Y'], ['E', 'E', 'G', 'H', 'N', 'W'], ['E', 'E', 'I', 'N', 'S', 'U'], ['E', 'H', 'R', 'T', 'V', 'W'], ['E', 'I', 'O', 'S', 'S', 'T'], ['E', 'L', 'R', 'T', 'T', 'Y'], ['H', 'I', 'M', 'N', 'U', 'QU'], ['H', 'L', 'N', 'N', 'R', 'Z'],
  ],
  es: [
    ['A', 'A', 'C', 'I', 'O', 'T'], ['A', 'B', 'I', 'L', 'P', 'R'], ['A', 'C', 'D', 'E', 'M', 'P'], ['A', 'C', 'E', 'L', 'R', 'S'], ['A', 'D', 'E', 'N', 'V', 'Z'], ['A', 'H', 'M', 'O', 'R', 'S'], ['B', 'I', 'F', 'O', 'R', 'X'], ['D', 'E', 'L', 'R', 'V', 'Y'], ['E', 'E', 'F', 'I', 'U', 'S'], ['E', 'G', 'I', 'N', 'T', 'V'], ['E', 'H', 'I', 'N', 'P', 'S'], ['E', 'L', 'P', 'S', 'T', 'U'], ['G', 'I', 'L', 'R', 'U', 'Y'], ['O', 'O', 'T', 'T', 'A', 'Ñ'], ['A', 'A', 'E', 'E', 'O', 'O'], ['QU', 'A', 'E', 'I', 'O', 'U'],
  ],
};

const dictionaryCache = new Map();
const suits = [
  ['gold', 'Stash Gold'], ['cyan', 'Speakeasy Cyan'], ['ruby', 'Blood Ruby'], ['black', 'Midnight Syndicate'],
];

const createPrng = (seed) => {
  let value = 1779033703 ^ [...seed].reduce((total, character) => Math.imul(total ^ character.charCodeAt(0), 3432918353), 0);
  return () => {
    value = Math.imul(value ^ (value >>> 16), 2246822507);
    value = Math.imul(value ^ (value >>> 13), 3266489909);
    return ((value ^= value >>> 16) >>> 0) / 4294967296;
  };
};

const shuffle = (items, random = Math.random) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const readDictionary = (rootDir, language) => {
  if (!dictionaryCache.has(language)) {
    const source = fs.readFileSync(path.join(rootDir, 'public', 'dict', `${language}.txt`), 'utf8');
    dictionaryCache.set(language, new Set(source.split(/\r?\n/).map((word) => word.trim().toUpperCase()).filter(Boolean)));
  }
  return dictionaryCache.get(language);
};

const wordPoints = (word) => {
  if (word.length < 3) return 0;
  if (word.length <= 4) return 1;
  if (word.length === 5) return 2;
  if (word.length === 6) return 3;
  if (word.length === 7) return 5;
  if (word.length === 8) return 11;
  return 11 + (word.length - 8) * 3;
};

const createBonegleBoard = (matchId, size, language) => {
  const random = createPrng(matchId);
  const source = BONEGLE_DICE[language] || BONEGLE_DICE.es;
  const dice = Array.from({ length: size * size }, (_, index) => [...source[index % source.length]]);
  const rolled = shuffle(dice, random).map((die) => die[Math.floor(random() * die.length)]);
  return Array.from({ length: size }, (_, row) => rolled.slice(row * size, (row + 1) * size));
};

const validateBoneglePath = (state, action, rootDir) => {
  const word = String(action.word || '').trim().toUpperCase();
  const pathCells = Array.isArray(action.path) ? action.path : [];
  if (word.length < 3) throw new Error('Words must contain at least three letters.');
  if (pathCells.length === 0) throw new Error('A board path is required.');
  const visited = new Set();
  let computed = '';
  let previous = null;
  for (const cell of pathCells) {
    const row = Number(cell?.row);
    const column = Number(cell?.col ?? cell?.column);
    if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0 || row >= state.board.length || column >= state.board.length) {
      throw new Error('Path contains an invalid board cell.');
    }
    const key = `${row}:${column}`;
    if (visited.has(key)) throw new Error('A board cell cannot be used twice.');
    if (previous && (Math.abs(previous.row - row) > 1 || Math.abs(previous.column - column) > 1)) {
      throw new Error('Each path cell must touch the previous cell.');
    }
    visited.add(key);
    computed += state.board[row][column];
    previous = { row, column };
  }
  if (computed !== word) throw new Error('The submitted word does not match its board path.');
  if (!readDictionary(rootDir, state.language).has(word)) throw new Error('That word is not in the selected dictionary.');
  return { word, path: pathCells.map((cell) => ({ row: Number(cell.row), col: Number(cell.col ?? cell.column) })) };
};

const createMidnightDeck = () => {
  const deck = [];
  for (const [suit, title] of suits) {
    for (let value = 1; value <= 14; value += 1) {
      deck.push({ id: `card-${suit}-${value}`, type: 'suit', suit, value, name: `${value} of ${title}`, bonusValue: value === 14 ? (suit === 'black' ? 20 : 10) : 0 });
    }
  }
  deck.push({ id: 'card-boss-1', type: 'special', role: 'boss', name: 'The Boss' });
  for (let index = 1; index <= 3; index += 1) deck.push({ id: `card-femme-${index}`, type: 'special', role: 'femme-fatale', name: 'Femme Fatale' });
  for (let index = 1; index <= 10; index += 1) deck.push({ id: `card-gangster-${index}`, type: 'special', role: 'gangster', name: 'Gangster' });
  for (let index = 1; index <= 2; index += 1) deck.push({ id: `card-chameleon-${index}`, type: 'special', role: 'chameleon', name: 'The Chameleon' });
  for (let index = 1; index <= 10; index += 1) deck.push({ id: `card-alibi-${index}`, type: 'special', role: 'alibi', name: 'Alibi' });
  return deck;
};

const dealMidnightRound = (state) => {
  const deck = shuffle(createMidnightDeck());
  state.hands = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, []]));
  for (let cardIndex = 0; cardIndex < state.round; cardIndex += 1) {
    for (const playerId of state.playerOrder) state.hands[playerId].push(deck.pop());
  }
  for (const hand of Object.values(state.hands)) hand.sort((left, right) => (right.value || 0) - (left.value || 0));
  state.bids = {};
  state.tricksWon = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, 0]));
  state.roundBonuses = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, 0]));
  state.currentTrick = [];
  state.lastResult = null;
  state.phase = 'bidding';
  state.turnPlayerId = state.playerOrder[0];
  state.leadPlayerId = state.playerOrder[0];
};

const leadSuit = (trick) => trick.find((entry) => entry.card.type === 'suit')?.card.suit || null;
const effectiveRole = (entry) => entry.card.role === 'chameleon' ? (entry.chameleonChoice || 'gangster') : entry.card.role;

const isPlayable = (card, hand, trick) => {
  if (card.type === 'special') return true;
  const lead = leadSuit(trick);
  return !lead || card.suit === lead || !hand.some((item) => item.type === 'suit' && item.suit === lead);
};

const evaluateTrick = (trick) => {
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

const calculateBid = (hand) => Math.max(0, Math.min(hand.length, Math.round(hand.reduce((total, card) => {
  if (card.role === 'boss') return total + 1;
  if (card.role === 'gangster') return total + 0.85;
  if (card.role === 'femme-fatale') return total + 0.75;
  if (card.role === 'chameleon') return total + 0.5;
  if (card.role === 'alibi') return total - 0.1;
  if (card.suit === 'black') return total + (card.value >= 12 ? 0.85 : card.value >= 8 ? 0.5 : 0.2);
  return total + (card.value >= 13 ? 0.45 : card.value >= 11 ? 0.2 : 0);
}, 0))));

const choosePlay = (state, playerId) => {
  const hand = state.hands[playerId];
  const legal = hand.filter((card) => isPlayable(card, hand, state.currentTrick));
  const needsTrick = state.tricksWon[playerId] < state.bids[playerId];
  const alibi = legal.find((card) => card.role === 'alibi');
  const chameleon = legal.find((card) => card.role === 'chameleon');
  if (!needsTrick && alibi) return { card: alibi };
  if (chameleon) return { card: chameleon, chameleonChoice: needsTrick ? 'gangster' : 'alibi' };
  const ordered = [...legal].sort((left, right) => ((right.suit === 'black' ? 20 : 0) + (right.value || 0)) - ((left.suit === 'black' ? 20 : 0) + (left.value || 0)));
  return { card: needsTrick ? ordered[0] : ordered[ordered.length - 1] };
};

const scoreRound = (state) => {
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

export const createMatchState = (room, matchId) => {
  const players = room.players.map((player) => ({ id: player.id, name: player.name, avatarId: player.avatarId, isBot: player.isBot }));
  if (room.gameId === 'bonegle') {
    const size = [4, 5, 6].includes(Number(room.settings.bonegleGridSize)) ? Number(room.settings.bonegleGridSize) : 5;
    const language = room.settings.dictionaryLang === 'en' ? 'en' : 'es';
    return { id: matchId, roomId: room.id, gameId: room.gameId, players, phase: 'active', board: createBonegleBoard(matchId, size, language), language, submittedWords: Object.fromEntries(players.map((player) => [player.id, []])), deadline: Date.now() + Math.max(1, Number(room.settings.roundDurationSec) || 120) * 1000, startedAt: Date.now() };
  }
  const state = { id: matchId, roomId: room.id, gameId: room.gameId, players, playerOrder: players.map((player) => player.id), maxRounds: 10, round: 1, phase: 'bidding', hands: {}, bids: {}, tricksWon: {}, roundBonuses: {}, cumulativeScores: Object.fromEntries(players.map((player) => [player.id, 0])), leadPlayerId: null, turnPlayerId: null, currentTrick: [], lastResult: null, history: [], deadline: null, startedAt: Date.now() };
  dealMidnightRound(state);
  return state;
};

export const setDeadline = (state, seconds) => {
  state.deadline = Date.now() + Math.max(1, Number(seconds) || 45) * 1000;
};

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

export const submitBonegleWord = (state, userId, action, rootDir) => {
  if (state.phase !== 'active') throw new Error('This Bonegle match is no longer accepting words.');
  if (!state.submittedWords[userId]) throw new Error('Only match players can submit words.');
  const entry = validateBoneglePath(state, action, rootDir);
  if (state.submittedWords[userId].some((submitted) => submitted.word === entry.word)) throw new Error('You already submitted that word.');
  state.submittedWords[userId].push(entry);
};

export const resolveBonegle = (state) => {
  if (state.phase !== 'active') return false;
  const frequencies = new Map();
  for (const words of Object.values(state.submittedWords)) for (const entry of words) frequencies.set(entry.word, (frequencies.get(entry.word) || 0) + 1);
  state.breakdowns = {};
  for (const player of state.players) {
    const words = state.submittedWords[player.id] || [];
    const submitted = words.map((entry) => ({ word: entry.word, points: wordPoints(entry.word), shared: frequencies.get(entry.word) > 1, awarded: wordPoints(entry.word) * (frequencies.get(entry.word) === 1 ? 2 : 1) }));
    state.breakdowns[player.id] = { words: submitted, score: submitted.reduce((sum, entry) => sum + entry.awarded, 0) };
  }
  const ranked = [...state.players].sort((left, right) => state.breakdowns[right.id].score - state.breakdowns[left.id].score || left.id.localeCompare(right.id));
  state.winnerId = ranked[0]?.id || null;
  state.winReason = 'Highest Bonegle score after the revelation.';
  state.phase = 'resolved';
  state.finishedAt = Date.now();
  return true;
};

export const submitMidnightAction = (state, userId, action) => {
  if (state.phase === 'game_over') throw new Error('This Midnight Alley match has finished.');
  if (userId !== state.turnPlayerId) throw new Error('It is not your turn.');
  if (action.type === 'PLACE_BID') {
    if (state.phase !== 'bidding') throw new Error('Bidding is not open.');
    const bid = Number(action.bid);
    if (!Number.isInteger(bid) || bid < 0 || bid > state.round) throw new Error('Bid must be between zero and the round card count.');
    state.bids[userId] = bid;
    const next = state.playerOrder.find((playerId) => state.bids[playerId] === undefined);
    if (next) {
      state.turnPlayerId = next;
      return { finished: false };
    }
    state.phase = 'playing';
    state.turnPlayerId = state.leadPlayerId;
    return { finished: false };
  }
  if (action.type !== 'PLAY_CARD' || state.phase !== 'playing') throw new Error('That action is not allowed right now.');
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
    return { finished: false };
  }
  const result = evaluateTrick(state.currentTrick);
  state.tricksWon[result.playerId] += 1;
  state.roundBonuses[result.playerId] += result.bonusPoints;
  state.lastResult = { winnerPlayerId: result.playerId, winningCard: result.card, bonusPoints: result.bonusPoints, bonusReason: result.bonusReason };
  state.history.push({ round: state.round, trick: state.currentTrick, result: state.lastResult });
  if (Object.values(state.hands).every((cards) => cards.length === 0)) {
    const breakdown = scoreRound(state);
    state.history.push({ round: state.round, type: 'round_summary', breakdown });
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
    state.round += 1;
    dealMidnightRound(state);
    return { finished: false };
  }
  state.currentTrick = [];
  state.leadPlayerId = result.playerId;
  state.turnPlayerId = result.playerId;
  return { finished: false };
};

export const automaticMidnightAction = (state) => {
  const playerId = state.turnPlayerId;
  if (!playerId) return null;
  if (state.phase === 'bidding') return { userId: playerId, action: { type: 'PLACE_BID', bid: calculateBid(state.hands[playerId]) } };
  if (state.phase === 'playing') {
    const play = choosePlay(state, playerId);
    return { userId: playerId, action: { type: 'PLAY_CARD', cardId: play.card.id, chameleonChoice: play.chameleonChoice } };
  }
  return null;
};

export const projectMatchState = (state, userId) => {
  if (state.gameId !== 'midnight-alley') return state;
  const projected = structuredClone(state);
  projected.handCounts = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, state.hands[playerId]?.length || 0]));
  projected.hands = { [userId]: state.hands[userId] || [] };
  return projected;
};

export const matchScores = (state) => {
  if (state.gameId === 'bonegle') return Object.fromEntries(state.players.map((player) => [player.id, state.breakdowns?.[player.id]?.score || 0]));
  return { ...state.cumulativeScores };
};