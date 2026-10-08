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
  const playerWords = new Map();
  for (const [playerId, words] of Object.entries(state.submittedWords)) {
    for (const entry of words) {
      frequencies.set(entry.word, (frequencies.get(entry.word) || 0) + 1);
      if (!playerWords.has(entry.word)) playerWords.set(entry.word, []);
      playerWords.get(entry.word).push(playerId);
    }
  }
  state.breakdowns = {};
  for (const player of state.players) {
    const words = state.submittedWords[player.id] || [];
    const submitted = words.map((entry) => {
      const isShared = (frequencies.get(entry.word) || 0) > 1;
      const otherPlayerIds = (playerWords.get(entry.word) || []).filter((id) => id !== player.id);
      const otherNames = otherPlayerIds.map((id) => state.players.find((p) => p.id === id)?.name || id);
      return {
        word: entry.word,
        points: wordPoints(entry.word),
        shared: isShared,
        sharedWith: isShared ? otherNames : [],
        awarded: wordPoints(entry.word) * (isShared ? 1 : 2),
      };
    });
    state.breakdowns[player.id] = { words: submitted, score: submitted.reduce((sum, entry) => sum + entry.awarded, 0) };
  }
  const ranked = [...state.players].sort((left, right) => state.breakdowns[right.id].score - state.breakdowns[left.id].score || left.id.localeCompare(right.id));
  state.winnerId = ranked[0]?.id || null;
  state.winReason = 'Highest Bonegle score after the revelation.';
  state.phase = 'resolved';
  state.finishedAt = Date.now();
  return true;
};

export const getBonegleScores = (state) => {
  return Object.fromEntries(state.players.map((player) => [player.id, state.breakdowns?.[player.id]?.score || 0]));
};

export const getBoneglePlayerBreakdowns = (state) => {
  if (!state.breakdowns) return {};
  const result = {};
  for (const [playerId, breakdown] of Object.entries(state.breakdowns)) {
    const unique = [];
    const shared = [];
    for (const item of breakdown.words || []) {
      if (item.shared) {
        shared.push({ word: item.word, pts: item.awarded, sharedWith: item.sharedWith });
      } else {
        unique.push({ word: item.word, pts: item.awarded });
      }
    }
    const sections = [];
    if (unique.length > 0) {
      sections.push({
        title: 'Unique Words',
        badge: 'x2 PTS',
        items: unique.map((u) => ({ label: u.word, value: `+${u.pts}`, variant: 'primary' })),
      });
    }
    if (shared.length > 0) {
      sections.push({
        title: 'Shared Words',
        badge: 'x1 PT',
        items: shared.map((s) => ({
          label: s.word,
          value: `+${s.pts}`,
          detail: s.sharedWith?.length ? s.sharedWith.join(', ') : undefined,
          variant: 'secondary',
        })),
      });
    }
    result[playerId] = {
      score: breakdown.score,
      words: breakdown.words,
      uniqueWords: unique,
      sharedWords: shared,
      sections,
    };
  }
  return result;
};

export const applyBonegleAction = (state, userId, action, rootDir) => {
  const word = String(action?.word || '').trim().toUpperCase();
  if (Date.now() >= state.deadline) {
    const finished = resolveBonegle(state);
    return {
      finished,
      clientResult: { type: 'BONEGLE_WORD_RESULT', roomId: state.roomId, word, status: 'invalid' },
    };
  }
  if (action?.type !== 'SUBMIT_WORD') {
    throw new Error('Unsupported Bonegle action.');
  }
  try {
    submitBonegleWord(state, userId, action, rootDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return {
      finished: false,
      clientResult: {
        type: 'BONEGLE_WORD_RESULT',
        roomId: state.roomId,
        word,
        status: message.includes('already submitted') ? 'duplicate' : 'invalid',
      },
    };
  }
  return {
    finished: false,
    clientResult: { type: 'BONEGLE_WORD_RESULT', roomId: state.roomId, word, status: 'valid' },
  };
};

export const createBonegleState = (room, matchId) => {
  const players = room.players.map((player) => ({ id: player.id, name: player.name, avatarId: player.avatarId, isBot: player.isBot }));
  const size = [4, 5, 6].includes(Number(room.settings.bonegleGridSize)) ? Number(room.settings.bonegleGridSize) : 5;
  const language = room.settings.dictionaryLang === 'en' ? 'en' : 'es';
  return { id: matchId, roomId: room.id, gameId: room.gameId, players, phase: 'active', board: createBonegleBoard(matchId, size, language), language, submittedWords: Object.fromEntries(players.map((player) => [player.id, []])), deadline: Date.now() + Math.max(1, Number(room.settings.roundDurationSec) || 120) * 1000, startedAt: Date.now() };
};

export const bonegleEngine = {
  id: 'bonegle',
  minPlayers: 2,
  maxPlayers: 6,
  createState: createBonegleState,
  applyAction: applyBonegleAction,
  onDeadline: (state) => ({ finished: resolveBonegle(state) }),
  getAutomaticAction: () => null,
  getBotDelay: () => null,
  onWalkover: (state) => resolveBonegle(state),
  onPlayerLeaveReschedule: () => {},
  removePlayer: (state, userId) => {
    delete state.submittedWords[userId];
    if (state.breakdowns) delete state.breakdowns[userId];
    return true;
  },
  getScores: getBonegleScores,
  getPlayerBreakdowns: getBoneglePlayerBreakdowns,
  projectState: (state) => state,
};
