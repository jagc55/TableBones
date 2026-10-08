import { WebSocketServer } from 'ws';
import { pool } from '../db/pool.js';
import { getUserByToken } from '../services/auth.js';
import { DISCONNECT_GRACE_MS } from '../config.js';
import { attachMessageHandlers } from './handlers.js';
export const attachWebSocketServer = (server, connections, broadcast, matches, lifecycle) => {
  const wss = new WebSocketServer({ noServer: true });
  const disconnectTimers = new Map();
  const { send } = broadcast;
  const { leavePlayerFromRoom } = lifecycle;
  server.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    if (url.startsWith('/tablebones-ws') || url.startsWith('/tablebones/tablebones-ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws, request) => {
    try {
      const requestUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const user = await getUserByToken(requestUrl.searchParams.get('token') || '');
      if (!user) {
        ws.close(4401, 'Authentication required');
        return;
      }
      const connection = { userId: user.id, roomIds: new Set() };
      connections.set(ws, connection);

      if (disconnectTimers.has(user.id)) {
        clearTimeout(disconnectTimers.get(user.id));
        disconnectTimers.delete(user.id);
      }

      attachMessageHandlers(ws, user, connection, connections, broadcast, matches, lifecycle);

      ws.on('close', () => {
        connections.delete(ws);
        let hasOtherSockets = false;
        for (const [, conn] of connections) {
          if (conn.userId === user.id) {
            hasOtherSockets = true;
            break;
          }
        }
        if (!hasOtherSockets) {
          const timer = setTimeout(async () => {
            disconnectTimers.delete(user.id);
            try {
              const result = await pool.query(
                `SELECT rp.room_id FROM room_players rp
               JOIN rooms r ON r.id = rp.room_id
               WHERE rp.user_id = $1 AND r.status IN ('waiting', 'in_progress')`,
                [user.id]
              );
              for (const row of result.rows) {
                await leavePlayerFromRoom(row.room_id, user.id);
              }
            } catch (err) {
              console.error('Failed to cleanup disconnected user rooms', err);
            }
          }, DISCONNECT_GRACE_MS);
          disconnectTimers.set(user.id, timer);
        }
      });
      send(ws, { type: 'CONNECTED', userId: user.id });
    } catch {
      ws.close(1011, 'Connection failed');
    }
  });
  return wss;
};
