import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from '../db/pool.js';
import { DEFAULT_SETTINGS } from '../config.js';
import { requireUser, awardAchievement } from '../services/auth.js';
import { getActiveRoomForUser, createRoomCode, loadRoom, isRoomMember, assertHost } from '../services/rooms.js';
import { projectMatchState } from '../games/index.js';
import { readJson, writeJson } from './http.js';
export const createRoomRoutes = (connections, broadcast, matches, lifecycle) => {
  const { send, broadcastRoom, broadcastPublicRooms } = broadcast;
  const { createActiveMatch, broadcastMatchState, scheduleMatch } = { ...matches, ...broadcast };
  const { leavePlayerFromRoom } = lifecycle;
  return async (req, res, apiPath) => {
    if (apiPath === '/api/rooms' && req.method === 'GET') {
      const roomRows = await pool.query(
        "SELECT id FROM rooms WHERE is_private = FALSE AND status IN ('waiting', 'in_progress') ORDER BY created_at DESC"
      );
      const rooms = await Promise.all(roomRows.rows.map((row) => loadRoom(row.id)));
      writeJson(res, 200, { rooms: rooms.filter(Boolean) });
      return;
    }

    if (apiPath === '/api/rooms' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      if (await getActiveRoomForUser(user.id)) throw new Error('Leave your active room before creating another one.');
      const body = await readJson(req);
      const gameId = body.gameId;
      if (gameId !== 'bonegle' && gameId !== 'midnight-alley') throw new Error('Unsupported game.');
      const minPlayers = gameId === 'bonegle' ? 2 : 2;
      const maxPlayers = gameId === 'bonegle' ? 6 : 8;
      const roomId = randomUUID();
      const settings = { ...DEFAULT_SETTINGS, ...(body.settings || {}) };
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO rooms (id, code, title, game_id, is_private, min_players, max_players, status, host_id, settings)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'waiting', $8, $9)`,
          [roomId, createRoomCode(), String(body.title || `${user.alias}'s Room`).trim().slice(0, 36), gameId, Boolean(body.isPrivate), minPlayers, maxPlayers, user.id, settings]
        );
        await client.query(
          'INSERT INTO room_players (room_id, user_id, is_ready) VALUES ($1, $2, TRUE)',
          [roomId, user.id]
        );
        await awardAchievement(user.id, body.isPrivate ? 'secret-society' : 'gracious-host', client);
      });
      const room = await loadRoom(roomId);
      await broadcastPublicRooms();
      writeJson(res, 201, { room });
      return;
    }

    const roomByCodeMatch = apiPath.match(/^\/api\/rooms\/by-code\/([^/]+)$/);
    if (roomByCodeMatch && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await pool.query('SELECT id FROM rooms WHERE code = $1', [decodeURIComponent(roomByCodeMatch[1]).trim().toUpperCase()]);
      const room = result.rows[0] ? await loadRoom(result.rows[0].id) : null;
      if (!room) {
        writeJson(res, 404, { error: 'Room not found.' });
        return;
      }
      writeJson(res, 200, { room });
      return;
    }

    const roomMatch = apiPath.match(/^\/api\/rooms\/([\w-]+)(?:\/(join|leave|ready|start|rematch|play-again|chat|mute|kick|transfer|transfer-host|bot|add-bot|settings))?$/);
    if (roomMatch) {
      const [, roomId, action] = roomMatch;
      const user = await requireUser(req, res);
      if (!user) return;
      const room = await loadRoom(roomId);
      if (!room) {
        writeJson(res, 404, { error: 'Room not found.' });
        return;
      }

      if (!action && req.method === 'GET') {
        if (room.isPrivate && !(await isRoomMember(roomId, user.id))) {
          writeJson(res, 403, { error: 'Room membership required.' });
          return;
        }
        writeJson(res, 200, { room });
        return;
      }

      if (action === 'join' && req.method === 'POST') {
        const activeRoomId = await getActiveRoomForUser(user.id);
        if (activeRoomId && activeRoomId !== roomId) throw new Error('Leave your active room before joining another one.');
        if (room.status !== 'waiting') throw new Error('This room is no longer accepting players.');
        if (room.players.length >= room.maxPlayers) throw new Error('This room is full.');
        await pool.query(
          'INSERT INTO room_players (room_id, user_id) VALUES ($1, $2) ON CONFLICT (room_id, user_id) DO NOTHING',
          [roomId, user.id]
        );
        if (room.isPrivate) await awardAchievement(user.id, 'secret-society');
        const updatedRoom = await loadRoom(roomId);
        await broadcastRoom(roomId);
        await broadcastPublicRooms();
        writeJson(res, 200, { room: updatedRoom });
        return;
      }

      if (action === 'ready' && req.method === 'POST') {
        if (!(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        const body = await readJson(req);
        await pool.query('UPDATE room_players SET is_ready = $1 WHERE room_id = $2 AND user_id = $3', [Boolean(body.ready), roomId, user.id]);
        const updatedRoom = await loadRoom(roomId);
        await broadcastRoom(roomId);
        writeJson(res, 200, { room: updatedRoom });
        return;
      }

      if (action === 'kick' && req.method === 'POST') {
        await assertHost(roomId, user.id);
        if (!(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        if (room.status !== 'waiting') throw new Error('Players cannot be kicked after a match has started.');
        const body = await readJson(req);
        const playerId = String(body.playerId || '');
        if (!playerId || playerId === user.id || !room.players.some((player) => player.id === playerId)) throw new Error('A different room player is required.');
        await pool.query('DELETE FROM room_players WHERE room_id = $1 AND user_id = $2', [roomId, playerId]);
        const updatedRoom = await loadRoom(roomId);
        for (const [client, peer] of connections) {
          if (peer.userId === playerId) {
            peer.roomIds.delete(roomId);
            send(client, { type: 'ROOM_KICKED', roomId });
          }
        }
        await broadcastRoom(roomId);
        await broadcastPublicRooms();
        writeJson(res, 200, { room: updatedRoom });
        return;
      }

      if ((action === 'transfer' || action === 'transfer-host') && req.method === 'POST') {
        await assertHost(roomId, user.id);
        if (!(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        const body = await readJson(req);
        const playerId = String(body.playerId || body.newHostId || '');
        const targetPlayer = room.players.find((player) => player.id === playerId);
        if (!targetPlayer) throw new Error('The new host must be in this room.');
        if (targetPlayer.isBot) throw new Error('A bot cannot be assigned as host.');
        await pool.query('UPDATE rooms SET host_id = $1 WHERE id = $2', [playerId, roomId]);
        const updatedRoom = await loadRoom(roomId);
        await broadcastRoom(roomId);
        await broadcastPublicRooms();
        writeJson(res, 200, { room: updatedRoom });
        return;
      }

      if ((action === 'bot' || action === 'add-bot') && req.method === 'POST') {
        await assertHost(roomId, user.id);
        if (!(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        if (room.status !== 'waiting') throw new Error('Bots can only be added before the match starts.');
        if (room.players.length >= room.maxPlayers) throw new Error('This room is full.');
        const body = await readJson(req);
        const botId = randomUUID();
        const botName = String(body.name || body.botName || `Table Bot ${room.players.length + 1}`).trim().slice(0, 24) || 'Table Bot';
        const avatarId = String(body.avatarId || 'boxer').trim().slice(0, 64) || 'boxer';
        await withTransaction(async (client) => {
          await client.query('INSERT INTO users (id, alias, avatar_id) VALUES ($1, $2, $3)', [botId, botName, avatarId]);
          await client.query('INSERT INTO room_players (room_id, user_id, is_ready, is_bot) VALUES ($1, $2, TRUE, TRUE)', [roomId, botId]);
        });
        const updatedRoom = await loadRoom(roomId);
        await broadcastRoom(roomId);
        await broadcastPublicRooms();
        writeJson(res, 201, { room: updatedRoom });
        return;
      }

      if (action === 'settings' && req.method === 'PATCH') {
        await assertHost(roomId, user.id);
        if (!(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        const body = await readJson(req);
        const incomingSettings = body.settings && typeof body.settings === 'object' ? body.settings : {};
        const settings = { ...room.settings, ...incomingSettings };
        if (![4, 5, 6].includes(Number(settings.bonegleGridSize))) settings.bonegleGridSize = room.settings.bonegleGridSize || DEFAULT_SETTINGS.bonegleGridSize;
        if (settings.dictionaryLang !== 'en' && settings.dictionaryLang !== 'es') settings.dictionaryLang = room.settings.dictionaryLang || DEFAULT_SETTINGS.dictionaryLang;
        if (!Number.isFinite(Number(settings.roundDurationSec)) || Number(settings.roundDurationSec) < 1) settings.roundDurationSec = room.settings.roundDurationSec || DEFAULT_SETTINGS.roundDurationSec;
        if (!Number.isFinite(Number(settings.turnTimeLimitSec)) || Number(settings.turnTimeLimitSec) < 1) settings.turnTimeLimitSec = room.settings.turnTimeLimitSec || DEFAULT_SETTINGS.turnTimeLimitSec;
        const title = body.title === undefined ? room.title : String(body.title).trim().slice(0, 36);
        if (!title) throw new Error('Room title is required.');
        await pool.query(
          'UPDATE rooms SET title = $1, is_private = $2, settings = $3 WHERE id = $4',
          [title, body.isPrivate === undefined ? room.isPrivate : Boolean(body.isPrivate), settings, roomId]
        );
        const updatedRoom = await loadRoom(roomId);
        if (updatedRoom.isPrivate && !room.isPrivate) {
          for (const [client, peer] of connections) {
            if (!peer.roomIds.has(roomId)) {
              send(client, { type: 'ROOM_CLOSED', roomId });
            }
          }
        }
        await broadcastRoom(roomId);
        await broadcastPublicRooms();
        writeJson(res, 200, { room: updatedRoom });
        return;
      }

      if (action === 'start' && req.method === 'POST') {
        await assertHost(roomId, user.id);
        if (room.status !== 'waiting') throw new Error('Match has already started.');
        if (room.players.length < room.minPlayers) throw new Error('Not enough players to start.');
        if (room.players.some((player) => !player.isReady && !player.isHost && !player.isBot)) {
          throw new Error('Every player must be ready.');
        }
        const match = await createActiveMatch(room);
        await broadcastRoom(roomId, 'MATCH_STARTED');
        broadcastMatchState(roomId, match.state);
        scheduleMatch(match);
        await broadcastPublicRooms();
        writeJson(res, 200, { room: await loadRoom(roomId), match: projectMatchState(match.state, user.id) });
        return;
      }

      if ((action === 'rematch' || action === 'play-again') && req.method === 'POST') {
        if (!(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        if (room.status !== 'finished' && room.status !== 'waiting') {
          throw new Error('Play again is only available after a finished match.');
        }

        // Reset room back to waiting (lobby) for the players returning
        if (room.status === 'finished') {
          await pool.query(
            "UPDATE rooms SET status = 'waiting', winner_id = NULL, win_reason = NULL WHERE id = $1",
            [roomId]
          );
          // Reset score and ready state for human players
          await pool.query(
            "UPDATE room_players SET is_ready = FALSE, score = 0 WHERE room_id = $1 AND is_bot = FALSE",
            [roomId]
          );
          // Reset score for bots, and set them to ready after a short delay
          await pool.query(
            "UPDATE room_players SET is_ready = FALSE, score = 0 WHERE room_id = $1 AND is_bot = TRUE",
            [roomId]
          );

          // "En el caso de que haya bots para debuggear, estos deben pulsar automaticamente jugar de nuevo y listo en su debido momento."
          setTimeout(async () => {
            try {
              const currentRoom = await loadRoom(roomId);
              if (currentRoom && currentRoom.status === 'waiting') {
                await pool.query(
                  "UPDATE room_players SET is_ready = TRUE WHERE room_id = $1 AND is_bot = TRUE",
                  [roomId]
                );
                await broadcastRoom(roomId);
              }
            } catch (err) {
              console.error('Error auto-readying bots:', err);
            }
          }, 1200);
        }

        const updatedRoom = await loadRoom(roomId);
        await broadcastRoom(roomId, 'ROOM_UPDATED');
        await broadcastPublicRooms();
        writeJson(res, 200, { room: updatedRoom });
        return;
      }

      if (action === 'leave' && req.method === 'POST') {
        if (!(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        await leavePlayerFromRoom(roomId, user.id);
        writeJson(res, 200, { ok: true });
        return;
      }

      if (action === 'chat' && req.method === 'GET') {
        if (!(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        const result = await pool.query(
          `SELECT id, user_id, sender_name, sender_avatar_id, text, is_system, created_at
           FROM chat_messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT 200`,
          [roomId]
        );
        writeJson(res, 200, {
          messages: result.rows.map((message) => ({
            id: message.id,
            senderId: message.user_id || 'system',
            senderName: message.sender_name,
            senderAvatarId: message.sender_avatar_id,
            text: message.text,
            timestamp: new Date(message.created_at).getTime(),
            isSystem: message.is_system,
          })),
        });
        return;
      }

      if (action === 'mute' && req.method === 'POST') {
        const body = await readJson(req);
        const mutedUserId = String(body.playerId || '');
        if (!mutedUserId || mutedUserId === user.id) throw new Error('A different player is required.');
        if (body.muted) {
          await pool.query('INSERT INTO muted_players (user_id, muted_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, mutedUserId]);
          await awardAchievement(user.id, 'peacekeeper');
        } else {
          await pool.query('DELETE FROM muted_players WHERE user_id = $1 AND muted_user_id = $2', [user.id, mutedUserId]);
        }
        writeJson(res, 200, { ok: true });
        return;
      }
    }
  };
};
