import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from '../db/pool.js';
import { ROOT_DIR, DEFAULT_SETTINGS } from '../config.js';
import { loadRoom } from './rooms.js';
import { awardAchievement } from './auth.js';
import { automaticMidnightAction, createMatchState, matchScores, projectMatchState, removePlayerFromMatch, resolveBonegle, setDeadline, submitBonegleWord, submitMidnightAction } from '../games/index.js';
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
    if (state.gameId === 'midnight-alley') setDeadline(state, state.turnTimeLimitSec);
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
    broadcastMatchState(state.roomId, state);
    broadcastMatchFinished(state.roomId, state, completedRoom);
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

  const applyAutomaticMidnightAction = async (matchId) => {
    const match = activeMatches.get(matchId);
    if (!match || match.finalized || match.state.gameId !== 'midnight-alley') return;
    const next = automaticMidnightAction(match.state);
    if (!next) return;
    const result = submitMidnightAction(match.state, next.userId, next.action);
    await commitMatchAction(match, result.finished);
  };

  const handleMatchDeadline = async (matchId, deadline) => {
    const match = activeMatches.get(matchId);
    if (!match || match.finalized || match.state.deadline !== deadline) return;
    if (match.state.gameId === 'bonegle') {
      if (resolveBonegle(match.state)) await finishMatch(match);
      return;
    }
    await applyAutomaticMidnightAction(matchId);
  };

  const scheduleMatch = (match) => {
    clearMatchTimer(match);
    if (match.finalized || !match.state.deadline) return;
    const state = match.state;
    let delay = Math.max(0, state.deadline - Date.now());

    if (state.gameId === 'midnight-alley') {
      if (state.phase === 'bidding') {
        const hasUnbidBot = state.players.some((p) => p.isBot && state.bids[p.id] === undefined);
        if (hasUnbidBot) delay = 300;
      } else if (state.phase === 'playing') {
        const activePlayer = state.players.find((p) => p.id === state.turnPlayerId);
        if (activePlayer?.isBot) delay = 450;
      }
    }

    const deadline = state.deadline;
    match.timer = setTimeout(() => {
      const current = activeMatches.get(match.id);
      if (!current || current.state.deadline !== deadline) return;
      if (state.gameId === 'midnight-alley') {
        applyAutomaticMidnightAction(match.id).catch((error) => console.error('Automatic match action failed', error));
        return;
      }
      handleMatchDeadline(match.id, deadline).catch((error) => console.error('Match deadline failed', error));
    }, delay);
  };

  const applyMatchAction = async (roomId, userId, action) => {
    const match = await getLiveMatch(roomId);
    if (!match) throw new Error('There is no live match in this room.');
    if (!match.state.players.some((player) => player.id === userId)) throw new Error('Only match players may act.');
    if (match.state.gameId === 'bonegle') {
      const word = String(action.word || '').trim().toUpperCase();
      if (Date.now() >= match.state.deadline) {
        if (resolveBonegle(match.state)) await finishMatch(match);
        return { type: 'BONEGLE_WORD_RESULT', roomId, word, status: 'invalid' };
      }
      if (action.type !== 'SUBMIT_WORD') throw new Error('Unsupported Bonegle action.');
      try {
        submitBonegleWord(match.state, userId, action, ROOT_DIR);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        return {
          type: 'BONEGLE_WORD_RESULT',
          roomId,
          word,
          status: message.includes('already submitted') ? 'duplicate' : 'invalid',
        };
      }
      await commitMatchAction(match, false);
      return { type: 'BONEGLE_WORD_RESULT', roomId, word, status: 'valid' };
    }
    if (!['PLACE_BID', 'PLAY_CARD', 'ADVANCE_TRICK', 'NEXT_ROUND'].includes(action.type)) {
      throw new Error('Unsupported Midnight Alley action.');
    }
    const result = submitMidnightAction(match.state, userId, action);
    await commitMatchAction(match, result.finished);
  };
  return { activeMatches, getLiveMatch, clearMatchTimer, createActiveMatch, finishMatch, commitMatchAction, scheduleMatch, applyMatchAction };
};
