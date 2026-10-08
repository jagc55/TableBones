import { getRoundCardCount } from './deck.js';

export const leadSuit = (trick) => trick.find((entry) => entry.card.type === 'suit')?.card.suit || null;

export const effectiveRole = (entry) => {
  if (entry.card.role === 'chameleon') {
    return entry.chameleonChoice || 'gangster';
  }
  return entry.card.role;
};

export const isPlayable = (card, hand, trick) => {
  // Special cards (Boss, Femme Fatale, Gangster, Chameleon, Alibi, Police, Fat Vinnie, Briefcase) can always be played
  if (card.type === 'special') return true;
  const lead = leadSuit(trick);
  return !lead || card.suit === lead || !hand.some((item) => item.type === 'suit' && item.suit === lead);
};

export const evaluateTrick = (trick, playerOrder) => {
  // Step 1: Detect Police and Fat Vinnie
  const policeIndex = trick.findIndex((entry) => entry.card.role === 'police');
  const vinnieIndex = trick.findIndex((entry) => entry.card.role === 'fat-vinnie');

  let isPoliceActive = false;
  let isVinnieActive = false;

  if (policeIndex !== -1 && vinnieIndex !== -1) {
    // Clash duel: The second card played wins the clash and nullifies the first!
    // The first one played automatically becomes an Alibi.
    if (policeIndex < vinnieIndex) {
      // Police played first, Fat Vinnie played second -> Fat Vinnie wins!
      isVinnieActive = true;
      isPoliceActive = false;
    } else {
      // Fat Vinnie played first, Police played second -> Police wins!
      isPoliceActive = true;
      isVinnieActive = false;
    }
  } else if (policeIndex !== -1) {
    isPoliceActive = true;
  } else if (vinnieIndex !== -1) {
    isVinnieActive = true;
  }

  // Step 2: The Police effect
  if (isPoliceActive) {
    const policeEntry = trick[policeIndex];
    const policePlayerId = policeEntry.playerId;
    const policeOrderIdx = playerOrder ? playerOrder.indexOf(policePlayerId) : -1;
    const nextLeadPlayerId = (playerOrder && policeOrderIdx !== -1)
      ? playerOrder[(policeOrderIdx + 1) % playerOrder.length]
      : null;

    return {
      destroyed: true,
      policePlayerId,
      policePlayerName: policeEntry.playerName,
      nextLeadPlayerId,
      playerId: null,
      playerName: null,
      winnerPlayerId: null,
      winnerPlayerName: null,
      card: policeEntry.card,
      winningCard: policeEntry.card,
      bonusPoints: 0,
      bonusReason: 'The Police raided the table! All cards destroyed.',
      briefcases: [],
    };
  }

  // Step 3: Fat Vinnie effect
  if (isVinnieActive) {
    // Fat Vinnie mutes all special cards to Alibis and strips numeric cards of suit (they become white)
    // The player who played the highest numeric card wins. Ties go to the first played.
    // If no numeric cards were played, the first card played in the trick wins.
    const numericPlays = trick.filter(
      (entry) => entry.card.type === 'suit' && typeof entry.card.value === 'number'
    );

    if (numericPlays.length > 0) {
      let maxVal = -1;
      for (const play of numericPlays) {
        if (play.card.value > maxVal) {
          maxVal = play.card.value;
        }
      }
      // First card played with max value wins (tie-breaker)
      const winner = numericPlays.find((play) => play.card.value === maxVal);

      return {
        destroyed: false,
        playerId: winner.playerId,
        playerName: winner.playerName,
        winnerPlayerId: winner.playerId,
        winnerPlayerName: winner.playerName,
        card: winner.card,
        winningCard: winner.card,
        bonusPoints: 0,
        bonusReason: `Fat Vinnie stripped suits & powers! Highest number (${winner.card.value}) takes the trick.`,
        briefcases: [],
      };
    }

    // All plays were specials or alibis; first card played wins
    const winner = trick[0];
    return {
      destroyed: false,
      playerId: winner.playerId,
      playerName: winner.playerName,
      winnerPlayerId: winner.playerId,
      winnerPlayerName: winner.playerName,
      card: winner.card,
      winningCard: winner.card,
      bonusPoints: 0,
      bonusReason: 'Fat Vinnie turned all cards into Alibis! First card played takes the trick.',
      briefcases: [],
    };
  }

  // Step 4: Standard hierarchy (Briefcase acts as Alibi here)
  const boss = trick.find((entry) => entry.card.role === 'boss');
  const femmes = trick.filter((entry) => effectiveRole(entry) === 'femme-fatale');
  const gangsters = trick.filter((entry) => effectiveRole(entry) === 'gangster');

  let result;
  if (boss && femmes.length) {
    result = { ...femmes[0], bonusPoints: 50, bonusReason: 'Femme Fatale captivated The Boss.' };
  } else if (boss) {
    result = { ...boss, bonusPoints: gangsters.length * 30, bonusReason: gangsters.length ? 'The Boss captured Gangsters.' : undefined };
  } else if (gangsters.length) {
    result = { ...gangsters[0], bonusPoints: 0 };
  } else if (femmes.length) {
    result = { ...femmes[0], bonusPoints: 0 };
  } else {
    const trumps = trick.filter((entry) => entry.card.type === 'suit' && entry.card.suit === 'black');
    if (trumps.length) {
      const winner = trumps.reduce((best, entry) => (entry.card.value > best.card.value ? entry : best));
      result = { ...winner, bonusPoints: winner.card.value === 14 ? 20 : 0 };
    } else {
      const lead = leadSuit(trick);
      const suited = lead ? trick.filter((entry) => entry.card.type === 'suit' && entry.card.suit === lead) : [];
      if (suited.length) {
        const winner = suited.reduce((best, entry) => (entry.card.value > best.card.value ? entry : best));
        result = { ...winner, bonusPoints: winner.card.value === 14 ? 10 : 0 };
      } else {
        const nonAlibi = trick.find((entry) => {
          const role = effectiveRole(entry);
          return role !== 'alibi' && role !== 'briefcase';
        });
        result = { ...(nonAlibi || trick[0]), bonusPoints: 0 };
      }
    }
  }

  // Briefcases in standard tricks form an alliance with the trick winner
  const briefcasePlays = trick.filter((entry) => entry.card.role === 'briefcase');
  const briefcases = briefcasePlays.map((entry) => ({
    briefcasePlayerId: entry.playerId,
    winnerPlayerId: result.playerId,
  }));

  return {
    destroyed: false,
    playerId: result.playerId,
    playerName: result.playerName,
    winnerPlayerId: result.playerId,
    winnerPlayerName: result.playerName,
    card: result.card,
    winningCard: result.card,
    bonusPoints: result.bonusPoints || 0,
    bonusReason: result.bonusReason,
    briefcases,
  };
};

