export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export const RANK_NAMES_ES = {
  '2': 'Doses',
  '3': 'Treses',
  '4': 'Cuatros',
  '5': 'Cincos',
  '6': 'Seises',
  '7': 'Sietes',
  '8': 'Ochos',
  '9': 'Nueves',
  '10': 'Dieces',
  J: 'Jotas',
  Q: 'Reinas',
  K: 'Reyes',
  A: 'Ases',
};

export const RANK_SINGULAR_ES = {
  '2': 'Dos',
  '3': 'Tres',
  '4': 'Cuatro',
  '5': 'Cinco',
  '6': 'Seis',
  '7': 'Siete',
  '8': 'Ocho',
  '9': 'Nueve',
  '10': 'Diez',
  J: 'Jota',
  Q: 'Reina',
  K: 'Rey',
  A: 'As',
};

export const SUIT_NAMES_ES = {
  spades: 'Picas',
  hearts: 'Corazones',
  diamonds: 'Diamantes',
  clubs: 'Tréboles',
};

export const HAND_CATEGORIES = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
};

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}-${suit[0]}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck, seedStr = null) {
  // Simple seeded or random Fisher-Yates
  let seed = 0;
  if (seedStr) {
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
  }
  const nextRandom = () => {
    if (!seedStr) return Math.random();
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 0) / 4294967296;
  };

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Returns all combinations of k elements chosen from an array.
 */
