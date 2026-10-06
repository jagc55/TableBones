import {
  MidnightCard,
  CardSuit,
  PlayedTrickCard,
  TrickResult,
  RoundScoreBreakdown,
} from '../types/midnightAlley';

// Build the standard 70-card Midnight Alley deck
export function createMidnightDeck(): MidnightCard[] {
  const deck: MidnightCard[] = [];

  const suitConfigs: { suit: CardSuit; name: string; subtitle: string }[] = [
    { suit: 'gold', name: 'Stash Gold', subtitle: 'Contraband Loot' },
    { suit: 'cyan', name: 'Speakeasy Cyan', subtitle: 'Bootleg Moonshine' },
    { suit: 'ruby', name: 'Blood Ruby', subtitle: 'Underground Dice' },
    { suit: 'black', name: 'Midnight Syndicate', subtitle: 'Trump Tommy Guns' },
  ];

  // 1. Numbered cards 1-14 for each of the 4 suits (56 cards)
  suitConfigs.forEach(({ suit, name, subtitle }) => {
    for (let val = 1; val <= 14; val++) {
      let bonusValue = 0;
      if (val === 14) {
        bonusValue = suit === 'black' ? 20 : 10;
      }

      deck.push({
        id: `card-${suit}-${val}`,
        type: 'suit',
        suit,
        value: val,
        name: `${val} of ${name}`,
        subtitle,
        description:
          suit === 'black'
            ? val === 14
              ? 'Supreme Trump card! Worth +20 bonus PTS if trick is won.'
              : 'Trump suit! Outranks all standard suits.'
            : val === 14
            ? 'Highest standard card! Worth +10 bonus PTS if trick is won.'
            : `Numbered card in ${name}.`,
        bonusValue,
      });
    }
  });

  // 2. The Boss (1 card) - Skull King
  deck.push({
    id: 'card-boss-1',
    type: 'special',
    role: 'boss',
    name: 'The Boss',
    subtitle: 'Kingpin of the Underworld',
    description:
      'Supreme skeleton mobster! Captures all numbered cards and Gangsters (+30 PTS per Gangster captured). Beware the Femme Fatale!',
  });

  // 3. Femme Fatale (2 cards) - Mermaid
  for (let i = 1; i <= 2; i++) {
    deck.push({
      id: `card-femme-${i}`,
      type: 'special',
      role: 'femme-fatale',
      name: 'Femme Fatale',
      subtitle: 'Speakeasy Siren',
      description:
        'Glamorous dame who enchants The Boss! Defeats The Boss (+50 PTS) and all numbered cards. Loses to Gangsters.',
    });
  }

  // 4. Gangsters (5 cards) - Pirates
  const gangsterAliases = ['Spats McGurk', 'Knuckles Malone', 'Tommy Guns Tony', 'Silencer Sal', 'Vinnie The Jaw'];
  for (let i = 1; i <= 5; i++) {
    deck.push({
      id: `card-gangster-${i}`,
      type: 'special',
      role: 'gangster',
      name: `Gangster: ${gangsterAliases[i - 1]}`,
      subtitle: 'Mob Enforcer',
      description:
        'Ruthless mobster! Beats all numbered cards and Femme Fatales. First Gangster played wins the trick. Loses to The Boss.',
    });
  }

  // 5. The Chameleon (1 card) - Tigress
  deck.push({
    id: 'card-chameleon-1',
    type: 'special',
    role: 'chameleon',
    name: 'The Chameleon',
    subtitle: 'Undercover Infiltrator',
    description:
      'Master of disguise! When played, choose whether to strike as a GANGSTER or slip away with an ALIBI.',
  });

  // 6. Alibi (5 cards) - White Flag / Escape
  for (let i = 1; i <= 5; i++) {
    deck.push({
      id: `card-alibi-${i}`,
      type: 'special',
      role: 'alibi',
      name: 'Alibi',
      subtitle: 'Forged Coartada',
      description:
        'Plead innocent and escape the crossfire! Always loses the trick to avoid capturing unwanted points.',
    });
  }

  return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: MidnightCard[]): MidnightCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal hands for a given round number
