import { Player, RoomSettings, AbstractGameEngine } from '../../types';
import {
  BonegleGridSize,
  BonegleLang,
  BoardSolution,
  BoneglePlayerBreakdown,
} from './types';

export const ES_DICE: string[][] = [
  ['A', 'A', 'C', 'I', 'O', 'T'],
  ['A', 'B', 'I', 'L', 'P', 'R'],
  ['A', 'C', 'D', 'E', 'M', 'P'],
  ['A', 'C', 'E', 'L', 'R', 'S'],
  ['A', 'D', 'E', 'N', 'V', 'Z'],
  ['A', 'H', 'M', 'O', 'R', 'S'],
  ['B', 'I', 'F', 'O', 'R', 'X'],
  ['D', 'E', 'L', 'R', 'V', 'Y'],
  ['E', 'E', 'F', 'I', 'U', 'S'],
  ['E', 'G', 'I', 'N', 'T', 'V'],
  ['E', 'H', 'I', 'N', 'P', 'S'],
  ['E', 'L', 'P', 'S', 'T', 'U'],
  ['G', 'I', 'L', 'R', 'U', 'Y'],
  ['O', 'O', 'T', 'T', 'A', 'Ñ'],
  ['A', 'A', 'E', 'E', 'O', 'O'],
  ['QU', 'A', 'E', 'I', 'O', 'U'],
  // Extended dice for 5x5 and 6x6
  ['A', 'E', 'I', 'O', 'U', 'S'],
  ['C', 'R', 'T', 'D', 'L', 'N'],
  ['P', 'M', 'B', 'G', 'V', 'F'],
  ['A', 'E', 'S', 'R', 'N', 'O'],
  ['D', 'T', 'L', 'C', 'A', 'E'],
  ['I', 'O', 'U', 'M', 'P', 'B'],
  ['S', 'R', 'N', 'A', 'E', 'I'],
  ['O', 'U', 'L', 'C', 'D', 'T'],
  ['Ñ', 'Z', 'J', 'H', 'Y', 'QU'],
  ['A', 'A', 'E', 'E', 'O', 'O'],
  ['E', 'I', 'A', 'R', 'S', 'T'],
  ['N', 'D', 'L', 'C', 'M', 'P'],
  ['V', 'B', 'G', 'F', 'O', 'U'],
  ['A', 'E', 'I', 'O', 'S', 'R'],
  ['T', 'D', 'N', 'L', 'C', 'E'],
  ['A', 'O', 'U', 'I', 'E', 'R'],
  ['S', 'P', 'M', 'B', 'A', 'O'],
  ['R', 'T', 'D', 'N', 'E', 'I'],
  ['L', 'C', 'S', 'A', 'O', 'U'],
  ['QU', 'Ñ', 'Z', 'H', 'E', 'A'],
];

export const EN_DICE: string[][] = [
  ['A', 'A', 'E', 'E', 'G', 'N'],
  ['A', 'B', 'B', 'J', 'O', 'O'],
  ['A', 'C', 'H', 'O', 'P', 'S'],
  ['A', 'F', 'F', 'K', 'P', 'S'],
  ['A', 'O', 'O', 'T', 'T', 'W'],
  ['C', 'I', 'M', 'O', 'T', 'U'],
  ['D', 'E', 'I', 'L', 'R', 'X'],
  ['D', 'E', 'L', 'R', 'V', 'Y'],
  ['D', 'I', 'S', 'T', 'T', 'Y'],
  ['E', 'E', 'G', 'H', 'N', 'W'],
  ['E', 'E', 'I', 'N', 'S', 'U'],
  ['E', 'H', 'R', 'T', 'V', 'W'],
  ['E', 'I', 'O', 'S', 'S', 'T'],
  ['E', 'L', 'R', 'T', 'T', 'Y'],
  ['H', 'I', 'M', 'N', 'U', 'QU'],
  ['H', 'L', 'N', 'N', 'R', 'Z'],
  // Extended dice for 5x5 and 6x6
  ['A', 'A', 'A', 'F', 'R', 'S'],
  ['A', 'A', 'E', 'E', 'M', 'A'],
  ['A', 'A', 'F', 'I', 'R', 'S'],
  ['A', 'D', 'E', 'N', 'N', 'N'],
  ['A', 'E', 'E', 'E', 'E', 'M'],
  ['A', 'E', 'E', 'I', 'M', 'U'],
  ['A', 'E', 'N', 'N', 'N', 'D'],
  ['A', 'F', 'I', 'R', 'S', 'Y'],
  ['B', 'J', 'K', 'Q', 'X', 'Z'],
  ['C', 'C', 'E', 'N', 'S', 'T'],
  ['C', 'E', 'I', 'I', 'L', 'T'],
  ['C', 'E', 'I', 'L', 'P', 'T'],
  ['C', 'E', 'I', 'P', 'S', 'T'],
  ['D', 'H', 'H', 'N', 'O', 'T'],
  ['D', 'H', 'H', 'L', 'O', 'R'],
  ['D', 'H', 'L', 'N', 'O', 'R'],
  ['E', 'I', 'I', 'T', 'T', 'S'],
  ['E', 'M', 'O', 'T', 'T', 'T'],
  ['E', 'N', 'S', 'S', 'S', 'U'],
  ['F', 'I', 'P', 'R', 'S', 'Y'],
];