export function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getCombinations(tail, k - 1).map((combo) => [head, ...combo]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

/**
 * Evaluates a single 5-card poker hand.
 * Returns { categoryRank, category, score, handName, bestCards }
 */
export function evaluate5Cards(cards) {
  if (cards.length !== 5) {
    throw new Error('evaluate5Cards requires exactly 5 cards');
  }

  // Sort descending by card value
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map((c) => c.value);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  // Regular straight check: values are 5 consecutive integers
  let isStraight = false;
  let straightHigh = 0;

  const uniqueValues = [...new Set(values)];
  if (uniqueValues.length === 5) {
    if (uniqueValues[0] - uniqueValues[4] === 4) {
      isStraight = true;
      straightHigh = uniqueValues[0];
    } else if (
      uniqueValues[0] === 14 &&
      uniqueValues[1] === 5 &&
      uniqueValues[2] === 4 &&
      uniqueValues[3] === 3 &&
      uniqueValues[4] === 2
    ) {
      // Ace-low wheel straight (5-4-3-2-A)
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Rank frequency map
  const counts = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }

  // Group by frequency descending, then by value descending
  const groups = Object.entries(counts)
    .map(([valStr, count]) => ({ value: Number(valStr), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  const primaryRankStr = (val) => Object.keys(RANK_VALUES).find((k) => RANK_VALUES[k] === val) || '';

  // 1. Royal Flush / Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        categoryRank: HAND_CATEGORIES.ROYAL_FLUSH,
        category: 'royal_flush',
        score: [HAND_CATEGORIES.ROYAL_FLUSH, 14],
        handName: `Escalera Real de ${SUIT_NAMES_ES[suits[0]]}`,
        bestCards: sorted,
      };
    }
    const highRank = primaryRankStr(straightHigh);
    return {
      categoryRank: HAND_CATEGORIES.STRAIGHT_FLUSH,
      category: 'straight_flush',
      score: [HAND_CATEGORIES.STRAIGHT_FLUSH, straightHigh],
      handName: `Escalera de Color al ${RANK_SINGULAR_ES[highRank]}`,
      bestCards: sorted,
    };
  }

  // 2. Four of a Kind
  if (groups[0].count === 4) {
    const quadRank = primaryRankStr(groups[0].value);
    const kicker = groups[1].value;
    return {
      categoryRank: HAND_CATEGORIES.FOUR_OF_A_KIND,
      category: 'four_of_a_kind',
      score: [HAND_CATEGORIES.FOUR_OF_A_KIND, groups[0].value, kicker],
      handName: `Póquer de ${RANK_NAMES_ES[quadRank]}`,
      bestCards: sorted,
    };
  }

  // 3. Full House
  if (groups[0].count === 3 && groups[1].count === 2) {
    const trioRank = primaryRankStr(groups[0].value);
    const pairRank = primaryRankStr(groups[1].value);
    return {
      categoryRank: HAND_CATEGORIES.FULL_HOUSE,
      category: 'full_house',
      score: [HAND_CATEGORIES.FULL_HOUSE, groups[0].value, groups[1].value],
      handName: `Full House de ${RANK_NAMES_ES[trioRank]} y ${RANK_NAMES_ES[pairRank]}`,
      bestCards: sorted,
    };
  }

  // 4. Flush
  if (isFlush) {
    const highRank = primaryRankStr(values[0]);
    return {
      categoryRank: HAND_CATEGORIES.FLUSH,
      category: 'flush',
      score: [HAND_CATEGORIES.FLUSH, ...values],
      handName: `Color de ${SUIT_NAMES_ES[suits[0]]} al ${RANK_SINGULAR_ES[highRank]}`,
      bestCards: sorted,
    };
  }

  // 5. Straight
  if (isStraight) {
    const highRank = primaryRankStr(straightHigh);
    return {
      categoryRank: HAND_CATEGORIES.STRAIGHT,
      category: 'straight',
      score: [HAND_CATEGORIES.STRAIGHT, straightHigh],
      handName: `Escalera al ${RANK_SINGULAR_ES[highRank]}`,
      bestCards: sorted,
    };
  }

  // 6. Three of a Kind
  if (groups[0].count === 3) {
    const trioRank = primaryRankStr(groups[0].value);
    const kickers = [groups[1].value, groups[2].value];
    return {
      categoryRank: HAND_CATEGORIES.THREE_OF_A_KIND,
      category: 'three_of_a_kind',
      score: [HAND_CATEGORIES.THREE_OF_A_KIND, groups[0].value, ...kickers],
      handName: `Trío de ${RANK_NAMES_ES[trioRank]}`,
      bestCards: sorted,
    };
  }

  // 7. Two Pair
  if (groups[0].count === 2 && groups[1].count === 2) {
    const highPairRank = primaryRankStr(groups[0].value);
    const lowPairRank = primaryRankStr(groups[1].value);
    const kicker = groups[2].value;
    return {
      categoryRank: HAND_CATEGORIES.TWO_PAIR,
      category: 'two_pair',
      score: [HAND_CATEGORIES.TWO_PAIR, groups[0].value, groups[1].value, kicker],
      handName: `Doble Pareja de ${RANK_NAMES_ES[highPairRank]} y ${RANK_NAMES_ES[lowPairRank]}`,
      bestCards: sorted,
    };
  }

  // 8. One Pair
  if (groups[0].count === 2) {
    const pairRank = primaryRankStr(groups[0].value);
    const kickers = [groups[1].value, groups[2].value, groups[3].value];
    return {
      categoryRank: HAND_CATEGORIES.ONE_PAIR,
      category: 'one_pair',
      score: [HAND_CATEGORIES.ONE_PAIR, groups[0].value, ...kickers],
      handName: `Pareja de ${RANK_NAMES_ES[pairRank]}`,
      bestCards: sorted,
    };
  }

  // 9. High Card
  const highRank = primaryRankStr(values[0]);
  return {
    categoryRank: HAND_CATEGORIES.HIGH_CARD,
    category: 'high_card',
    score: [HAND_CATEGORIES.HIGH_CARD, ...values],
    handName: `Carta Alta ${RANK_SINGULAR_ES[highRank]}`,
    bestCards: sorted,
  };
}

/**
 * Compare two hand score arrays lexicographically.
 * Returns > 0 if scoreA beats scoreB, < 0 if scoreB beats scoreA, 0 if exact tie.
 */
export function compareHandScores(scoreA, scoreB) {
  const len = Math.max(scoreA.length, scoreB.length);
  for (let i = 0; i < len; i++) {
    const a = scoreA[i] ?? 0;
    const b = scoreB[i] ?? 0;
    if (a !== b) return a - b;
  }
  return 0;
}

/**
 * Given 5 to 7 cards, find the best 5-card combination.
 */
export function evaluateBestHand(cards) {
  if (cards.length < 5) {
    // If fewer than 5 cards (e.g. pre-flop debug), evaluate basic representation
    if (cards.length === 2) {
      const sorted = [...cards].sort((a, b) => b.value - a.value);
      if (sorted[0].value === sorted[1].value) {
        const pairRank = Object.keys(RANK_VALUES).find((k) => RANK_VALUES[k] === sorted[0].value);
        return {
          categoryRank: HAND_CATEGORIES.ONE_PAIR,
          category: 'one_pair',
          score: [HAND_CATEGORIES.ONE_PAIR, sorted[0].value],
          handName: `Pareja de mano de ${RANK_NAMES_ES[pairRank]}`,
          bestCards: sorted,
        };
      }
      const highRank = Object.keys(RANK_VALUES).find((k) => RANK_VALUES[k] === sorted[0].value);
      return {
        categoryRank: HAND_CATEGORIES.HIGH_CARD,
        category: 'high_card',
        score: [HAND_CATEGORIES.HIGH_CARD, sorted[0].value, sorted[1].value],
        handName: `Mano inicial con ${RANK_SINGULAR_ES[highRank]}`,
        bestCards: sorted,
      };
    }
    return {
      categoryRank: HAND_CATEGORIES.HIGH_CARD,
      category: 'high_card',
      score: [0],
      handName: 'Mano incompleta',
      bestCards: cards,
    };
  }

  const combos = getCombinations(cards, 5);
  let bestEvaluation = null;

  for (const combo of combos) {
    const current = evaluate5Cards(combo);
    if (!bestEvaluation || compareHandScores(current.score, bestEvaluation.score) > 0) {
      bestEvaluation = current;
    }
  }

  return bestEvaluation;
}

/**
 * Returns an estimated hand strength between 0.0 (weakest) and 1.0 (strongest)
 * based on current known cards (pocket cards + available community cards).
 * Used for bot heuristics.
 */
export function estimateHandStrength(pocketCards, communityCards = []) {
  if (!pocketCards || pocketCards.length < 2) return 0.5;
  const allKnown = [...pocketCards, ...communityCards];

  if (allKnown.length >= 5) {
    const best = evaluateBestHand(allKnown);
    // Score based on category and high rank:
    // Category rank is 0..9.
    // Within category, primary rank normalized (2..14 -> 0..1).
    const catWeight = best.categoryRank / 9.0;
    const subWeight = (best.score[1] || 2) / 14.0;
    return Math.min(1.0, Math.max(0.0, catWeight * 0.85 + subWeight * 0.15));
  }

  // Pre-flop estimation (Chen formula approximation):
  const c1 = pocketCards[0];
  const c2 = pocketCards[1];
  const isPair = c1.value === c2.value;
  const isSuited = c1.suit === c2.suit;
  const highVal = Math.max(c1.value, c2.value);
  const lowVal = Math.min(c1.value, c2.value);
  const gap = highVal - lowVal;

  let points = 0;
  if (isPair) {
    points = Math.max(5, (highVal - 2) * 1.5 + 5);
  } else {
    points = highVal / 2;
    if (isSuited) points += 2;
    if (gap === 1) points += 1;
    else if (gap === 2) points += 0.5;
  }

  // Normalize points (0..20) -> 0..1
  return Math.min(1.0, Math.max(0.0, points / 18.0));
}
