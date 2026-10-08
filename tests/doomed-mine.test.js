import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createDeck,
  evaluateBestHand,
  evaluate5Cards,
  compareHandScores,
  HAND_CATEGORIES,
} from '../src/server/games/doomed-mine/poker.js';
import { doomedMineEngine } from '../src/server/games/doomed-mine/engine.js';
import * as games from '../src/server/games/index.js';

const mockRoom = (minPlayers = 2, maxPlayers = 6) => ({
  id: 'room-mine-test',
  gameId: 'doomed-mine',
  settings: { roundDurationSec: 60, matchSeed: 'test-seed-42' },
  players: [
    { id: 'player1', name: 'Miner Pete', avatarId: 'fisherman', isBot: false },
    { id: 'player2', name: 'Prospector Joe', avatarId: 'boxer', isBot: false },
    { id: 'player3', name: 'Dynamite Bot', avatarId: 'aviator', isBot: true },
  ],
});

test('Doomed Mine: Poker deck generates 52 unique standard cards', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  const ids = new Set(deck.map((c) => c.id));
  assert.equal(ids.size, 52);
  const suits = new Set(deck.map((c) => c.suit));
  assert.equal(suits.size, 4);
});

test('Doomed Mine: Poker hand evaluator correctly classifies all 10 hand categories', () => {
  // Royal Flush
  const royalFlush = evaluate5Cards([
    { suit: 'spades', rank: 'A', value: 14 },
    { suit: 'spades', rank: 'K', value: 13 },
    { suit: 'spades', rank: 'Q', value: 12 },
    { suit: 'spades', rank: 'J', value: 11 },
    { suit: 'spades', rank: '10', value: 10 },
  ]);
  assert.equal(royalFlush.categoryRank, HAND_CATEGORIES.ROYAL_FLUSH);

  // Straight Flush
  const straightFlush = evaluate5Cards([
    { suit: 'hearts', rank: '9', value: 9 },
    { suit: 'hearts', rank: '8', value: 8 },
    { suit: 'hearts', rank: '7', value: 7 },
    { suit: 'hearts', rank: '6', value: 6 },
    { suit: 'hearts', rank: '5', value: 5 },
  ]);
  assert.equal(straightFlush.categoryRank, HAND_CATEGORIES.STRAIGHT_FLUSH);

  // Four of a Kind
  const quads = evaluate5Cards([
    { suit: 'spades', rank: '7', value: 7 },
    { suit: 'hearts', rank: '7', value: 7 },
    { suit: 'diamonds', rank: '7', value: 7 },
    { suit: 'clubs', rank: '7', value: 7 },
    { suit: 'spades', rank: 'A', value: 14 },
  ]);
  assert.equal(quads.categoryRank, HAND_CATEGORIES.FOUR_OF_A_KIND);

  // Full House
  const fullHouse = evaluate5Cards([
    { suit: 'spades', rank: 'K', value: 13 },
    { suit: 'hearts', rank: 'K', value: 13 },
    { suit: 'diamonds', rank: 'K', value: 13 },
    { suit: 'clubs', rank: '4', value: 4 },
    { suit: 'spades', rank: '4', value: 4 },
  ]);
  assert.equal(fullHouse.categoryRank, HAND_CATEGORIES.FULL_HOUSE);

  // Flush
  const flush = evaluate5Cards([
    { suit: 'clubs', rank: 'A', value: 14 },
    { suit: 'clubs', rank: 'J', value: 11 },
    { suit: 'clubs', rank: '8', value: 8 },
    { suit: 'clubs', rank: '6', value: 6 },
    { suit: 'clubs', rank: '2', value: 2 },
  ]);
  assert.equal(flush.categoryRank, HAND_CATEGORIES.FLUSH);

  // Straight (with Ace-low wheel)
  const wheel = evaluate5Cards([
    { suit: 'clubs', rank: 'A', value: 14 },
    { suit: 'hearts', rank: '2', value: 2 },
    { suit: 'diamonds', rank: '3', value: 3 },
    { suit: 'spades', rank: '4', value: 4 },
    { suit: 'clubs', rank: '5', value: 5 },
  ]);
  assert.equal(wheel.categoryRank, HAND_CATEGORIES.STRAIGHT);
  assert.equal(wheel.score[1], 5); // 5-high straight

  // Three of a Kind
  const trips = evaluate5Cards([
    { suit: 'spades', rank: '10', value: 10 },
    { suit: 'hearts', rank: '10', value: 10 },
    { suit: 'diamonds', rank: '10', value: 10 },
    { suit: 'clubs', rank: 'A', value: 14 },
    { suit: 'spades', rank: '2', value: 2 },
  ]);
  assert.equal(trips.categoryRank, HAND_CATEGORIES.THREE_OF_A_KIND);

  // Two Pair
  const twoPair = evaluate5Cards([
    { suit: 'spades', rank: 'A', value: 14 },
    { suit: 'hearts', rank: 'A', value: 14 },
    { suit: 'diamonds', rank: '8', value: 8 },
    { suit: 'clubs', rank: '8', value: 8 },
    { suit: 'spades', rank: 'K', value: 13 },
  ]);
  assert.equal(twoPair.categoryRank, HAND_CATEGORIES.TWO_PAIR);

  // One Pair
  const onePair = evaluate5Cards([
    { suit: 'spades', rank: 'Q', value: 12 },
    { suit: 'hearts', rank: 'Q', value: 12 },
    { suit: 'diamonds', rank: '10', value: 10 },
    { suit: 'clubs', rank: '8', value: 8 },
    { suit: 'spades', rank: '3', value: 3 },
  ]);
  assert.equal(onePair.categoryRank, HAND_CATEGORIES.ONE_PAIR);

  // High Card
  const highCard = evaluate5Cards([
    { suit: 'spades', rank: 'A', value: 14 },
    { suit: 'hearts', rank: 'K', value: 13 },
    { suit: 'diamonds', rank: '9', value: 9 },
    { suit: 'clubs', rank: '7', value: 7 },
    { suit: 'spades', rank: '2', value: 2 },
  ]);
  assert.equal(highCard.categoryRank, HAND_CATEGORIES.HIGH_CARD);
});