export function generateRawBoard(size: BonegleGridSize = 5, lang: BonegleLang = 'es'): string[][] {
  const baseDice = lang === 'en' ? EN_DICE : ES_DICE;
  const targetCount = size * size;
  const dicePool: string[][] = [];

  for (let i = 0; i < targetCount; i++) {
    dicePool.push([...baseDice[i % baseDice.length]]);
  }

  // Fisher-Yates shuffle dice positions
  for (let i = dicePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dicePool[i], dicePool[j]] = [dicePool[j], dicePool[i]];
  }

  // Roll each die
  const rolled = dicePool.map((die) => die[Math.floor(Math.random() * die.length)]);

  // Form 2D array
  const board: string[][] = [];
  for (let r = 0; r < size; r++) {
    board.push(rolled.slice(r * size, (r + 1) * size));
  }
  return board;
}

export class TrieNode {
  children: Record<string, TrieNode> = Object.create(null);
  isWord: boolean = false;
}

export class Trie {
  root: TrieNode = new TrieNode();
  count: number = 0;

  insert(word: string): void {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (!node.children[ch]) {
        node.children[ch] = new TrieNode();
      }
      node = node.children[ch];
    }
    node.isWord = true;
    this.count++;
  }

  hasWord(word: string): boolean {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (!node.children[ch]) return false;
      node = node.children[ch];
    }
    return node.isWord;
  }
}

const dictionaries: Record<BonegleLang, Trie | null> = {
  es: null,
  en: null,
};

const loadingPromises: Record<BonegleLang, Promise<Trie> | null> = {
  es: null,
  en: null,
};

export async function getDictionary(lang: BonegleLang = 'es'): Promise<Trie> {
  if (dictionaries[lang]) {
    return dictionaries[lang]!;
  }

  if (loadingPromises[lang]) {
    return loadingPromises[lang]!;
  }

  loadingPromises[lang] = (async () => {
    try {
      const resp = await fetch(`/dict/${lang}.txt`);
      if (!resp.ok) {
        throw new Error(`Failed to load /dict/${lang}.txt: ${resp.statusText}`);
      }
      const text = await resp.text();
      const trie = new Trie();
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const w = lines[i].trim().toUpperCase();
        if (w.length >= 3) {
          trie.insert(w);
        }
      }
      dictionaries[lang] = trie;
      return trie;
    } catch (err) {
      console.warn(`Could not fetch /dict/${lang}.txt, falling back to minimal dictionary`, err);
      const fallbackTrie = new Trie();
      const fallbacks = [
        'CASA', 'GATO', 'PERRO', 'HUESO', 'DADO', 'MESA', 'ROSA', 'SOL', 'LUNA', 'MAR',
        'BONE', 'DICE', 'WALL', 'PLAY', 'GAME', 'WORD', 'SKULL', 'RING', 'TIME', 'STAR'
      ];
      fallbacks.forEach((w) => fallbackTrie.insert(w));
      dictionaries[lang] = fallbackTrie;
      return fallbackTrie;
    }
  })();

  return loadingPromises[lang]!;
}

export function solveBoard(board: string[][], trie: Trie, lang: BonegleLang = 'es'): BoardSolution {
  const rows = board.length;
  const cols = board[0].length;
  const foundWords = new Set<string>();
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  function dfs(r: number, c: number, node: TrieNode, currentWord: string) {
    const tile = board[r][c]; // might be 'QU' or single letter
    let nextNode = node;
    for (let i = 0; i < tile.length; i++) {
      const ch = tile[i];
      if (!nextNode.children[ch]) return;
      nextNode = nextNode.children[ch];
    }

    const word = currentWord + tile;
    if (nextNode.isWord) {
      foundWords.add(word);
    }

    visited[r][c] = true;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          dfs(nr, nc, nextNode, word);
        }
      }
    }

    visited[r][c] = false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dfs(r, c, trie.root, '');
    }
  }

  const sorted = Array.from(foundWords).sort(
    (a, b) => b.length - a.length || a.localeCompare(b, lang === 'es' ? 'es' : 'en')
  );
  const longestWord = sorted.length > 0 ? sorted[0] : '';
  const longestWordLength = longestWord.length;

  return {
    words: sorted,
    wordsSet: foundWords,
    longestWord,
    longestWordLength,
    totalPossibleWords: sorted.length,
  };
}

