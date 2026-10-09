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

/**
 * Compare two hand score arrays lexicographically.
 * Returns > 0 if scoreA beats scoreB, < 0 if scoreB beats scoreA, 0 if tie.
 */
export function compareHandScores(scoreA?: number[], scoreB?: number[]): number {
  const aList = scoreA || [];
  const bList = scoreB || [];
  const len = Math.max(aList.length, bList.length);
  for (let i = 0; i < len; i++) {
    const a = aList[i] ?? 0;
    const b = bList[i] ?? 0;
    if (a !== b) return a - b;
  }
  return 0;
}

export interface PlayerShowdownEvaluationStatus {
  isEvaluated: boolean;
  isSuccess: boolean;
  isFirstError: boolean;
  statusBadge: string;
  reason?: string;
  token?: number | null;
  evaluation?: any;
}

/**
 * Evaluates whether each player was positioned correctly according to ascending token order.
 * Players who maintained the proper order are marked as isSuccess: true (green).
 * Starting from the player whose hand broke the ascending sequence, players are marked isSuccess: false (red).
 */
export function computePlayerShowdownStatuses(
  players: Array<{ id: string; name: string }>,
  tokens: Record<string, number | null | undefined>,
  showdownResult: any
): Record<string, PlayerShowdownEvaluationStatus> {
  if (!showdownResult) return {};

  const { success, evaluations, violations } = showdownResult;
  const result: Record<string, PlayerShowdownEvaluationStatus> = {};

  const rankedPlayers = (players || [])
    .filter((p) => tokens?.[p.id] !== null && tokens?.[p.id] !== undefined)
    .map((p) => ({
      id: p.id,
      name: p.name,
      token: tokens[p.id] as number,
      evaluation: evaluations?.[p.id],
    }))
    .sort((a, b) => a.token - b.token);

  if (success) {
    rankedPlayers.forEach((p) => {
      result[p.id] = {
        isEvaluated: true,
        isSuccess: true,
        isFirstError: false,
        statusBadge: `✓ ORDER OK (★${p.token})`,
        token: p.token,
        evaluation: p.evaluation,
      };
    });
    return result;
  }

  // Cave-in: detect starting at which token the ascending sequence broke (1..N)
  let firstErrorIndex = -1;
  let maxScoreSoFar: number[] | null = null;
  let breakReason = '';

  for (let i = 0; i < rankedPlayers.length; i++) {
    const current = rankedPlayers[i];
    const currentScore = current.evaluation?.score || [0];

    if (i === 0) {
      // If Token 1 strictly beats any subsequent token, it started out of place
      const beatsLater = rankedPlayers.slice(1).some((later) => {
        const laterScore = later.evaluation?.score || [0];
        return compareHandScores(currentScore, laterScore) > 0;
      });

      if (beatsLater) {
        firstErrorIndex = 0;
        breakReason = `Token 1 (${current.evaluation?.handName || 'Hand'}) beat subsequent tokens`;
        break;
      } else {
        maxScoreSoFar = currentScore;
      }
    } else {
      const cmp = compareHandScores(currentScore, maxScoreSoFar || [0]);
      if (cmp < 0) {
        firstErrorIndex = i;
        const prevPlayer = rankedPlayers[i - 1];
        breakReason = `Token ${current.token} (${current.evaluation?.handName || 'Hand'}) is lower than Token ${prevPlayer.token} (${prevPlayer.evaluation?.handName || 'Hand'})`;
        break;
      } else {
        maxScoreSoFar = currentScore;
      }
    }
  }

  // Safety fallback using direct engine violations
  if (firstErrorIndex === -1 && violations && violations.length > 0) {
    const minViolatingToken = Math.min(...violations.map((v: any) => Math.min(v.tokenA, v.tokenB)));
    firstErrorIndex = rankedPlayers.findIndex((p) => p.token === minViolatingToken);
    if (firstErrorIndex === -1) firstErrorIndex = 0;
  }

  rankedPlayers.forEach((p, idx) => {
    const isOk = firstErrorIndex === -1 || idx < firstErrorIndex;
    const isFirst = idx === firstErrorIndex;

    result[p.id] = {
      isEvaluated: true,
      isSuccess: isOk,
      isFirstError: isFirst,
      statusBadge: isOk
        ? `✓ ORDER OK (★${p.token})`
        : isFirst
        ? `✗ ORDER BROKEN (★${p.token})`
        : `✗ INCORRECT ORDER (★${p.token})`,
      reason: isFirst ? breakReason : undefined,
      token: p.token,
      evaluation: p.evaluation,
    };
  });

  return result;
}

