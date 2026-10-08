import { shuffle } from '../random.js';
export const suits = [
  ['gold', 'Stash Gold'], ['cyan', 'Speakeasy Cyan'], ['ruby', 'Blood Ruby'], ['black', 'Midnight Syndicate'],
];

export const specialCardMeta = {
  boss: { subtitle: 'THE BOSS', description: 'Defeats all Gangsters and standard suits. Loses ONLY to a Femme Fatale.' },
  'femme-fatale': { subtitle: 'FEMME FATALE', description: 'Defeats normal cards and enchants The Boss (+50 bonus). Loses to Gangsters.' },
  gangster: { subtitle: 'GANGSTER', description: 'Defeats Femme Fatale and normal suits. The first Gangster played wins the trick.' },
  chameleon: { subtitle: 'CHAMELEON', description: 'Can be played as either a Gangster or an Alibi.' },
  alibi: { subtitle: 'ALIBI', description: 'Zero value escape card. Avoids winning unwanted tricks.' },
};

export const createMidnightDeck = () => {
  const deck = [];
  for (const [suit, title] of suits) {
    for (let value = 1;value <= 14;value += 1) {
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
  deck.push({ id: 'card-boss-1', type: 'special', role: 'boss', name: 'The Boss', ...specialCardMeta.boss });
  for (let index = 1;index <= 3;index += 1) deck.push({ id: `card-femme-${index}`, type: 'special', role: 'femme-fatale', name: 'Femme Fatale', ...specialCardMeta['femme-fatale'] });
  for (let index = 1;index <= 10;index += 1) deck.push({ id: `card-gangster-${index}`, type: 'special', role: 'gangster', name: 'Gangster', ...specialCardMeta.gangster });
  for (let index = 1;index <= 2;index += 1) deck.push({ id: `card-chameleon-${index}`, type: 'special', role: 'chameleon', name: 'The Chameleon', ...specialCardMeta.chameleon });
  for (let index = 1;index <= 10;index += 1) deck.push({ id: `card-alibi-${index}`, type: 'special', role: 'alibi', name: 'Alibi', ...specialCardMeta.alibi });
  return deck;
};

export const dealMidnightRound = (state) => {
  const deck = shuffle(createMidnightDeck());
  state.hands = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, []]));
  for (let cardIndex = 0;cardIndex < state.round;cardIndex += 1) {
    for (const playerId of state.playerOrder) state.hands[playerId].push(deck.pop());
  }
  for (const hand of Object.values(state.hands)) hand.sort((left, right) => (right.value || 0) - (left.value || 0));
  state.bids = {};
  state.tricksWon = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, 0]));
  state.roundBonuses = Object.fromEntries(state.playerOrder.map((playerId) => [playerId, 0]));
  state.currentTrick = [];
  state.lastResult = null;
  state.roundSummaryScores = null;
  state.phase = 'bidding';

  // "El jugador que empieza una ronda es el que ganó la ultima mano/trick."
  // Si Pepe gana la mano 1 empieza la mano 2. Si Manolo gana la mano 3 de ronda 3, Manolo empieza mano 1 de ronda 4.
  const starter = state.lastTrickWinnerId && state.playerOrder.includes(state.lastTrickWinnerId)
    ? state.lastTrickWinnerId
    : (state.lastRoundWinnerId && state.playerOrder.includes(state.lastRoundWinnerId)
      ? state.lastRoundWinnerId
      : state.playerOrder[0]);
  state.leadPlayerId = starter;
  state.turnPlayerId = starter;
};