test('Doomed Mine: Hand comparison breaks ties using kickers', () => {
  const pairAcesKickerK = evaluate5Cards([
    { suit: 'spades', rank: 'A', value: 14 },
    { suit: 'hearts', rank: 'A', value: 14 },
    { suit: 'diamonds', rank: 'K', value: 13 },
    { suit: 'clubs', rank: '4', value: 4 },
    { suit: 'spades', rank: '2', value: 2 },
  ]);
  const pairAcesKickerQ = evaluate5Cards([
    { suit: 'diamonds', rank: 'A', value: 14 },
    { suit: 'clubs', rank: 'A', value: 14 },
    { suit: 'spades', rank: 'Q', value: 12 },
    { suit: 'hearts', rank: '4', value: 4 },
    { suit: 'clubs', rank: '2', value: 2 },
  ]);

  assert.ok(compareHandScores(pairAcesKickerK.score, pairAcesKickerQ.score) > 0);
  assert.ok(compareHandScores(pairAcesKickerQ.score, pairAcesKickerK.score) < 0);
});

test('Doomed Mine: 7-card evaluator chooses best 5 cards', () => {
  // 7 cards containing a flush and random pairs
  const cards = [
    { suit: 'spades', rank: 'A', value: 14 },
    { suit: 'spades', rank: 'K', value: 13 },
    { suit: 'spades', rank: '10', value: 10 },
    { suit: 'spades', rank: '6', value: 6 },
    { suit: 'spades', rank: '2', value: 2 },
    { suit: 'hearts', rank: 'A', value: 14 },
    { suit: 'diamonds', rank: 'A', value: 14 },
  ];
  const best = evaluateBestHand(cards);
  assert.equal(best.categoryRank, HAND_CATEGORIES.FLUSH);
});

