import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { ROOT_DIR } from '../src/server/config.js';
import * as games from '../src/server/games/index.js';

const room = (gameId) => ({
  id: 'room-test',
  gameId,
  settings: { bonegleGridSize: 4, dictionaryLang: 'en', roundDurationSec: 120 },
  players: [
    { id: 'human', name: 'Human', avatarId: 'boxer', isBot: false },
    { id: 'bot', name: 'Bot', avatarId: 'boxer', isBot: true },
  ],
});

const wordAction = {
  type: 'SUBMIT_WORD', word: 'CAT',
  path: [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
};
const wordState = (engine = games) => ({
  ...engine.createMatchState(room('bonegle'), 'bonegle-test'),
  board: [['C', 'X', 'X'], ['X', 'A', 'T'], ['X', 'X', 'S']],
});

test('Bonegle boards are deterministic for every supported size and language', () => {
  for (const language of ['en', 'es']) {
    for (const size of [4, 5, 6]) {
      const input = room('bonegle');
      input.settings.dictionaryLang = language;
      input.settings.bonegleGridSize = size;
      const first = games.createMatchState(input, 'same-seed');
      const second = games.createMatchState(input, 'same-seed');
      assert.deepEqual(first.board, second.board);
      assert.equal(first.board.length, size);
      assert.ok(first.board.every((row) => row.length === size));
    }
  }
});

test('Bonegle validates diagonal words and rejects invalid, duplicate and late-phase submissions', () => {
  const state = wordState();
  games.submitBonegleWord(state, 'human', wordAction, ROOT_DIR);
  assert.equal(state.submittedWords.human[0].word, 'CAT');
  assert.throws(() => games.submitBonegleWord(state, 'human', wordAction, ROOT_DIR), /already submitted/);
  assert.throws(() => games.submitBonegleWord(state, 'outsider', wordAction, ROOT_DIR), /Only match players/);
  assert.throws(() => games.submitBonegleWord(state, 'bot', { ...wordAction, word: 'DOG' }, ROOT_DIR), /does not match/);
  assert.throws(() => games.submitBonegleWord(state, 'bot', {
    ...wordAction, path: [{ row: 0, col: 0 }, { row: 0, col: 0 }],
  }, ROOT_DIR), /cannot be used twice/);
  assert.throws(() => games.submitBonegleWord(state, 'bot', {
    ...wordAction, path: [{ row: 0, col: 0 }, { row: 2, col: 2 }],
  }, ROOT_DIR), /must touch/);
  games.resolveBonegle(state);
  assert.throws(() => games.submitBonegleWord(state, 'bot', wordAction, ROOT_DIR), /no longer accepting/);
});

test('Bonegle resolution awards unique and shared points and is idempotent', () => {
  const unique = wordState();
  games.submitBonegleWord(unique, 'human', wordAction, ROOT_DIR);
  assert.equal(games.resolveBonegle(unique), true);
  assert.deepEqual(games.matchScores(unique), { human: 2, bot: 0 });
  assert.equal(unique.winnerId, 'human');
  assert.equal(games.resolveBonegle(unique), false);
  const uniqueBreakdowns = games.getPlayerBreakdowns(unique);
  assert.equal(uniqueBreakdowns.human.uniqueWords[0].word, 'CAT');
  assert.equal(uniqueBreakdowns.human.sections[0].title, 'Unique Words');

  const shared = wordState();
  for (const playerId of ['human', 'bot']) games.submitBonegleWord(shared, playerId, wordAction, ROOT_DIR);
  games.resolveBonegle(shared);
  assert.deepEqual(games.matchScores(shared), { human: 1, bot: 1 });
  const sharedBreakdowns = games.getPlayerBreakdowns(shared);
  assert.equal(sharedBreakdowns.human.sharedWords[0].word, 'CAT');
  assert.deepEqual(sharedBreakdowns.human.sharedWords[0].sharedWith, ['Bot']);
});

test('Midnight state projection hides other hands without mutating the server state', () => {
  const state = games.createMatchState(room('midnight-alley'), 'midnight-test');
  const original = structuredClone(state);
  const projected = games.projectMatchState(state, 'human');
  assert.deepEqual(Object.keys(projected.hands), ['human']);
  assert.deepEqual(projected.handCounts, { human: 1, bot: 1 });
  assert.deepEqual(projected.hands.human, state.hands.human);
  assert.deepEqual(state, original);
});

test('Midnight rejects illegal turns, unowned cards and invalid bids', () => {
  const state = games.createMatchState(room('midnight-alley'), 'midnight-test');
  assert.throws(() => games.submitMidnightAction(state, 'human', { type: 'PLACE_BID', bid: 2 }), /between zero/);
  games.submitMidnightAction(state, 'human', { type: 'PLACE_BID', bid: 0 });
  games.submitMidnightAction(state, 'bot', { type: 'PLACE_BID', bid: 0 });
  assert.throws(() => games.submitMidnightAction(state, 'bot', { type: 'PLAY_CARD', cardId: state.hands.bot[0].id }), /not your turn/);
  assert.throws(() => games.submitMidnightAction(state, 'human', { type: 'PLAY_CARD', cardId: 'missing' }), /do not own/);
});

test('Midnight automatic actions complete ten rounds with scores and a winner', () => {
  const state = games.createMatchState(room('midnight-alley'), 'midnight-test');
  let actionCount = 0;
  while (state.phase !== 'game_over' && actionCount < 500) {
    const next = games.automaticMidnightAction(state);
    assert.ok(next);
    games.submitMidnightAction(state, next.userId, next.action);
    actionCount += 1;
  }
  assert.equal(state.phase, 'game_over');
  assert.equal(state.round, 10);
  assert.equal(Object.keys(state.roundHistory).length, 10);
  assert.ok(state.playerOrder.includes(state.winnerId));
  assert.equal(state.turnPlayerId, null);
});

test('Removing players cleans per-player state in both games', () => {
  const bonegle = wordState();
  games.removePlayerFromMatch(bonegle, 'bot');
  assert.equal(bonegle.submittedWords.bot, undefined);
  assert.equal(games.removePlayerFromMatch(bonegle, 'missing'), false);
  const midnight = games.createMatchState(room('midnight-alley'), 'midnight-test');
  games.removePlayerFromMatch(midnight, 'bot');
  assert.deepEqual(midnight.playerOrder, ['human']);
  assert.equal(midnight.hands.bot, undefined);
  assert.equal(midnight.phase, 'bidding');
});

test('Midnight deck distributions: 70 cards in standard mode, 74 cards in advanced mode', async () => {
  const { createMidnightDeck } = await import('../src/server/games/midnight-alley/deck.js');
  const standardDeck = createMidnightDeck(false);
  assert.equal(standardDeck.length, 70);

  const bossCount = standardDeck.filter((c) => c.role === 'boss').length;
  const femmeCount = standardDeck.filter((c) => c.role === 'femme-fatale').length;
  const gangsterCount = standardDeck.filter((c) => c.role === 'gangster').length;
  const chameleonCount = standardDeck.filter((c) => c.role === 'chameleon').length;
  const alibiCount = standardDeck.filter((c) => c.role === 'alibi').length;

  assert.equal(bossCount, 1);
  assert.equal(femmeCount, 2);
  assert.equal(gangsterCount, 5);
  assert.equal(chameleonCount, 1);
  assert.equal(alibiCount, 5);

  for (const suit of ['black', 'gold', 'cyan', 'ruby']) {
    const suitCards = standardDeck.filter((c) => c.suit === suit);
    assert.equal(suitCards.length, 14);
  }

  const advancedDeck = createMidnightDeck(true);
  assert.equal(advancedDeck.length, 74);
  assert.equal(advancedDeck.filter((c) => c.role === 'police').length, 1);
  assert.equal(advancedDeck.filter((c) => c.role === 'fat-vinnie').length, 1);
  assert.equal(advancedDeck.filter((c) => c.role === 'briefcase').length, 2);
});

test('Midnight deal freezing rules for 7 and 8 players', async () => {
  const { getRoundCardCount } = await import('../src/server/games/midnight-alley/deck.js');

  // 7 players: rounds 1-9 deal 1-9 cards, round 10 is frozen at 9 cards
  assert.equal(getRoundCardCount(9, 7), 9);
  assert.equal(getRoundCardCount(10, 7), 9);

  // 8 players: rounds 1-8 deal 1-8 cards, rounds 9 and 10 are frozen at 8 cards
  assert.equal(getRoundCardCount(8, 8), 8);
  assert.equal(getRoundCardCount(9, 8), 8);
  assert.equal(getRoundCardCount(10, 8), 8);

  // Standard (e.g. 4 players): round 10 deals 10 cards
  assert.equal(getRoundCardCount(10, 4), 10);
});

test('Midnight Police destroys trick and assigns lead to player situated to the left', async () => {
  const { evaluateTrick } = await import('../src/server/games/midnight-alley/rules.js');
  const playerOrder = ['p1', 'p2', 'p3', 'p4'];

  const trick = [
    { playerId: 'p1', playerName: 'P1', card: { id: 'c1', type: 'suit', suit: 'black', value: 14 } },
    { playerId: 'p2', playerName: 'P2', card: { id: 'c2', type: 'special', role: 'police', name: 'The Police' } },
    { playerId: 'p3', playerName: 'P3', card: { id: 'c3', type: 'suit', suit: 'black', value: 10 } },
    { playerId: 'p4', playerName: 'P4', card: { id: 'c4', type: 'special', role: 'briefcase', name: 'Briefcase' } },
  ];

  const result = evaluateTrick(trick, playerOrder);
  assert.equal(result.destroyed, true);
  assert.equal(result.winnerPlayerId, null);
  // Left of p2 in ['p1', 'p2', 'p3', 'p4'] is p3
  assert.equal(result.nextLeadPlayerId, 'p3');
  // No briefcase alliances if Police destroys trick
  assert.equal(result.briefcases.length, 0);
});

test('Midnight Fat Vinnie mutes specials and white numbers win with tie break by earliest played', async () => {
  const { evaluateTrick } = await import('../src/server/games/midnight-alley/rules.js');
  const playerOrder = ['p1', 'p2', 'p3', 'p4'];

  const trick = [
    { playerId: 'p1', playerName: 'P1', card: { id: 'c1', type: 'special', role: 'boss', name: 'The Boss' } },
    { playerId: 'p2', playerName: 'P2', card: { id: 'c2', type: 'suit', suit: 'ruby', value: 12 } },
    { playerId: 'p3', playerName: 'P3', card: { id: 'c3', type: 'special', role: 'fat-vinnie', name: 'Fat Vinnie' } },
    { playerId: 'p4', playerName: 'P4', card: { id: 'c4', type: 'suit', suit: 'black', value: 12 } }, // Trump 12 ties ruby 12, but ruby was played first!
  ];

  const result = evaluateTrick(trick, playerOrder);
  assert.equal(result.destroyed, false);
  // P2 played value 12 first, so P2 wins over P4 despite P4 being black suit
  assert.equal(result.winnerPlayerId, 'p2');
  assert.equal(result.bonusPoints, 0);
});

test('Midnight Police vs Fat Vinnie Clash: second card played wins the clash', async () => {
  const { evaluateTrick } = await import('../src/server/games/midnight-alley/rules.js');
  const playerOrder = ['p1', 'p2', 'p3', 'p4'];

  // Case A: Police played first, Fat Vinnie played second -> Fat Vinnie wins clash!
  const trickA = [
    { playerId: 'p1', playerName: 'P1', card: { id: 'c1', type: 'special', role: 'police', name: 'The Police' } },
    { playerId: 'p2', playerName: 'P2', card: { id: 'c2', type: 'suit', suit: 'gold', value: 11 } },
    { playerId: 'p3', playerName: 'P3', card: { id: 'c3', type: 'special', role: 'fat-vinnie', name: 'Fat Vinnie' } },
    { playerId: 'p4', playerName: 'P4', card: { id: 'c4', type: 'suit', suit: 'ruby', value: 9 } },
  ];
  const resultA = evaluateTrick(trickA, playerOrder);
  assert.equal(resultA.destroyed, false);
  assert.equal(resultA.winnerPlayerId, 'p2');

  // Case B: Fat Vinnie played first, Police played second -> Police wins clash!
  const trickB = [
    { playerId: 'p1', playerName: 'P1', card: { id: 'c1', type: 'special', role: 'fat-vinnie', name: 'Fat Vinnie' } },
    { playerId: 'p2', playerName: 'P2', card: { id: 'c2', type: 'suit', suit: 'gold', value: 11 } },
    { playerId: 'p3', playerName: 'P3', card: { id: 'c3', type: 'special', role: 'police', name: 'The Police' } },
    { playerId: 'p4', playerName: 'P4', card: { id: 'c4', type: 'suit', suit: 'ruby', value: 9 } },
  ];
  const resultB = evaluateTrick(trickB, playerOrder);
  assert.equal(resultB.destroyed, true);
  // Left of p3 is p4
  assert.equal(resultB.nextLeadPlayerId, 'p4');
});

test('Midnight Briefcase Alliance awards +20 PTS if both hit exact bids', async () => {
  const { scoreRound } = await import('../src/server/games/midnight-alley/rules.js');

  const state = {
    round: 3,
    playerOrder: ['p1', 'p2'],
    bids: { p1: 1, p2: 2 },
    tricksWon: { p1: 1, p2: 2 },
    roundBonuses: { p1: 0, p2: 0 },
    cumulativeScores: { p1: 0, p2: 0 },
    briefcaseAlliances: [{ briefcasePlayerId: 'p1', winnerPlayerId: 'p2' }],
  };

  const breakdown = scoreRound(state);
  // Both hit exact bids: p1 bid 1 won 1 (20 pts) + 20 briefcase = 40 pts
  // p2 bid 2 won 2 (40 pts) + 20 briefcase = 60 pts
  assert.equal(breakdown.p1.briefcaseBonus, 20);
  assert.equal(breakdown.p2.briefcaseBonus, 20);
  assert.equal(breakdown.p1.totalRoundScore, 40);
  assert.equal(breakdown.p2.totalRoundScore, 60);

  // If one fails their bid, neither receives the briefcase bonus
  const failState = {
    round: 3,
    playerOrder: ['p1', 'p2'],
    bids: { p1: 1, p2: 2 },
    tricksWon: { p1: 1, p2: 1 }, // p2 missed bid!
    roundBonuses: { p1: 0, p2: 0 },
    cumulativeScores: { p1: 0, p2: 0 },
    briefcaseAlliances: [{ briefcasePlayerId: 'p1', winnerPlayerId: 'p2' }],
  };
  const failBreakdown = scoreRound(failState);
  assert.equal(failBreakdown.p1.briefcaseBonus, 0);
  assert.equal(failBreakdown.p2.briefcaseBonus, 0);
});

test('Extracted engines match the pre-migration engine', { skip: !process.env.BASELINE_ENGINE_FILE }, async () => {
  const baseline = await import(pathToFileURL(process.env.BASELINE_ENGINE_FILE).href);
  const originalNow = Date.now;
  const originalRandom = Math.random;
  Date.now = () => 1700000000000;
  let randomSeed = 1;
  Math.random = () => {
    randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  };
  try {
    for (const gameId of ['bonegle', 'midnight-alley']) {
      const input = room(gameId);
      randomSeed = 42;
      const before = baseline.createMatchState(input, 'equivalence-test');
      randomSeed = 42;
      const after = games.createMatchState(input, 'equivalence-test');
      assert.deepEqual(after, before);
      if (gameId === 'bonegle') {
        before.board = wordState().board;
        after.board = structuredClone(before.board);
        for (const playerId of ['human', 'bot']) {
          baseline.submitBonegleWord(before, playerId, wordAction, ROOT_DIR);
          games.submitBonegleWord(after, playerId, wordAction, ROOT_DIR);
          assert.deepEqual(after, before);
        }
        assert.equal(games.resolveBonegle(after), baseline.resolveBonegle(before));
        assert.deepEqual(after, before);
      } else {
        let actionCount = 0;
        while (before.phase !== 'game_over' && actionCount < 500) {
          const nextBefore = baseline.automaticMidnightAction(before);
          const nextAfter = games.automaticMidnightAction(after);
          assert.deepEqual(nextAfter, nextBefore);
          const seed = 1000 + actionCount;
          randomSeed = seed;
          const resultBefore = baseline.submitMidnightAction(before, nextBefore.userId, nextBefore.action);
          randomSeed = seed;
          const resultAfter = games.submitMidnightAction(after, nextAfter.userId, nextAfter.action);
          assert.deepEqual(resultAfter, resultBefore);
          assert.deepEqual(after, before);
          assert.deepEqual(games.projectMatchState(after, 'human'), baseline.projectMatchState(before, 'human'));
          actionCount += 1;
        }
        assert.equal(after.phase, 'game_over');
      }
      assert.deepEqual(games.matchScores(after), baseline.matchScores(before));
      randomSeed = 999;
      const removedBefore = baseline.removePlayerFromMatch(before, 'bot');
      randomSeed = 999;
      const removedAfter = games.removePlayerFromMatch(after, 'bot');
      assert.equal(removedAfter, removedBefore);
      assert.deepEqual(after, before);
    }
  } finally {
    Date.now = originalNow;
    Math.random = originalRandom;
  }
});