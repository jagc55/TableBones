// Bonegle Authentic Boggle Dice configurations and frequency distribution
// Supports Spanish (ES) and English (EN) for 4x4, 5x5, and 6x6 grids.

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

export function generateRawBoard(size = 4, lang: 'es' | 'en' = 'es'): string[][] {
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