test('Doomed Mine: Match state creation and registration in GAME_ENGINES', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-1');
  assert.equal(state.gameId, 'doomed-mine');
  assert.equal(state.phase, 'pre_flop');
  assert.equal(state.expedition, 1);
  assert.equal(state.successes, 0);
  assert.equal(state.failures, 0);
  assert.equal(state.players.length, 3);
  assert.equal(state.communityCards.length, 0);
  assert.equal(state.availableTokens.length, 3);
});

test('Doomed Mine: Token selection, stealing and host-driven round advance', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-2');

  // Player 1 picks token 2: immediately ready
  doomedMineEngine.applyAction(state, 'player1', { type: 'SELECT_TOKEN', token: 2 });
  assert.equal(state.tokens.player1, 2);
  assert.equal(state.ready.player1, true);

  // Player 2 picks token 2 (steals from Player 1): Player 1 loses token and is no longer ready
  doomedMineEngine.applyAction(state, 'player2', { type: 'SELECT_TOKEN', token: 2 });
  assert.equal(state.tokens.player2, 2);
  assert.equal(state.ready.player2, true);
  assert.equal(state.tokens.player1, null);
  assert.equal(state.ready.player1, false);

  // Player 1 picks token 1
  doomedMineEngine.applyAction(state, 'player1', { type: 'SELECT_TOKEN', token: 1 });
  assert.equal(state.tokens.player1, 1);
  assert.equal(state.ready.player1, true);

  // Bot picks token 3
  doomedMineEngine.applyAction(state, 'player3', { type: 'SELECT_TOKEN', token: 3 });
  assert.equal(state.tokens.player3, 3);
  assert.equal(state.ready.player3, true);

  // Non-host (player2) cannot advance phase
  assert.throws(
    () => doomedMineEngine.applyAction(state, 'player2', { type: 'ADVANCE_PHASE' }),
    /Solo el Capataz/
  );

  // Host (player1) advances to 'flop'!
  const result = doomedMineEngine.applyAction(state, 'player1', { type: 'ADVANCE_PHASE' });
  assert.equal(state.phase, 'flop');
  assert.equal(state.communityCards.length, 3);

  // Tokens recorded in history at a glance
  assert.equal(state.tokenHistory.player1.r1, 1);
  assert.equal(state.tokenHistory.player2.r1, 2);
  assert.equal(state.tokenHistory.player3.r1, 3);

  // All tokens reset for the new round
  assert.equal(state.tokens.player1, null);
  assert.equal(state.tokens.player2, null);
  assert.equal(state.tokens.player3, null);
  assert.equal(result.finished, false);
});

test('Doomed Mine: Advances through all 4 rounds to showdown', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-3');

  // Helper to complete phase (all pick tokens, host advances)
  const completePhase = () => {
    doomedMineEngine.applyAction(state, 'player1', { type: 'SELECT_TOKEN', token: 1 });
    doomedMineEngine.applyAction(state, 'player2', { type: 'SELECT_TOKEN', token: 2 });
    doomedMineEngine.applyAction(state, 'player3', { type: 'SELECT_TOKEN', token: 3 });
    return doomedMineEngine.applyAction(state, 'player1', { type: 'ADVANCE_PHASE' });
  };

  // 1. Pre-flop -> Flop
  completePhase();
  assert.equal(state.phase, 'flop');
  assert.equal(state.communityCards.length, 3);

  // 2. Flop -> Turn
  completePhase();
  assert.equal(state.phase, 'turn');
  assert.equal(state.communityCards.length, 4);

  // 3. Turn -> River
  completePhase();
  assert.equal(state.phase, 'river');
  assert.equal(state.communityCards.length, 5);

  // 4. River -> Showdown
  completePhase();
  assert.equal(state.phase, 'showdown');
  assert.ok(state.showdownResult !== null);
  assert.ok(typeof state.showdownResult.success === 'boolean');
  assert.equal(state.communityCards.length, 5);
});

