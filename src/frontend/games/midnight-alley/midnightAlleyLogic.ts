import {
  MidnightCard,
  CardSuit,
  PlayedTrickCard,
  TrickResult,
  RoundScoreBreakdown,
} from './types';

/**
 * Deal freezing rule for large player counts (7 and 8 players):
 * - 7 players: Rounds 1-9 deal 1-9 cards. Round 10 is frozen at 9 cards (max bid 9).
 * - 8 players: Rounds 1-8 deal 1-8 cards. Rounds 9 and 10 are frozen at 8 cards (max bid 8).
 */
export function getRoundCardCount(round: number, playerCount: number): number {
  if (playerCount === 7) {
    return round >= 10 ? 9 : round;
  }
  if (playerCount === 8) {
    return round >= 8 ? 8 : round;
  }
  return round;
}

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
  // Special roles (The Boss, Femme Fatale, Gangster, Chameleon, Alibi, Police, Fat Vinnie, Briefcase) can always be played
  if (card.type === 'special') return true;

  const leadSuit = getEstablishedLeadSuit(currentTrick);
  if (!leadSuit) return true; // Free lead

  if (card.suit === leadSuit) return true;

  const hasLeadSuit = hand.some((c) => c.type === 'suit' && c.suit === leadSuit);
  return !hasLeadSuit; // Can play off-suit only if holding no cards in the established suit
}

