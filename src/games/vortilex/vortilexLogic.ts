import { AbstractGameEngine } from '../../types';

export const INITIAL_VORTILEX_GRID: string[][] = [
  ['B', 'O', 'N', 'E'],
  ['P', 'A', 'R', 'L'],
  ['D', 'I', 'C', 'E'],
  ['W', 'A', 'L', 'L'],
];

export function calculateVortilexWordScore(word: string): number {
  return word.length * 2 + (word.length >= 5 ? 4 : 0);
}

export class VortilexGameLogic extends AbstractGameEngine<
  { grid: string[][]; foundWords: string[] },
  { word: string }
> {
  readonly gameId = 'vortilex' as const;
  readonly title = 'Vortilex';

  initialize() {
    return {
      grid: INITIAL_VORTILEX_GRID,
      foundWords: [],
    };
  }

  processAction(
    state: { grid: string[][]; foundWords: string[] },
    action: { word: string }
  ) {
    if (!state.foundWords.includes(action.word)) {
      state.foundWords.push(action.word);
    }
    return state;
  }

  calculateScores(state: { grid: string[][]; foundWords: string[] }): Record<string, number> {
    const total = state.foundWords.reduce((acc, w) => acc + calculateVortilexWordScore(w), 0);
    return { total };
  }

  checkGameOver(): boolean {
    return false;
  }
}
