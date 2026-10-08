import { createBonegleBoard, readDictionary } from './board.js';
export const wordPoints = (word) => {
  if (word.length < 3) return 0;
  if (word.length <= 4) return 1;
  if (word.length === 5) return 2;
  if (word.length === 6) return 3;
  if (word.length === 7) return 5;
  if (word.length === 8) return 11;
  return 11 + (word.length - 8) * 3;
};

export const validateBoneglePath = (state, action, rootDir) => {
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
export const createBonegleState = (room, matchId) => {
  const players = room.players.map((player) => ({ id: player.id, name: player.name, avatarId: player.avatarId, isBot: player.isBot }));
  const size = [4, 5, 6].includes(Number(room.settings.bonegleGridSize)) ? Number(room.settings.bonegleGridSize) : 5;
  const language = room.settings.dictionaryLang === 'en' ? 'en' : 'es';
  return { id: matchId, roomId: room.id, gameId: room.gameId, players, phase: 'active', board: createBonegleBoard(matchId, size, language), language, submittedWords: Object.fromEntries(players.map((player) => [player.id, []])), deadline: Date.now() + Math.max(1, Number(room.settings.roundDurationSec) || 120) * 1000, startedAt: Date.now() };
};