test('Doomed Mine: Private state projection conceals opponent hole cards until showdown', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-4');

  const projectedP1 = doomedMineEngine.projectState(state, 'player1');
  assert.equal(projectedP1.privateCards.player1.length, 2);
  assert.equal(projectedP1.privateCards.player2.length, 0); // Opponent cards redacted
  assert.equal(projectedP1.privateCards.player3.length, 0);
  assert.equal(projectedP1.hiddenCommunityCards, undefined); // Server secrets hidden

  // Simulate showdown phase
  state.phase = 'showdown';
  const projectedShowdown = doomedMineEngine.projectState(state, 'player1');
  assert.equal(projectedShowdown.privateCards.player1.length, 2);
  assert.equal(projectedShowdown.privateCards.player2.length, 2); // All revealed at showdown
  assert.equal(projectedShowdown.privateCards.player3.length, 2);
});

test('Doomed Mine: Bot heuristic generates valid automatic actions', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-5');

  const botAction = doomedMineEngine.getAutomaticAction(state);
  assert.ok(botAction !== null);
  assert.equal(botAction.userId, 'player3');
  assert.equal(botAction.action.type, 'SELECT_TOKEN');
  assert.ok(botAction.action.token >= 1 && botAction.action.token <= 3);

  // Apply bot action
  doomedMineEngine.applyAction(state, botAction.userId, botAction.action);
  assert.equal(state.tokens.player3, botAction.action.token);
  assert.equal(state.ready.player3, true);
});

test('Doomed Mine: Generates structured breakdowns for victory podium', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-6');
  state.successes = 3;
  state.failures = 1;
  state.phase = 'game_over';

  const breakdowns = doomedMineEngine.getPlayerBreakdowns(state);
  assert.ok(breakdowns.player1);
  assert.equal(breakdowns.player1.sections[0].badge, 'RESCATADOS');
  assert.equal(breakdowns.player1.sections[0].items[0].label, 'Galerías Aseguradas');
  assert.equal(breakdowns.player1.sections[0].items[0].value, '3 / 3');
});

test('Doomed Mine: Showdown correctly detects order violations and cave-ins', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-7');

  // Fix hands manually:
  // Player 1 has pocket pair of Aces (strong)
  state.privateCards.player1 = [
    { suit: 'spades', rank: 'A', value: 14 },
    { suit: 'hearts', rank: 'A', value: 14 },
  ];
  // Player 2 has 7-2 offsuit (weak)
  state.privateCards.player2 = [
    { suit: 'diamonds', rank: '7', value: 7 },
    { suit: 'clubs', rank: '2', value: 2 },
  ];
  // Player 3 has high card King
  state.privateCards.player3 = [
    { suit: 'diamonds', rank: 'K', value: 13 },
    { suit: 'clubs', rank: '4', value: 4 },
  ];
  state.communityCards = [
    { suit: 'spades', rank: '3', value: 3 },
    { suit: 'hearts', rank: '5', value: 5 },
    { suit: 'clubs', rank: '8', value: 8 },
    { suit: 'diamonds', rank: '9', value: 9 },
    { suit: 'hearts', rank: 'J', value: 11 },
  ];

  // Inverted tokens: Player 1 takes token 1 (claiming to be weakest), but is actually strongest!
  // Player 2 takes token 3 (claiming to be strongest), but is actually weakest!
  state.tokens.player1 = 1;
  state.tokens.player2 = 3;
  state.tokens.player3 = 2;
  state.ready.player1 = true;
  state.ready.player2 = true;
  state.ready.player3 = true;
  state.phase = 'river';

  // Advance from river to showdown
  const result = doomedMineEngine.applyAction(state, 'player1', { type: 'CONFIRM_TOKEN' });
  assert.equal(state.phase, 'showdown');
  assert.equal(state.failures, 1);
  assert.equal(state.successes, 0);
  assert.equal(state.showdownResult.success, false);
  assert.ok(state.showdownResult.violations.length > 0);
});