// Evaluate trick winner according to official Mafia hierarchy and Advanced Mode rules
export function evaluateTrickWinner(trick: PlayedTrickCard[], playerOrder?: string[]): TrickResult {
  if (trick.length === 0) {
    throw new Error('Cannot evaluate empty trick');
  }

  const policeIndex = trick.findIndex((t) => t.card.role === 'police');
  const vinnieIndex = trick.findIndex((t) => t.card.role === 'fat-vinnie');

  let isPoliceActive = false;
  let isVinnieActive = false;

  if (policeIndex !== -1 && vinnieIndex !== -1) {
    // Clash duel: second card played wins the duel and nullifies the first
    if (policeIndex < vinnieIndex) {
      isVinnieActive = true;
      isPoliceActive = false;
    } else {
      isPoliceActive = true;
      isVinnieActive = false;
    }
  } else if (policeIndex !== -1) {
    isPoliceActive = true;
  } else if (vinnieIndex !== -1) {
    isVinnieActive = true;
  }

  // The Police: destroys the trick completely
  if (isPoliceActive) {
    const policeEntry = trick[policeIndex];
    const policeOrderIdx = playerOrder ? playerOrder.indexOf(policeEntry.playerId) : -1;
    const nextLeadPlayerId = (playerOrder && policeOrderIdx !== -1)
      ? playerOrder[(policeOrderIdx + 1) % playerOrder.length]
      : null;

    return {
      destroyed: true,
      policePlayerId: policeEntry.playerId,
      policePlayerName: policeEntry.playerName,
      nextLeadPlayerId,
      winnerPlayerId: null,
      winnerPlayerName: null,
      winningCard: policeEntry.card,
      bonusPoints: 0,
      bonusReason: 'The Police raided the table! All cards destroyed.',
      briefcases: [],
    };
  }

  // Fat Vinnie: mutes specials and turns numeric cards white (highest number wins)
  if (isVinnieActive) {
    const numericPlays = trick.filter(
      (t) => t.card.type === 'suit' && typeof t.card.value === 'number'
    );

    if (numericPlays.length > 0) {
      let maxVal = -1;
      for (const play of numericPlays) {
        if ((play.card.value || 0) > maxVal) {
          maxVal = play.card.value || 0;
        }
      }
      // First card played with highest value wins
      const winner = numericPlays.find((play) => play.card.value === maxVal)!;
      return {
        destroyed: false,
        winnerPlayerId: winner.playerId,
        winnerPlayerName: winner.playerName,
        winningCard: winner.card,
        bonusPoints: 0,
        bonusReason: `Fat Vinnie stripped suits & powers! Highest number (${winner.card.value}) takes trick.`,
        briefcases: [],
      };
    }

    const winner = trick[0];
    return {
      destroyed: false,
      winnerPlayerId: winner.playerId,
      winnerPlayerName: winner.playerName,
      winningCard: winner.card,
      bonusPoints: 0,
      bonusReason: 'Fat Vinnie turned all cards into Alibis! First card played takes trick.',
      briefcases: [],
    };
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

  let winnerPlay: PlayedTrickCard;
  let bonus = 0;
  let bonusReason: string | undefined;

  // Rule 1: Femme Fatale enchants The Boss (+50 bonus)
  if (bossPlay && femmePlays.length > 0) {
    winnerPlay = femmePlays[0];
    bonus = 50;
    bonusReason = `${winnerPlay.playerName}'s Femme Fatale enchanted The Boss! (+50 Bonus PTS)`;
  }
  // Rule 2: The Boss captures all Gangsters (+30 bonus per Gangster captured)
  else if (bossPlay) {
    winnerPlay = bossPlay;
    bonus = gangsterPlays.length * 30;
    bonusReason = bonus > 0
      ? `${bossPlay.playerName}'s Boss captured ${gangsterPlays.length} Gangster(s)! (+${bonus} Bonus PTS)`
      : undefined;
  }
  // Rule 3: Gangsters defeat Femme Fatales and normal suits
  else if (gangsterPlays.length > 0) {
    winnerPlay = gangsterPlays[0];
  }
  // Rule 4: Femme Fatales defeat normal suits
  else if (femmePlays.length > 0) {
    winnerPlay = femmePlays[0];
  }
  // Rule 5: Black suit is trump
  else {
    const blackPlays = trick.filter((t) => t.card.type === 'suit' && t.card.suit === 'black');
    if (blackPlays.length > 0) {
      let best = blackPlays[0];
      for (let i = 1; i < blackPlays.length; i++) {
        if ((blackPlays[i].card.value || 0) > (best.card.value || 0)) {
          best = blackPlays[i];
        }
      }
      winnerPlay = best;
      bonus = (best.card.value || 0) === 14 ? 20 : 0;
      bonusReason = bonus > 0 ? `${best.playerName} won with the 14 of Tommy Guns! (+20 Bonus PTS)` : undefined;
    } else {
      const leadSuit = getEstablishedLeadSuit(trick);
      const leadPlays = leadSuit ? trick.filter((t) => t.card.type === 'suit' && t.card.suit === leadSuit) : [];
      if (leadPlays.length > 0) {
        let best = leadPlays[0];
        for (let i = 1; i < leadPlays.length; i++) {
          if ((leadPlays[i].card.value || 0) > (best.card.value || 0)) {
            best = leadPlays[i];
          }
        }
        winnerPlay = best;
        bonus = (best.card.value || 0) === 14 ? 10 : 0;
        bonusReason = bonus > 0 ? `${best.playerName} won with the 14 of ${leadSuit?.toUpperCase()}! (+10 Bonus PTS)` : undefined;
      } else {
        const nonAlibi = trick.find((t) => {
          const role = getEffectiveRole(t);
          return role !== 'alibi' && role !== 'briefcase';
        });
        winnerPlay = nonAlibi || trick[0];
      }
    }
  }

  const briefcasePlays = trick.filter((t) => t.card.role === 'briefcase');
  const briefcases = briefcasePlays.map((t) => ({
    briefcasePlayerId: t.playerId,
    winnerPlayerId: winnerPlay.playerId,
  }));

  return {
    destroyed: false,
    winnerPlayerId: winnerPlay.playerId,
    winnerPlayerName: winnerPlay.playerName,
    winningCard: winnerPlay.card,
    bonusPoints: bonus,
    bonusReason,
    briefcases,
  };
}

// Calculate round scores for all players at end of round
export function calculateRoundScores(
  playerIds: string[],
  roundNumber: number,
  bids: Record<string, number>,
  tricksWon: Record<string, number>,
  roundBonuses: Record<string, number>,
  currentScores: Record<string, number>,
  briefcaseAlliances?: Array<{ briefcasePlayerId: string; winnerPlayerId: string }>,
  playerNames?: Record<string, string>
): Record<string, RoundScoreBreakdown> {
  const result: Record<string, RoundScoreBreakdown> = {};
  const briefcaseBonuses: Record<string, number> = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const briefcaseDetails: Record<string, string[]> = Object.fromEntries(playerIds.map((id) => [id, []]));

  if (briefcaseAlliances && briefcaseAlliances.length > 0) {
    for (const alliance of briefcaseAlliances) {
      const { briefcasePlayerId, winnerPlayerId } = alliance;
      const bBid = bids[briefcasePlayerId] ?? 0;
      const bWon = tricksWon[briefcasePlayerId] ?? 0;
      const wBid = bids[winnerPlayerId] ?? 0;
      const wWon = tricksWon[winnerPlayerId] ?? 0;

      if (briefcasePlayerId === winnerPlayerId) {
        if (bWon === bBid) {
          briefcaseBonuses[briefcasePlayerId] += 20;
          briefcaseDetails[briefcasePlayerId].push('Self-Briefcase Alliance (+20 PTS)');
        }
      } else {
        if (bWon === bBid && wWon === wBid) {
          briefcaseBonuses[briefcasePlayerId] += 20;
          briefcaseBonuses[winnerPlayerId] += 20;
          const bName = playerNames?.[briefcasePlayerId] || 'Partner';
          const wName = playerNames?.[winnerPlayerId] || 'Partner';
          briefcaseDetails[briefcasePlayerId].push(`Briefcase Alliance with ${wName} (+20 PTS)`);
          briefcaseDetails[winnerPlayerId].push(`Briefcase Alliance with ${bName} (+20 PTS)`);
        }
      }
    }
  }

  const roundMultiplier = getRoundCardCount(roundNumber, playerIds.length);

  playerIds.forEach((pId) => {
    const bid = bids[pId] ?? 0;
    const won = tricksWon[pId] ?? 0;
    const bonus = roundBonuses[pId] ?? 0;
    let bidScore = 0;
    let effectiveBonus = 0;

    if (bid === 0) {
      if (won === 0) {
        bidScore = 10 * roundMultiplier;
      } else {
        bidScore = -10 * roundMultiplier;
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

    const bBonus = briefcaseBonuses[pId] || 0;
    const totalRoundScore = bidScore + effectiveBonus + bBonus;
    const cumulativeScore = (currentScores[pId] || 0) + totalRoundScore;

    result[pId] = {
      playerId: pId,
      bid,
      tricksWon: won,
      bidScore,
      bonusScore: effectiveBonus,
      briefcaseBonus: bBonus,
      briefcaseDetails: briefcaseDetails[pId] || [],
      totalRoundScore,
      cumulativeScore,
    };
  });

  return result;
}
