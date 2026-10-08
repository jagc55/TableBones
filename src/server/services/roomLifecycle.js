import { pool } from '../db/pool.js';
import { loadRoom, isRoomMember } from './rooms.js';
import { removePlayerFromMatch, getGameEngine } from '../games/index.js';
export const createRoomLifecycle = (connections, broadcast, matches) => {
  const { send, broadcastRoom, broadcastPublicRooms } = broadcast;
  const { activeMatches, clearMatchTimer, getLiveMatch, finishMatch, commitMatchAction } = matches;
  const deleteOrCloseRoom = async (roomId) => {
    const matchResult = await pool.query(
      "SELECT id FROM matches WHERE room_id = $1 AND status = 'active'",
      [roomId]
    );
    for (const match of matchResult.rows) {
      const activeMatch = activeMatches.get(match.id);
      if (activeMatch) clearMatchTimer(activeMatch);
      activeMatches.delete(match.id);
    }
    await pool.query(
      "UPDATE matches SET status = 'abandoned', finished_at = NOW() WHERE room_id = $1 AND status = 'active'",
      [roomId]
    );
    await pool.query("UPDATE rooms SET status = 'closed', closed_at = NOW() WHERE id = $1", [roomId]);
    await pool.query("DELETE FROM room_players WHERE room_id = $1", [roomId]);

    try {
      await pool.query("DELETE FROM chat_messages WHERE room_id = $1", [roomId]);
      await pool.query("DELETE FROM matches WHERE room_id = $1 AND status = 'abandoned'", [roomId]);
      await pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);
    } catch {
      // Retain closed status if foreign key constraint restricts row deletion
    }

    for (const [ws, connection] of connections) {
      connection.roomIds.delete(roomId);
      send(ws, { type: 'ROOM_CLOSED', roomId });
    }
  };

  const leavePlayerFromRoom = async (roomId, userId) => {
    const isMember = await isRoomMember(roomId, userId);
    if (!isMember) return false;

    await pool.query('DELETE FROM room_players WHERE room_id = $1 AND user_id = $2', [roomId, userId]);

    for (const [, connection] of connections) {
      if (connection.userId === userId) connection.roomIds.delete(roomId);
    }

    const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (!roomResult.rows[0] || roomResult.rows[0].status === 'closed') {
      return true;
    }
    const currentRoomRow = roomResult.rows[0];

    let remaining = await loadRoom(roomId);

    // Requirement: delete/close room if all players leave or only bots remain
    const hasHumanContenders = remaining && remaining.players.some((player) => !player.isBot);
    if (!hasHumanContenders) {
      await deleteOrCloseRoom(roomId);
      return true;
    }

    // If host leaves, migrate host to the next human contender (never a bot!)
    if (remaining.hostId === userId) {
      const nextHumanHost = remaining.players.find((player) => !player.isBot);
      if (nextHumanHost) {
        await pool.query('UPDATE rooms SET host_id = $1 WHERE id = $2', [nextHumanHost.id, roomId]);
        remaining = await loadRoom(roomId);
      }
    }

    if (currentRoomRow.status === 'in_progress') {
      const match = await getLiveMatch(roomId);
      if (match) {
        removePlayerFromMatch(match.state, userId);
        if (remaining.players.length < remaining.minPlayers) {
          const winner = remaining.players[0];
          if (winner && match.state.players.some((p) => p.id === winner.id)) {
            const engine = getGameEngine(match.state.gameId);
            if (engine?.onWalkover) {
              engine.onWalkover(match.state, winner.id);
            } else {
              match.state.phase = 'resolved';
            }
            match.state.winnerId = winner.id;
            match.state.winReason = 'Walkover victory: last player standing.';
            match.state.isWalkover = true;
            match.state.finishedAt = Date.now();
            await finishMatch(match);
          } else {
            await deleteOrCloseRoom(roomId);
            return true;
          }
        } else {
          const engine = getGameEngine(match.state.gameId);
          if (engine?.onPlayerLeaveReschedule) {
            engine.onPlayerLeaveReschedule(match.state);
          }
          await commitMatchAction(match, false);
          await broadcastRoom(roomId);
        }
      }
    } else {
      await broadcastRoom(roomId);
    }

    await broadcastPublicRooms();
    return true;
  };
  return { deleteOrCloseRoom, leavePlayerFromRoom };
};