export const scoreRound = (state) => {
  const breakdown = {};
  const briefcaseBonuses = Object.fromEntries(state.playerOrder.map((id) => [id, 0]));
  const briefcaseDetails = Object.fromEntries(state.playerOrder.map((id) => [id, []]));

  // Process briefcase alliances for the round
  if (state.briefcaseAlliances && state.briefcaseAlliances.length > 0) {
    for (const alliance of state.briefcaseAlliances) {
      const { briefcasePlayerId, winnerPlayerId } = alliance;
      const bBid = state.bids[briefcasePlayerId] || 0;
      const bWon = state.tricksWon[briefcasePlayerId] || 0;
      const wBid = state.bids[winnerPlayerId] || 0;
      const wWon = state.tricksWon[winnerPlayerId] || 0;

      if (briefcasePlayerId === winnerPlayerId) {
        // Self-alliance: player won their own briefcase trick
        if (bWon === bBid) {
          briefcaseBonuses[briefcasePlayerId] += 20;
          briefcaseDetails[briefcasePlayerId].push('Self-Briefcase Alliance (+20 PTS)');
        }
      } else {
        // Two-player alliance: BOTH players must hit their exact bid
        if (bWon === bBid && wWon === wBid) {
          briefcaseBonuses[briefcasePlayerId] += 20;
          briefcaseBonuses[winnerPlayerId] += 20;
          const bName = state.players?.find((p) => p.id === briefcasePlayerId)?.name || 'Partner';
          const wName = state.players?.find((p) => p.id === winnerPlayerId)?.name || 'Partner';
          briefcaseDetails[briefcasePlayerId].push(`Briefcase Alliance with ${wName} (+20 PTS)`);
          briefcaseDetails[winnerPlayerId].push(`Briefcase Alliance with ${bName} (+20 PTS)`);
        }
      }
    }
  }

  const roundCardCount = getRoundCardCount(state.round, state.playerOrder.length);
  for (const playerId of state.playerOrder) {
    const bid = state.bids[playerId] || 0;
    const won = state.tricksWon[playerId] || 0;
    const bonus = state.roundBonuses[playerId] || 0;
    const bidScore = bid === 0
      ? (won === 0 ? 10 * roundCardCount : -10 * roundCardCount)
      : (won === bid ? 20 * bid : -10 * Math.abs(won - bid));
    const bonusScore = bid > 0 && won === bid ? bonus : 0;
    const bBonus = briefcaseBonuses[playerId] || 0;
    const totalRoundScore = bidScore + bonusScore + bBonus;
    state.cumulativeScores[playerId] += totalRoundScore;

    breakdown[playerId] = {
      playerId,
      bid,
      tricksWon: won,
      bidScore,
      bonusScore,
      briefcaseBonus: bBonus,
      briefcaseDetails: briefcaseDetails[playerId] || [],
      totalRoundScore,
      cumulativeScore: state.cumulativeScores[playerId],
    };
  }
  return breakdown;
};