export function dealRoundHands(
  playerIds: string[],
  roundNumber: number
): { hands: Record<string, MidnightCard[]>; remainingDeck: MidnightCard[] } {
  const deck = shuffleDeck(createMidnightDeck());
  const hands: Record<string, MidnightCard[]> = {};

  playerIds.forEach((pId) => {
    hands[pId] = [];
  });

  for (let cardIdx = 0; cardIdx < roundNumber; cardIdx++) {
    for (const pId of playerIds) {
      const card = deck.pop();
      if (card) {
        hands[pId].push(card);
      }
    }
  }

  // Sort each player's hand neatly (Special cards first, then Black, then Gold, Cyan, Ruby)
  playerIds.forEach((pId) => {
    hands[pId].sort((a, b) => {
      const typeRank = (c: MidnightCard) => {
        if (c.role === 'boss') return 1;
        if (c.role === 'femme-fatale') return 2;
        if (c.role === 'gangster') return 3;
        if (c.role === 'chameleon') return 4;
        if (c.role === 'alibi') return 5;
        if (c.suit === 'black') return 6;
        if (c.suit === 'gold') return 7;
        if (c.suit === 'cyan') return 8;
        if (c.suit === 'ruby') return 9;
        return 10;
      };
      const rankDiff = typeRank(a) - typeRank(b);
      if (rankDiff !== 0) return rankDiff;
      return (b.value || 0) - (a.value || 0);
    });
  });

  return { hands, remainingDeck: deck };
}

// Determine established lead suit from current trick cards
export function getEstablishedLeadSuit(trick: PlayedTrickCard[]): CardSuit | null {
  for (const item of trick) {
    if (item.card.type === 'suit' && item.card.suit) {
      return item.card.suit;
    }
    // Note: Special cards like Alibi, Boss, Gangster, Femme Fatale do NOT establish a suit
  }
  return null;
}

// Check whether a card is legal to play
export function isCardPlayable(
  card: MidnightCard,
  hand: MidnightCard[],
  currentTrick: PlayedTrickCard[]
): boolean {
  // Special character cards (Boss, Femme Fatale, Gangster, Chameleon, Alibi) can ALWAYS be played at any time!
  if (card.type === 'special') {
    return true;
  }

  const leadSuit = getEstablishedLeadSuit(currentTrick);

  // If no suit has been established yet in this trick, any card can be played
  if (!leadSuit) {
    return true;
  }

  // If card matches the established lead suit, it is legal
  if (card.suit === leadSuit) {
    return true;
  }

  // If card doesn't match lead suit, player can ONLY play it if they have NO cards of the lead suit in hand!
  const hasLeadSuitInHand = hand.some((c) => c.type === 'suit' && c.suit === leadSuit);
  return !hasLeadSuitInHand;
}

