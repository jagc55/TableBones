import fs from 'node:fs';
import path from 'node:path';
import { shuffle } from '../random.js';
export const BONEGLE_DICE = {
  en: [
    ['A', 'A', 'E', 'E', 'G', 'N'], ['A', 'B', 'B', 'J', 'O', 'O'], ['A', 'C', 'H', 'O', 'P', 'S'], ['A', 'F', 'F', 'K', 'P', 'S'], ['A', 'O', 'O', 'T', 'T', 'W'], ['C', 'I', 'M', 'O', 'T', 'U'], ['D', 'E', 'I', 'L', 'R', 'X'], ['D', 'E', 'L', 'R', 'V', 'Y'], ['D', 'I', 'S', 'T', 'T', 'Y'], ['E', 'E', 'G', 'H', 'N', 'W'], ['E', 'E', 'I', 'N', 'S', 'U'], ['E', 'H', 'R', 'T', 'V', 'W'], ['E', 'I', 'O', 'S', 'S', 'T'], ['E', 'L', 'R', 'T', 'T', 'Y'], ['H', 'I', 'M', 'N', 'U', 'QU'], ['H', 'L', 'N', 'N', 'R', 'Z'],
  ],
  es: [
    ['A', 'A', 'C', 'I', 'O', 'T'], ['A', 'B', 'I', 'L', 'P', 'R'], ['A', 'C', 'D', 'E', 'M', 'P'], ['A', 'C', 'E', 'L', 'R', 'S'], ['A', 'D', 'E', 'N', 'V', 'Z'], ['A', 'H', 'M', 'O', 'R', 'S'], ['B', 'I', 'F', 'O', 'R', 'X'], ['D', 'E', 'L', 'R', 'V', 'Y'], ['E', 'E', 'F', 'I', 'U', 'S'], ['E', 'G', 'I', 'N', 'T', 'V'], ['E', 'H', 'I', 'N', 'P', 'S'], ['E', 'L', 'P', 'S', 'T', 'U'], ['G', 'I', 'L', 'R', 'U', 'Y'], ['O', 'O', 'T', 'T', 'A', 'Ñ'], ['A', 'A', 'E', 'E', 'O', 'O'], ['QU', 'A', 'E', 'I', 'O', 'U'],
  ],
};

export const dictionaryCache = new Map();

export const createPrng = (seed) => {
  let value = 1779033703 ^ [...seed].reduce((total, character) => Math.imul(total ^ character.charCodeAt(0), 3432918353), 0);
  return () => {
    value = Math.imul(value ^ (value >>> 16), 2246822507);
    value = Math.imul(value ^ (value >>> 13), 3266489909);
    return ((value ^= value >>> 16) >>> 0) / 4294967296;
  };
};

export const readDictionary = (rootDir, language) => {
  if (!dictionaryCache.has(language)) {
    const source = fs.readFileSync(path.join(rootDir, 'public', 'dict', `${language}.txt`), 'utf8');
    dictionaryCache.set(language, new Set(source.split(/\r?\n/).map((word) => word.trim().toUpperCase()).filter(Boolean)));
  }
  return dictionaryCache.get(language);
};

export const createBonegleBoard = (matchId, size, language) => {
  const random = createPrng(matchId);
  const source = BONEGLE_DICE[language] || BONEGLE_DICE.es;
  const dice = Array.from({ length: size * size }, (_, index) => [...source[index % source.length]]);
  const rolled = shuffle(dice, random).map((die) => die[Math.floor(random() * die.length)]);
  return Array.from({ length: size }, (_, row) => rolled.slice(row * size, (row + 1) * size));
};
