import {
  MidnightCard,
  CardSuit,
  PlayedTrickCard,
  TrickResult,
  RoundScoreBreakdown,
} from './types';

// Determine the established lead suit in a trick
export function getEstablishedLeadSuit(currentTrick: PlayedTrickCard[]): CardSuit | null {
  const firstSuitPlay = currentTrick.find((t) => t.card.type === 'suit');
  return firstSuitPlay?.card.suit || null;
}

// Check if a card is legal to play according to the Mafia Suit Following rule
export function isCardPlayable(
  card: MidnightCard,
  hand: MidnightCard[],
  currentTrick: PlayedTrickCard[]
): boolean {
  // Special roles (The Boss, Femme Fatale, Gangster, Chameleon, Alibi) can always be played
  if (card.type === 'special') return true;

  const leadSuit = getEstablishedLeadSuit(currentTrick);
  if (!leadSuit) return true; // Free lead

  if (card.suit === leadSuit) return true;

  const hasLeadSuit = hand.some((c) => c.type === 'suit' && c.suit === leadSuit);
  return !hasLeadSuit; // Can play off-suit only if holding no cards in the established suit
}

// Evaluate trick winner according to official Mafia hierarchy rules
export function evaluateTrickWinner(trick: PlayedTrickCard[]): TrickResult {
  if (trick.length === 0) {
    throw new Error('Cannot evaluate empty trick');
  }

  const getEffectiveRole = (played: PlayedTrickCard) => {
    if (played.card.role === 'chameleon') {
      return played.chameleonChoice || 'gangster';
    }
    return played.card.role;
  };

  const bossPlay = trick.find((t) => t.card.role === 'boss');
  const femmePlays = trick.filter((t) => getEffectiveRole(t) === 'femme-fatale');
  const gangsterPlays = trick.filter((t) => getEffectiveRole(t) === 'gangster');

  // Rule 1: Femme Fatale enchants The Boss (+50 bonus)
  if (bossPlay && femmePlays.length > 0) {
    const winner = femmePlays[0];
    return {
      winnerPlayerId: winner.playerId,
      winnerPlayerName: winner.playerName,
      winningCard: winner.card,
      bonusPoints: 50,
      bonusReason: `${winner.playerName}'s Femme Fatale enchanted The Boss! (+50 Bonus PTS)`,
    };
  }

  // Rule 2: The Boss captures all Gangsters (+30 bonus per Gangster captured)
  if (bossPlay) {
    const bonus = gangsterPlays.length * 30;
    return {
      winnerPlayerId: bossPlay.playerId,
      winnerPlayerName: bossPlay.playerName,
      winningCard: bossPlay.card,
      bonusPoints: bonus,
      bonusReason:
        bonus > 0
          ? `${bossPlay.playerName}'s Boss captured ${gangsterPlays.length} Gangster(s)! (+${bonus} Bonus PTS)`
          : undefined,
    };
  }

  // Rule 3: Gangsters defeat Femme Fatales and normal suits (first Gangster wins)
  if (gangsterPlays.length > 0) {
    const winner = gangsterPlays[0];
    return {
      winnerPlayerId: winner.playerId,
      winnerPlayerName: winner.playerName,
      winningCard: winner.card,
      bonusPoints: 0,
    };
  }

  // Rule 4: Femme Fatales defeat normal suits (first Femme Fatale wins)
  if (femmePlays.length > 0) {
    const winner = femmePlays[0];
    return {
      winnerPlayerId: winner.playerId,
      winnerPlayerName: winner.playerName,
      winningCard: winner.card,
      bonusPoints: 0,
    };
  }

  // Rule 5: Black suit (Tommy Guns) is the supreme trump suit
  const blackPlays = trick.filter((t) => t.card.type === 'suit' && t.card.suit === 'black');
  if (blackPlays.length > 0) {
    let best = blackPlays[0];
    for (let i = 1; i < blackPlays.length; i++) {
      if ((blackPlays[i].card.value || 0) > (best.card.value || 0)) {
        best = blackPlays[i];
      }
    }
    const bonus = (best.card.value || 0) === 14 ? 20 : 0;
    return {
      winnerPlayerId: best.playerId,
      winnerPlayerName: best.playerName,
      winningCard: best.card,
      bonusPoints: bonus,
      bonusReason: bonus > 0 ? `${best.playerName} won with the 14 of Tommy Guns! (+20 Bonus PTS)` : undefined,
    };
  }

  // Rule 6: Established standard suit
  const leadSuit = getEstablishedLeadSuit(trick);
  if (leadSuit) {
    const leadPlays = trick.filter((t) => t.card.type === 'suit' && t.card.suit === leadSuit);
    if (leadPlays.length > 0) {
      let best = leadPlays[0];
      for (let i = 1; i < leadPlays.length; i++) {
        if ((leadPlays[i].card.value || 0) > (best.card.value || 0)) {
          best = leadPlays[i];
        }
      }
      const bonus = (best.card.value || 0) === 14 ? 10 : 0;
      return {
        winnerPlayerId: best.playerId,
        winnerPlayerName: best.playerName,
        winningCard: best.card,
        bonusPoints: bonus,
        bonusReason: bonus > 0 ? `${best.playerName} won with the 14 of ${leadSuit.toUpperCase()}! (+10 Bonus PTS)` : undefined,
      };
    }
  }

  // Rule 7: If all plays are Alibis or non-lead cards
  const nonAlibi = trick.find((t) => getEffectiveRole(t) !== 'alibi');
  const fallbackWinner = nonAlibi || trick[0];
  return {
    winnerPlayerId: fallbackWinner.playerId,
    winnerPlayerName: fallbackWinner.playerName,
    winningCard: fallbackWinner.card,
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
        bidScore = 10 * roundNumber;
      } else {
        bidScore = -10 * roundNumber;
      }
    } else {
      if (won === bid) {
        bidScore = 20 * bid;
        effectiveBonus = bonus;
      } else {
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