// Evaluate trick winner and calculate bonus points according to Skull King rules
export function evaluateTrickWinner(trick: PlayedTrickCard[]): TrickResult {
  if (trick.length === 0) {
    throw new Error('Cannot evaluate empty trick');
  }

  const leadSuit = getEstablishedLeadSuit(trick);

  // Helper to get effective role of a card
  const getEffectiveRole = (item: PlayedTrickCard) => {
    if (item.card.role === 'chameleon') {
      return item.chameleonChoice || 'gangster';
    }
    return item.card.role;
  };

  const hasBoss = trick.find((item) => item.card.role === 'boss');
  const femmeFatales = trick.filter((item) => getEffectiveRole(item) === 'femme-fatale');
  const gangsters = trick.filter((item) => getEffectiveRole(item) === 'gangster');

  // Rule 1: Femme Fatale vs The Boss
  // If Femme Fatale AND The Boss are both in trick, Femme Fatale wins (+50 bonus)
  if (hasBoss && femmeFatales.length > 0) {
    const winningFemme = femmeFatales[0];
    return {
      winnerPlayerId: winningFemme.playerId,
      winnerPlayerName: winningFemme.playerName,
      winningCard: winningFemme.card,
      bonusPoints: 50,
      bonusReason: `${winningFemme.playerName}'s Femme Fatale captivated The Boss! (+50 PTS)`,
    };
  }

  // Rule 2: The Boss wins against all Gangsters and numbered cards
  if (hasBoss) {
    const capturedGangstersCount = gangsters.length;
    const bonus = capturedGangstersCount * 30;
    return {
      winnerPlayerId: hasBoss.playerId,
      winnerPlayerName: hasBoss.playerName,
      winningCard: hasBoss.card,
      bonusPoints: bonus,
      bonusReason:
        bonus > 0
          ? `${hasBoss.playerName}'s The Boss seized ${capturedGangstersCount} Gangster(s)! (+${bonus} PTS)`
          : undefined,
    };
  }

  // Rule 3: Gangsters beat Femme Fatale and all numbered cards
  // First Gangster played wins
  if (gangsters.length > 0) {
    const winningGangster = gangsters[0];
    return {
      winnerPlayerId: winningGangster.playerId,
      winnerPlayerName: winningGangster.playerName,
      winningCard: winningGangster.card,
      bonusPoints: 0,
    };
  }

  // Rule 4: Femme Fatale beats all numbered cards
  // First Femme Fatale played wins
  if (femmeFatales.length > 0) {
    const winningFemme = femmeFatales[0];
    return {
      winnerPlayerId: winningFemme.playerId,
      winnerPlayerName: winningFemme.playerName,
      winningCard: winningFemme.card,
      bonusPoints: 0,
    };
  }

  // Rule 5: Numbered cards & Trumps (or Alibis)
  // Check if any Trump cards (black) were played
  const trumpCards = trick.filter((item) => item.card.type === 'suit' && item.card.suit === 'black');
  if (trumpCards.length > 0) {
    let highestTrump = trumpCards[0];
    for (const t of trumpCards) {
      if ((t.card.value || 0) > (highestTrump.card.value || 0)) {
        highestTrump = t;
      }
    }
    const bonus = highestTrump.card.value === 14 ? 20 : 0;
    return {
      winnerPlayerId: highestTrump.playerId,
      winnerPlayerName: highestTrump.playerName,
      winningCard: highestTrump.card,
      bonusPoints: bonus,
      bonusReason: bonus > 0 ? `Captured with Black 14 Trump! (+${bonus} PTS)` : undefined,
    };
  }

  // Check if any Lead Suit cards were played
  if (leadSuit) {
    const leadSuitCards = trick.filter(
      (item) => item.card.type === 'suit' && item.card.suit === leadSuit
    );
    if (leadSuitCards.length > 0) {
      let highestLead = leadSuitCards[0];
      for (const item of leadSuitCards) {
        if ((item.card.value || 0) > (highestLead.card.value || 0)) {
          highestLead = item;
        }
      }
      const bonus = highestLead.card.value === 14 ? 10 : 0;
      return {
        winnerPlayerId: highestLead.playerId,
        winnerPlayerName: highestLead.playerName,
        winningCard: highestLead.card,
        bonusPoints: bonus,
        bonusReason: bonus > 0 ? `Captured with Suit 14! (+${bonus} PTS)` : undefined,
      };
    }
  }

  // If no lead suit (e.g. all Alibis or non-lead suits):
  // If all cards played are Alibis: the first Alibi played wins the trick!
  const nonAlibi = trick.find((item) => getEffectiveRole(item) !== 'alibi');
  if (!nonAlibi) {
    const firstAlibi = trick[0];
    return {
      winnerPlayerId: firstAlibi.playerId,
      winnerPlayerName: firstAlibi.playerName,
      winningCard: firstAlibi.card,
      bonusPoints: 0,
      bonusReason: 'Everyone pleaded Alibi! First Alibi takes the trick.',
    };
  }

  // Highest card of the first numbered card's suit
  const firstNumbered = trick.find((item) => item.card.type === 'suit' && item.card.suit);
  if (firstNumbered && firstNumbered.card.suit) {
    const suit = firstNumbered.card.suit;
    const sameSuitCards = trick.filter((item) => item.card.suit === suit);
    let highest = sameSuitCards[0];
    for (const item of sameSuitCards) {
      if ((item.card.value || 0) > (highest.card.value || 0)) {
        highest = item;
      }
    }
    return {
      winnerPlayerId: highest.playerId,
      winnerPlayerName: highest.playerName,
      winningCard: highest.card,
      bonusPoints: 0,
    };
  }

  // Fallback
  return {
    winnerPlayerId: trick[0].playerId,
    winnerPlayerName: trick[0].playerName,
    winningCard: trick[0].card,
    bonusPoints: 0,
  };
}

// Calculate round scores for all players at end of round
export function calculateRoundScores(
  playerIds: string[],
  roundNumber: number,
  bids: Record<string, number>,
  tricksWon: Record<string, number>,
  roundBonuses: Record<string, number>,
  currentScores: Record<string, number>
): Record<string, RoundScoreBreakdown> {
  const result: Record<string, RoundScoreBreakdown> = {};

  playerIds.forEach((pId) => {
    const bid = bids[pId] ?? 0;
    const won = tricksWon[pId] ?? 0;
    const bonus = roundBonuses[pId] ?? 0;
    let bidScore = 0;
    let effectiveBonus = 0;

    if (bid === 0) {
      if (won === 0) {
        // Zero-bid successful: +10 pts per card in round
        bidScore = 10 * roundNumber;
      } else {
        // Zero-bid failed: -10 pts per card in round
        bidScore = -10 * roundNumber;
      }
    } else {
      if (won === bid) {
        // Exact bid: +20 pts per trick won + bonuses
        bidScore = 20 * bid;
        effectiveBonus = bonus;
      } else {
        // Missed bid: -10 pts per difference, NO bonuses
        const diff = Math.abs(won - bid);
        bidScore = -10 * diff;
        effectiveBonus = 0;
      }
    }

    const totalRoundScore = bidScore + effectiveBonus;
    const cumulativeScore = (currentScores[pId] || 0) + totalRoundScore;

    result[pId] = {
      playerId: pId,
      bid,
      tricksWon: won,
      bidScore,
      bonusScore: effectiveBonus,
      totalRoundScore,
      cumulativeScore,
    };
  });

  return result;
}

