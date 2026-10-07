import { generateRawBoard } from './bonegleDice';

class TrieNode {
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

export interface BoardSolution {
  words: string[];
  wordsSet: Set<string>;
  longestWord: string;
  longestWordLength: number;
  totalPossibleWords: number;
}

const dictionaries: {
  es: Trie | null;
  en: Trie | null;
} = {
  es: null,
  en: null,
};

const loadingPromises: {
  es: Promise<Trie> | null;
  en: Promise<Trie> | null;
} = {
  es: null,
  en: null,
};

export async function getDictionary(lang: 'es' | 'en' = 'es'): Promise<Trie> {
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

export function solveBoard(board: string[][], trie: Trie, lang: 'es' | 'en' = 'es'): BoardSolution {
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
  size = 4,
  lang: 'es' | 'en' = 'es'
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
