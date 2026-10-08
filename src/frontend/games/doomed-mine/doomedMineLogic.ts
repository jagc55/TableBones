import { soundstage } from '../../utils/audio';
import type { PokerSuit, PokerCard, DoomedMinePhase } from './types';

export const SUIT_COLORS: Record<PokerSuit, string> = {
  spades: '#1c1511',
  hearts: '#d33833',
  diamonds: '#b72722',
  clubs: '#1c1511',
};

export const SUIT_LABELS: Record<PokerSuit, string> = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};

export const RANK_NAMES: Record<string, string> = {
  '2': 'Deuces',
  '3': 'Threes',
  '4': 'Fours',
  '5': 'Fives',
  '6': 'Sixes',
  '7': 'Sevens',
  '8': 'Eights',
  '9': 'Nines',
  '10': 'Tens',
  J: 'Jacks',
  Q: 'Queens',
  K: 'Kings',
  A: 'Aces',
};

export interface PhaseMetadata {
  step: number;
  title: string;
  subtitle: string;
  description: string;
}

export const PHASE_METADATA: Record<DoomedMinePhase, PhaseMetadata> = {
  pre_flop: {
    step: 1,
    title: 'THE SOUNDING',
    subtitle: '2 Pocket Cards',
    description: 'Examine your 2 secret hole cards and claim an estimated pressure token.',
  },
  flop: {
    step: 2,
    title: 'THE FLOP',
    subtitle: '3 Community Rocks',
    description: '3 cards are revealed on the table. Adjust your token if your hand improved.',
  },
  turn: {
    step: 3,
    title: 'THE TURN',
    subtitle: '4th Community Rock',
    description: 'Mine timbers groan. Reassess the strength of your hand.',
  },
  river: {
    step: 4,
    title: 'THE RIVER',
    subtitle: '5th Community Rock',
    description: 'Maximum pressure. Final opportunity to adjust before the showdown.',
  },
  showdown: {
    step: 5,
    title: 'THE VERDICT',
    subtitle: 'Mine Showdown',
    description: 'All hands revealed: tokens must match card strengths from weakest to strongest.',
  },
  game_over: {
    step: 6,
    title: 'EXPEDITION OVER',
    subtitle: 'Final Outcome',
    description: 'The mining crew concluded their underground run.',
  },
};

// Client-side quick poker hand namer for active player feedback
export function evaluateQuickHandName(myCards: PokerCard[], communityCards: PokerCard[]): string {
  const allCards = [...(myCards || []), ...(communityCards || [])];
  if (allCards.length < 2) return 'Waiting for deal...';

  // Count ranks
  const rankCounts: Record<number, number> = {};
  const suitCounts: Record<string, number> = {};
  allCards.forEach((c) => {
    rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  });

  const sortedValues = [...new Set(allCards.map((c) => c.value))].sort((a, b) => b - a);

  // Check flush
  const hasFlush = Object.values(suitCounts).some((count) => count >= 5);

  // Check straight
  let hasStraight = false;
  let straightHigh = 0;
  for (let i = 0; i <= sortedValues.length - 5; i++) {
    if (
      sortedValues[i] - 1 === sortedValues[i + 1] &&
      sortedValues[i] - 2 === sortedValues[i + 2] &&
      sortedValues[i] - 3 === sortedValues[i + 3] &&
      sortedValues[i] - 4 === sortedValues[i + 4]
    ) {
      hasStraight = true;
      straightHigh = sortedValues[i];
      break;
    }
  }
  // Ace-low straight check
  if (!hasStraight && sortedValues.includes(14) && sortedValues.includes(2) && sortedValues.includes(3) && sortedValues.includes(4) && sortedValues.includes(5)) {
    hasStraight = true;
    straightHigh = 5;
  }

  // Check groups
  const quads = Object.entries(rankCounts).filter(([, count]) => count === 4).map(([val]) => Number(val));
  const trips = Object.entries(rankCounts).filter(([, count]) => count === 3).map(([val]) => Number(val)).sort((a, b) => b - a);
  const pairs = Object.entries(rankCounts).filter(([, count]) => count === 2).map(([val]) => Number(val)).sort((a, b) => b - a);

  const getRankName = (val: number) => {
    if (val === 14) return 'Aces';
    if (val === 13) return 'Kings';
    if (val === 12) return 'Queens';
    if (val === 11) return 'Jacks';
    return `${val}s`;
  };

  const getSingleName = (val: number) => {
    if (val === 14) return 'Ace';
    if (val === 13) return 'King';
    if (val === 12) return 'Queen';
    if (val === 11) return 'Jack';
    return `${val}`;
  };

  if (hasFlush && hasStraight) return `Straight Flush (${getSingleName(straightHigh)} High)`;
  if (quads.length > 0) return `Four of a Kind (${getRankName(quads[0])})`;
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const pairVal = trips.length > 1 ? trips[1] : pairs[0];
    return `Full House (${getRankName(trips[0])} & ${getRankName(pairVal)})`;
  }
  if (hasFlush) return 'Flush';
  if (hasStraight) return `Straight (${getSingleName(straightHigh)} High)`;
  if (trips.length > 0) return `Three of a Kind (${getRankName(trips[0])})`;
  if (pairs.length >= 2) return `Two Pair (${getRankName(pairs[0])} & ${getRankName(pairs[1])})`;
  if (pairs.length === 1) return `Pair of ${getRankName(pairs[0])}`;

  // High card
  const high = Math.max(...allCards.map((c) => c.value));
  return `High Card (${getSingleName(high)})`;
}

// Sound effects wrapper using soundstage
export function playTokenSelectSound(step = 0) {
  soundstage.playTileSelect(step);
}

export function playConfirmSound() {
  soundstage.playRoundBell();
}

export function playSuccessSound() {
  soundstage.playVictoryFanfare();
}

export function playCaveInSound() {
  soundstage.playBulbHorn();
}