// Bot AI: Calculate smart bid for hand
export function calculateBotBid(hand: MidnightCard[], _roundNumber?: number): number {
  let estimatedTricks = 0;

  hand.forEach((card) => {
    if (card.role === 'boss') estimatedTricks += 1.0;
    else if (card.role === 'gangster') estimatedTricks += 0.85;
    else if (card.role === 'femme-fatale') estimatedTricks += 0.75;
    else if (card.role === 'chameleon') estimatedTricks += 0.5;
    else if (card.role === 'alibi') estimatedTricks -= 0.1;
    else if (card.suit === 'black') {
      if ((card.value || 0) >= 12) estimatedTricks += 0.85;
      else if ((card.value || 0) >= 8) estimatedTricks += 0.5;
      else estimatedTricks += 0.2;
    } else {
      if ((card.value || 0) >= 13) estimatedTricks += 0.45;
      else if ((card.value || 0) >= 11) estimatedTricks += 0.2;
    }
  });

  // Attempt zero-bid if hand is very weak and round >= 2
  if (estimatedTricks < 0.6 && hand.length >= 2 && !hand.some((c) => c.role === 'boss' || c.role === 'gangster')) {
    return 0;
  }

  const rounded = Math.round(estimatedTricks);
  return Math.max(0, Math.min(hand.length, rounded));
}

// Bot AI: Choose smart card to play in trick
export function chooseBotPlay(
  hand: MidnightCard[],
  currentTrick: PlayedTrickCard[],
  bid: number,
  tricksWon: number
): { card: MidnightCard; chameleonChoice?: 'gangster' | 'alibi' } {
  const legalCards = hand.filter((c) => isCardPlayable(c, hand, currentTrick));
  const needsMoreTricks = tricksWon < bid;

  if (legalCards.length === 1) {
    const card = legalCards[0];
    return {
      card,
      chameleonChoice: card.role === 'chameleon' ? (needsMoreTricks ? 'gangster' : 'alibi') : undefined,
    };
  }

  // If bot wants to win trick
  if (needsMoreTricks) {
    // Check if The Boss is on the table
    const bossOnTable = currentTrick.some((item) => item.card.role === 'boss');
    if (bossOnTable) {
      const femme = legalCards.find((c) => c.role === 'femme-fatale');
      if (femme) {
        return { card: femme };
      }
    }

    // Try to play The Boss if Gangsters are on the table
    const gangstersOnTable = currentTrick.some((item) => item.card.role === 'gangster');
    if (gangstersOnTable) {
      const boss = legalCards.find((c) => c.role === 'boss');
      if (boss) {
        return { card: boss };
      }
    }

    // Try Gangster
    const gangster = legalCards.find((c) => c.role === 'gangster');
    if (gangster) {
      return { card: gangster };
    }

    // Try Chameleon as Gangster
    const chameleon = legalCards.find((c) => c.role === 'chameleon');
    if (chameleon) {
      return { card: chameleon, chameleonChoice: 'gangster' };
    }

    // Play highest legal card
    const sorted = [...legalCards].sort((a, b) => {
      const valA = (a.suit === 'black' ? 20 : 0) + (a.value || 0);
      const valB = (b.suit === 'black' ? 20 : 0) + (b.value || 0);
      return valB - valA;
    });
    return { card: sorted[0] };
  } else {
    // Bot wants to avoid winning trick (duck!)
    // 1. Play Alibi if available
    const alibi = legalCards.find((c) => c.role === 'alibi');
    if (alibi) {
      return { card: alibi };
    }

    // 2. Play Chameleon as Alibi
    const chameleon = legalCards.find((c) => c.role === 'chameleon');
    if (chameleon) {
      return { card: chameleon, chameleonChoice: 'alibi' };
    }

    // 3. Play lowest non-trump card
    const nonTrumps = legalCards.filter((c) => c.type === 'suit' && c.suit !== 'black');
    if (nonTrumps.length > 0) {
      nonTrumps.sort((a, b) => (a.value || 0) - (b.value || 0));
      return { card: nonTrumps[0] };
    }

    // 4. Lowest card available
    const sortedLowest = [...legalCards].sort((a, b) => (a.value || 0) - (b.value || 0));
    return { card: sortedLowest[0] };
  }
}