test('Doomed Mine: Showdown succeeds when token ordering is correct', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-8');

  // Player 1: Pair of 2s (weakest)
  state.privateCards.player1 = [
    { suit: 'spades', rank: '2', value: 2 },
    { suit: 'hearts', rank: '2', value: 2 },
  ];
  // Player 2: Pair of 10s (middle)
  state.privateCards.player2 = [
    { suit: 'diamonds', rank: '10', value: 10 },
    { suit: 'clubs', rank: '10', value: 10 },
  ];
  // Player 3: Pair of Aces (strongest)
  state.privateCards.player3 = [
    { suit: 'spades', rank: 'A', value: 14 },
    { suit: 'hearts', rank: 'A', value: 14 },
  ];
  state.communityCards = [
    { suit: 'spades', rank: '4', value: 4 },
    { suit: 'hearts', rank: '5', value: 5 },
    { suit: 'clubs', rank: '8', value: 8 },
    { suit: 'diamonds', rank: '9', value: 9 },
    { suit: 'hearts', rank: 'J', value: 11 },
  ];

  // Correct token assignments: Player 1 = 1, Player 2 = 2, Player 3 = 3
  state.tokens.player1 = 1;
  state.tokens.player2 = 2;
  state.tokens.player3 = 3;
  state.ready.player1 = true;
  state.ready.player2 = true;
  state.ready.player3 = true;
  state.phase = 'river';

  doomedMineEngine.applyAction(state, 'player1', { type: 'CONFIRM_TOKEN' });
  assert.equal(state.phase, 'showdown');
  assert.equal(state.successes, 1);
  assert.equal(state.failures, 0);
  assert.equal(state.showdownResult.success, true);
  assert.equal(state.showdownResult.violations.length, 0);
});

test('Doomed Mine: Enforces no switching while holding token, only freed by steal', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-release-test');

  // Player 1 claims token 1
  doomedMineEngine.applyAction(state, 'player1', { type: 'SELECT_TOKEN', token: 1 });
  assert.equal(state.tokens.player1, 1);
  assert.equal(state.ready.player1, true);

  // Player 1 cannot pick another token voluntarily
  assert.throws(
    () => doomedMineEngine.applyAction(state, 'player1', { type: 'SELECT_TOKEN', token: 2 }),
    /Ya tienes una ficha asignada/
  );

  // Player 2 steals token 1 from Player 1
  doomedMineEngine.applyAction(state, 'player2', { type: 'SELECT_TOKEN', token: 1 });
  assert.equal(state.tokens.player2, 1);
  assert.equal(state.ready.player2, true);
  assert.equal(state.tokens.player1, null);
  assert.equal(state.ready.player1, false);

  // Now Player 1 can pick token 2!
  doomedMineEngine.applyAction(state, 'player1', { type: 'SELECT_TOKEN', token: 2 });
  assert.equal(state.tokens.player1, 2);
  assert.equal(state.ready.player1, true);
});

test('Doomed Mine: Shuffles cards properly with diverse suits and different cards per expedition', () => {
  const room = mockRoom();
  const state = games.createMatchState(room, 'mine-match-shuffle-test');

  const p1CardsExp1 = [...state.privateCards.player1];
  assert.equal(p1CardsExp1.length, 2);

  // Advance to next expedition
  state.phase = 'showdown';
  doomedMineEngine.applyAction(state, 'player1', { type: 'NEXT_EXPEDITION' });

  const p1CardsExp2 = [...state.privateCards.player1];
  assert.equal(p1CardsExp2.length, 2);

  // It's statistically nearly impossible (1 in ~1326) for 2 random cards to be identical
  const exp1Ids = p1CardsExp1.map((c) => c.id).join(',');
  const exp2Ids = p1CardsExp2.map((c) => c.id).join(',');
  assert.notEqual(exp1Ids, exp2Ids, 'Pocket cards should be freshly shuffled each expedition');
});