export async function generatePlayableBoard(
  size: BonegleGridSize = 5,
  lang: BonegleLang = 'es'
): Promise<{ board: string[][]; solution: BoardSolution }> {
  const trie = await getDictionary(lang);
  const minWordsMap: Record<number, number> = { 4: 40, 5: 90, 6: 150 };
  const minWords = minWordsMap[size] || 40;

  let bestBoard: string[][] = [];
  let bestSolution: BoardSolution | null = null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const board = generateRawBoard(size, lang);
    const solution = solveBoard(board, trie, lang);

    if (solution.totalPossibleWords >= minWords && solution.longestWordLength >= 5) {
      return { board, solution };
    }

    if (!bestSolution || solution.totalPossibleWords > bestSolution.totalPossibleWords) {
      bestBoard = board;
      bestSolution = solution;
    }
  }

  return {
    board: bestBoard,
    solution: bestSolution || solveBoard(bestBoard, trie, lang),
  };
}

export function calculateWordPoints(word: string): number {
  const len = word.length;
  if (len < 3) return 0;
  if (len === 3 || len === 4) return 1;
  if (len === 5) return 2;
  if (len === 6) return 3;
  if (len === 7) return 5;
  if (len === 8) return 11;
  return 11 + (len - 8) * 3;
}

/**
 * Calculates official revelation breakdowns, honoring the Great Revelation rule:
 * Exclusive (unique) words score x2 points!
 * Shared words score standard x1 points.
 */
export function calculateBonegleBreakdowns(
  players: Player[],
  userWords: Map<string, number>,
  currentUserId: string,
  botWords: Map<string, Set<string>>
): BoneglePlayerBreakdown[] {
  const wordFrequency = new Map<string, string[]>();

  // User words
  const currentUser = players.find((p) => p.id === currentUserId);
  const currentUserName = currentUser ? currentUser.name : 'You';
  userWords.forEach((_, word) => {
    if (!wordFrequency.has(word)) wordFrequency.set(word, []);
    wordFrequency.get(word)!.push(currentUserName);
  });

  // Bot words
  botWords.forEach((wordsSet, botId) => {
    const bot = players.find((p) => p.id === botId);
    const name = bot ? bot.name : 'Bot';
    wordsSet.forEach((word) => {
      if (!wordFrequency.has(word)) wordFrequency.set(word, []);
      wordFrequency.get(word)!.push(name);
    });
  });

  const breakdowns: BoneglePlayerBreakdown[] = players.map((p) => {
    const wordsSet: Set<string> =
      p.id === currentUserId
        ? new Set(userWords.keys())
        : botWords.get(p.id) || new Set();

    const uniqueWords: { word: string; pts: number }[] = [];
    const sharedWords: { word: string; pts: number; sharedWith: string[] }[] = [];
    let totalScore = 0;

    wordsSet.forEach((word) => {
      const occurrences = wordFrequency.get(word) || [];
      const isShared = occurrences.length > 1;
      const basePoints = calculateWordPoints(word);

      if (isShared) {
        const others = occurrences.filter((n) => n !== p.name);
        sharedWords.push({ word, pts: basePoints, sharedWith: others });
        totalScore += basePoints;
      } else {
        const doubled = basePoints * 2;
        uniqueWords.push({ word, pts: doubled });
        totalScore += doubled;
      }
    });

    return {
      player: p,
      uniqueWords,
      sharedWords,
      totalScore,
    };
  });

  breakdowns.sort((a, b) => b.totalScore - a.totalScore);
  return breakdowns;
}

/**
 * Concrete Bonegle logic implementing the platform's AbstractGameEngine contract.
 */
export class BonegleGameLogic extends AbstractGameEngine<
  { board: string[][]; wordsFound: Map<string, Set<string>> },
  { playerId: string; word: string }
> {
  readonly gameId = 'bonegle' as const;
  readonly title = 'Bonegle';

  initialize(players: Player[], settings?: RoomSettings) {
    const size = (settings?.bonegleGridSize || 5) as BonegleGridSize;
    const lang = (settings?.dictionaryLang || 'es') as BonegleLang;
    const board = generateRawBoard(size, lang);
    const wordsFound = new Map<string, Set<string>>();
    players.forEach((p) => wordsFound.set(p.id, new Set()));
    return { board, wordsFound };
  }

  processAction(
    state: { board: string[][]; wordsFound: Map<string, Set<string>> },
    action: { playerId: string; word: string }
  ) {
    const playerWords = state.wordsFound.get(action.playerId) || new Set();
    playerWords.add(action.word.toUpperCase());
    state.wordsFound.set(action.playerId, playerWords);
    return state;
  }

  calculateScores(state: { board: string[][]; wordsFound: Map<string, Set<string>> }): Record<string, number> {
    const scores: Record<string, number> = {};
    state.wordsFound.forEach((words, playerId) => {
      let total = 0;
      words.forEach((w) => {
        total += calculateWordPoints(w);
      });
      scores[playerId] = total;
    });
    return scores;
  }

  checkGameOver(): boolean {
    return false; // Bonegle finishes via timer expiration
  }
}
