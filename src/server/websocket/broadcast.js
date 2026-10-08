import { WebSocket } from 'ws';
import { pool } from '../db/pool.js';
import { loadRoom } from '../services/rooms.js';
import { projectMatchState } from '../games/index.js';
export const createBroadcaster = (connections) => {
  const send = (ws, event) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
  };

  const broadcastRoom = async (roomId, type = 'ROOM_UPDATED') => {
    const room = await loadRoom(roomId);
    if (!room) return;
    for (const [ws, connection] of connections) {
      if (
        connection.roomIds.has(roomId) ||
        (!room.isPrivate && (room.status === 'waiting' || room.status === 'in_progress'))
      ) {
        send(ws, { type, room });
      }
    }
  };

  const broadcastPublicRooms = async () => {
    const result = await pool.query(
      "SELECT id FROM rooms WHERE is_private = FALSE AND status IN ('waiting', 'in_progress')"
    );
    for (const row of result.rows) {
      const room = await loadRoom(row.id);
      if (!room) continue;
      for (const [ws] of connections) {
        send(ws, { type: 'ROOM_UPDATED', room });
      }
    }
  };

  const sendMatchState = (ws, state, userId, type = 'MATCH_STATE') => {
    send(ws, { type, roomId: state.roomId, state: projectMatchState(state, userId) });
  };

  const broadcastMatchState = (roomId, state, type = 'MATCH_STATE') => {
    for (const [ws, connection] of connections) {
      if (connection.roomIds.has(roomId)) sendMatchState(ws, state, connection.userId, type);
    }
  };

  const broadcastMatchFinished = (roomId, state, room, meta = {}) => {
    for (const [ws, connection] of connections) {
      if (connection.roomIds.has(roomId)) {
        send(ws, {
          type: 'MATCH_FINISHED',
          roomId,
          room,
          state: projectMatchState(state, connection.userId),
          ...meta,
        });
      }
    }
  };
  return { send, broadcastRoom, broadcastPublicRooms, sendMatchState, broadcastMatchState, broadcastMatchFinished };
};
