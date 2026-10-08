import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { loadRoom, isRoomMember } from '../services/rooms.js';
import { awardAchievement } from '../services/auth.js';
export const attachMessageHandlers = (ws, user, connection, connections, broadcast, matches, lifecycle) => {
  const { send, sendMatchState } = broadcast;
  const { getLiveMatch, applyMatchAction } = matches;
  const { leavePlayerFromRoom } = lifecycle;
  ws.on('message', async (messageRaw) => {
    try {
      const message = JSON.parse(messageRaw.toString());
      if (message.type === 'SUBSCRIBE_ROOM') {
        if (!(await isRoomMember(message.roomId, user.id))) throw new Error('Room membership required.');
        connection.roomIds.add(message.roomId);
        const room = await loadRoom(message.roomId);
        send(ws, { type: 'ROOM_UPDATED', room });
        const match = await getLiveMatch(message.roomId);
        if (match) sendMatchState(ws, match.state, user.id);
        return;
      }
      if (message.type === 'UNSUBSCRIBE_ROOM') {
        connection.roomIds.delete(message.roomId);
        return;
      }
      if (message.type === 'LEAVE_ROOM') {
        const roomId = String(message.roomId || '');
        if (roomId) await leavePlayerFromRoom(roomId, user.id);
        return;
      }
      if (message.type === 'GAME_ACTION') {
        const roomId = String(message.roomId || '');
        if (!roomId || !(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        if (!message.action || typeof message.action !== 'object' || Array.isArray(message.action)) {
          throw new Error('A game action is required.');
        }
        const result = await applyMatchAction(roomId, user.id, message.action);
        if (result) send(ws, result);
        return;
      }
      if (message.type === 'CHAT_SEND') {
        const roomId = String(message.roomId || '');
        const text = String(message.text || '').trim().slice(0, 140);
        if (!text || !(await isRoomMember(roomId, user.id))) throw new Error('Invalid chat message.');
        const saved = await pool.query(
          `INSERT INTO chat_messages (id, room_id, user_id, sender_name, sender_avatar_id, text)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [randomUUID(), roomId, user.id, user.alias, user.avatar_id, text]
        );
        const messageCount = await pool.query(
          'SELECT COUNT(*)::integer AS count FROM chat_messages WHERE room_id = $1 AND user_id = $2',
          [roomId, user.id]
        );
        if (messageCount.rows[0].count === 5) await awardAchievement(user.id, 'silver-tongue');
        const row = saved.rows[0];
        const event = {
          type: 'CHAT_MESSAGE',
          roomId,
          chatMessage: {
            id: row.id,
            senderId: user.id,
            senderName: row.sender_name,
            senderAvatarId: row.sender_avatar_id,
            text: row.text,
            timestamp: new Date(row.created_at).getTime(),
          },
        };
        for (const [client, peer] of connections) {
          if (peer.roomIds.has(roomId)) send(client, event);
        }
        return;
      }
      send(ws, { type: 'ERROR', message: 'Unsupported realtime action.' });
    } catch (error) {
      send(ws, { type: 'ERROR', message: error instanceof Error ? error.message : 'Realtime action failed.' });
    }
  });
};
