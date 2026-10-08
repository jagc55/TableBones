import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from '../db/pool.js';
import { ROOT_DIR, DEFAULT_SETTINGS } from '../config.js';
import { loadRoom } from './rooms.js';
import { awardAchievement } from './auth.js';
import {
  createMatchState,
  getGameEngine,
  getPlayerBreakdowns,
  matchScores,
  setDeadline,
} from '../games/index.js';

export const createMatchService = (broadcast) => {
  const activeMatches = new Map();
  const { broadcastRoom, broadcastPublicRooms, broadcastMatchState, broadcastMatchFinished } = broadcast;

  const getLiveMatch = async (roomId) => {
    for (const match of activeMatches.values()) {
      if (match.state.roomId === roomId) return match;
    }
    const result = await pool.query(
      "SELECT id, state FROM matches WHERE room_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1",
      [roomId]
    );
    if (!result.rows[0]) return null;
    const match = { id: result.rows[0].id, state: result.rows[0].state, timer: null, finalized: false };
    activeMatches.set(match.id, match);
    scheduleMatch(match);
    return match;
  };

  const persistMatchState = async (match) => {
    await pool.query('UPDATE matches SET state = $1 WHERE id = $2 AND status = $3', [match.state, match.id, 'active']);
  };

  const clearMatchTimer = (match) => {
    if (match.timer) clearTimeout(match.timer);
    match.timer = null;
  };

  const createActiveMatch = async (room, resetPlayers = false) => {
    const matchId = randomUUID();
    const state = createMatchState(room, matchId);
    state.turnTimeLimitSec = Math.max(1, Number(room.settings.turnTimeLimitSec) || DEFAULT_SETTINGS.turnTimeLimitSec);

    const engine = getGameEngine(room.gameId);
    if (engine?.initDeadline) {
      engine.initDeadline(state);
    } else if (state.gameId === 'midnight-alley') {
      setDeadline(state, state.turnTimeLimitSec);
    }

    const match = { id: matchId, state, timer: null, finalized: false };
    activeMatches.set(matchId, match);
    try {
      await withTransaction(async (client) => {
        await client.query(
          "UPDATE rooms SET status = 'in_progress', winner_id = NULL, win_reason = NULL WHERE id = $1",
          [room.id]
        );
        if (resetPlayers) {
          await client.query(
            'UPDATE room_players SET score = 0, is_ready = TRUE WHERE room_id = $1',
            [room.id]
          );
        }
        await client.query(
          "INSERT INTO matches (id, room_id, game_id, status, state) VALUES ($1, $2, $3, 'active', $4)",
          [matchId, room.id, room.gameId, state]
        );
      });
    } catch (error) {
      activeMatches.delete(matchId);
      throw error;
    }
    return match;
  };

  const finishMatch = async (match) => {
    if (match.finalized) return;
    match.finalized = true;
    clearMatchTimer(match);
    const { state } = match;
    const scores = matchScores(state);
    const breakdowns = getPlayerBreakdowns(state);

    try {
      await withTransaction(async (client) => {
        await client.query(
          "UPDATE rooms SET status = 'finished', winner_id = $1, win_reason = $2 WHERE id = $3",
          [state.winnerId, state.winReason || 'Match complete.', state.roomId]
        );
        await client.query(
          "UPDATE matches SET status = 'finished', winner_id = $1, finished_at = NOW(), state = $2 WHERE id = $3",
          [state.winnerId, state, match.id]
        );
        for (const [playerId, score] of Object.entries(scores)) {
          await client.query('UPDATE room_players SET score = $1 WHERE room_id = $2 AND user_id = $3', [score, state.roomId, playerId]);
        }
        for (const player of state.players) {
          if (player.isBot) continue;
          await client.query(
            `UPDATE users SET stats = COALESCE(stats, '{}'::jsonb) || jsonb_build_object(
             'matchesPlayed', COALESCE((stats->>'matchesPlayed')::integer, 0) + 1,
             'matchesWon', COALESCE((stats->>'matchesWon')::integer, 0) + $1
           ) WHERE id = $2`,
            [player.id === state.winnerId ? 1 : 0, player.id]
          );
          await awardAchievement(player.id, 'first-match', client);
          if (player.id === state.winnerId) await awardAchievement(player.id, 'ring-champion', client);
          if (Number(scores[player.id]) >= 30) await awardAchievement(player.id, 'high-roller', client);
          if (state.isWalkover && player.id === state.winnerId) {
            await client.query(
              `UPDATE users SET stats = COALESCE(stats, '{}'::jsonb) || jsonb_build_object(
               'walkoverWins', COALESCE((stats->>'walkoverWins')::integer, 0) + 1
             ) WHERE id = $1`,
              [player.id]
            );
            await awardAchievement(player.id, 'last-man-standing', client);
          }
        }
      });
    } catch (error) {
      match.finalized = false;
      throw error;
    }

    const completedRoom = await loadRoom(state.roomId);
    if (completedRoom?.players && breakdowns) {
      completedRoom.players = completedRoom.players.map((p) => {
        const b = breakdowns[p.id];
        if (!b) return p;
        return {
          ...p,
          breakdownSections: b.sections,
          breakdownItems: b.items,
          wordsBreakdown: b.words ? {
            uniqueWords: b.uniqueWords || [],
            sharedWords: b.sharedWords || [],
          } : undefined,
        };
      });
    }

    broadcastMatchState(state.roomId, state);
    broadcastMatchFinished(state.roomId, state, completedRoom, { scores, breakdowns });
    await broadcastRoom(state.roomId);
    await broadcastPublicRooms();
    activeMatches.delete(match.id);
  };

  const commitMatchAction = async (match, finished) => {
    if (finished) {
      await finishMatch(match);
      return;
    }
    await persistMatchState(match);
    broadcastMatchState(match.state.roomId, match.state);
    scheduleMatch(match);
  };

  const applyAutomaticAction = async (matchId) => {
    const match = activeMatches.get(matchId);
    if (!match || match.finalized) return;
    const engine = getGameEngine(match.state.gameId);
    const next = engine?.getAutomaticAction?.(match.state);
    if (!next) return;
    const result = engine.applyAction(match.state, next.userId, next.action, ROOT_DIR);
    await commitMatchAction(match, result.finished);
  };

  const handleMatchDeadline = async (matchId, deadline) => {
    const match = activeMatches.get(matchId);
    if (!match || match.finalized || match.state.deadline !== deadline) return;
    const engine = getGameEngine(match.state.gameId);
    if (engine?.onDeadline) {
      const result = engine.onDeadline(match.state, ROOT_DIR);
      if (result?.finished) {
        await finishMatch(match);
        return;
      }
    }
    await applyAutomaticAction(matchId);
  };

  const scheduleMatch = (match) => {
    clearMatchTimer(match);
    if (match.finalized || !match.state.deadline) return;
    const state = match.state;
    const engine = getGameEngine(state.gameId);
    let delay = Math.max(0, state.deadline - Date.now());

    const botDelay = engine?.getBotDelay?.(state);
    if (botDelay != null) delay = botDelay;

    const deadline = state.deadline;
    match.timer = setTimeout(() => {
      const current = activeMatches.get(match.id);
      if (!current || current.state.deadline !== deadline) return;
      handleMatchDeadline(match.id, deadline).catch((error) => console.error('Match deadline failed', error));
    }, delay);
  };

  const applyMatchAction = async (roomId, userId, action) => {
    const match = await getLiveMatch(roomId);
    if (!match) throw new Error('There is no live match in this room.');
    if (!match.state.players.some((player) => player.id === userId)) throw new Error('Only match players may act.');
    const engine = getGameEngine(match.state.gameId);
    if (!engine) throw new Error(`Unsupported game: ${match.state.gameId}`);

    const result = engine.applyAction(match.state, userId, action, ROOT_DIR);
    await commitMatchAction(match, result.finished);
    return result.clientResult || null;
  };

  return { activeMatches, getLiveMatch, clearMatchTimer, createActiveMatch, finishMatch, commitMatchAction, scheduleMatch, applyMatchAction };
};
