import { shuffle } from '../random.js';

export const suits = [
  ['gold', 'Stash Gold'],
  ['cyan', 'Speakeasy Cyan'],
  ['ruby', 'Blood Ruby'],
  ['black', 'Midnight Syndicate'],
];

export const specialCardMeta = {
  boss: { subtitle: 'THE BOSS', description: 'Defeats all Gangsters and standard suits. Loses ONLY to a Femme Fatale.' },
  'femme-fatale': { subtitle: 'FEMME FATALE', description: 'Defeats normal cards and enchants The Boss (+50 bonus). Loses to Gangsters.' },
  gangster: { subtitle: 'GANGSTER', description: 'Defeats Femme Fatale and normal suits. The first Gangster played wins the trick.' },
  chameleon: { subtitle: 'CHAMELEON', description: 'Can be played as either a Gangster or an Alibi.' },
  alibi: { subtitle: 'ALIBI', description: 'Zero value escape card. Avoids winning unwanted tricks.' },
  police: { subtitle: 'THE POLICE', description: 'Kraken raid! Destroys all trick cards. No trick winner. Next trick led by player to left.' },
  'fat-vinnie': { subtitle: 'FAT VINNIE', description: 'White whale kingpin. Mutes all specials to Alibis and strips card suits to white. Highest value wins.' },
  briefcase: { subtitle: 'BRIEFCASE', description: 'Black money briefcase. Acts as an Alibi. Trick winner forms an alliance with you (+20 PTS if both hit exact bids).' },
};

/**
 * Deal freezing rule for large player counts (7 and 8 players):
 * - 7 players: Rounds 1-9 scale 1-9 cards. Round 10 is frozen at 9 cards (max bid 9).
 * - 8 players: Rounds 1-8 scale 1-8 cards. Rounds 9 and 10 are frozen at 8 cards (max bid 8).
 */
export const getRoundCardCount = (round, playerCount) => {
  if (playerCount === 7) {
    return round >= 10 ? 9 : round;
  }
  if (playerCount === 8) {
    return round >= 8 ? 8 : round;
  }
  return round;
};

export const createMidnightDeck = (advancedMode = false) => {
  const deck = [];

  // 14 cards of each 4 suits = 56 numbered cards
  for (const [suit, title] of suits) {
    for (let value = 1; value <= 14; value += 1) {
      deck.push({
        id: `card-${suit}-${value}`,
        type: 'suit',
        suit,
        value,
        name: `${value} of ${title}`,
        subtitle: title,
        bonusValue: value === 14 ? (suit === 'black' ? 20 : 10) : 0,
      });
    }
  }

  // Base special cards: 1 The Boss, 2 Femme Fatale, 5 Gangsters, 1 The Chameleon, 5 Alibis = 14 specials
  // Total base deck: 56 + 14 = 70 cards
  deck.push({ id: 'card-boss-1', type: 'special', role: 'boss', name: 'The Boss', ...specialCardMeta.boss });

  for (let index = 1; index <= 2; index += 1) {
    deck.push({ id: `card-femme-${index}`, type: 'special', role: 'femme-fatale', name: 'Femme Fatale', ...specialCardMeta['femme-fatale'] });
  }

  for (let index = 1; index <= 5; index += 1) {
    deck.push({ id: `card-gangster-${index}`, type: 'special', role: 'gangster', name: 'Gangster', ...specialCardMeta.gangster });
  }

  deck.push({ id: 'card-chameleon-1', type: 'special', role: 'chameleon', name: 'The Chameleon', ...specialCardMeta.chameleon });

  for (let index = 1; index <= 5; index += 1) {
    deck.push({ id: `card-alibi-${index}`, type: 'special', role: 'alibi', name: 'Alibi', ...specialCardMeta.alibi });
  }

  // Advanced mode extra cards: 1 The Police, 1 Fat Vinnie, 2 Briefcases = 4 cards
  // Total advanced deck: 70 + 4 = 74 cards
  if (advancedMode) {
    deck.push({ id: 'card-police-1', type: 'special', role: 'police', name: 'The Police', ...specialCardMeta.police });
    deck.push({ id: 'card-fat-vinnie-1', type: 'special', role: 'fat-vinnie', name: 'Fat Vinnie', ...specialCardMeta['fat-vinnie'] });
    deck.push({ id: 'card-briefcase-1', type: 'special', role: 'briefcase', name: 'Briefcase', ...specialCardMeta.briefcase });
    deck.push({ id: 'card-briefcase-2', type: 'special', role: 'briefcase', name: 'Briefcase', ...specialCardMeta.briefcase });
  }

  return deck;
};

export const dealMidnightRound = (state) => {
  const deck = shuffle(createMidnightDeck(Boolean(state.advancedMode)));
  state.hands = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, []]));

  const cardsToDeal = getRoundCardCount(state.round, state.playerOrder.length);
  for (let cardIndex = 0; cardIndex < cardsToDeal; cardIndex += 1) {
    for (const playerId of state.playerOrder) {
      state.hands[playerId].push(deck.pop());
    }
  }

  for (const hand of Object.values(state.hands)) {
    hand.sort((left, right) => (right.value || 0) - (left.value || 0));
  }

  state.bids = {};
  state.tricksWon = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, 0]));
  state.roundBonuses = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, 0]));
  state.briefcaseAlliances = [];
  state.currentTrick = [];
  state.lastResult = null;
  state.roundSummaryScores = null;
  state.phase = 'bidding';

  // Trick winner begins next trick/round, or police next lead if previous round ended on police
  const starter = state.policeNextLeadId && state.playerOrder.includes(state.policeNextLeadId)
    ? state.policeNextLeadId
    : (state.lastTrickWinnerId && state.playerOrder.includes(state.lastTrickWinnerId)
      ? state.lastTrickWinnerId
      : (state.lastRoundWinnerId && state.playerOrder.includes(state.lastRoundWinnerId)
        ? state.lastRoundWinnerId
        : state.playerOrder[0]));

  state.policeNextLeadId = null;
  state.leadPlayerId = starter;
  state.turnPlayerId = starter;
};
