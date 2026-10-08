import { randomBytes } from 'node:crypto';
import { pool } from '../db/pool.js';
import { DEFAULT_SETTINGS } from '../config.js';
export const createRoomCode = () => `TB-${randomBytes(3).toString('hex').toUpperCase()}`;

export const mapRoom = (roomRow, playerRows) => ({
  id: roomRow.id,
  code: roomRow.code,
  title: roomRow.title,
  gameId: roomRow.game_id,
  isPrivate: roomRow.is_private,
  minPlayers: roomRow.min_players,
  maxPlayers: roomRow.max_players,
  status: roomRow.status,
  hostId: roomRow.host_id,
  settings: { ...DEFAULT_SETTINGS, ...(roomRow.settings || {}) },
  createdAt: new Date(roomRow.created_at).getTime(),
  winnerId: roomRow.winner_id,
  winReason: roomRow.win_reason,
  players: playerRows.map((player) => ({
    id: player.user_id,
    name: player.alias,
    avatarId: player.avatar_id,
    isHost: player.user_id === roomRow.host_id,
    isReady: player.is_ready,
    score: player.score,
    isBot: player.is_bot,
  })),
});

export const loadRoom = async (roomId) => {
  const roomResult = await pool.query("SELECT * FROM rooms WHERE id = $1 AND status != 'closed'", [roomId]);
  const room = roomResult.rows[0];
  if (!room) return null;
  const playersResult = await pool.query(
    `SELECT rp.*, u.alias, u.avatar_id
     FROM room_players rp JOIN users u ON u.id = rp.user_id
     WHERE rp.room_id = $1 ORDER BY rp.joined_at`,
    [roomId]
  );
  return mapRoom(room, playersResult.rows);
};

export const isRoomMember = async (roomId, userId) => {
  const result = await pool.query(
    'SELECT 1 FROM room_players WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  return result.rowCount > 0;
};

export const getActiveRoomForUser = async (userId) => {
  const result = await pool.query(
    `SELECT r.id FROM rooms r JOIN room_players rp ON rp.room_id = r.id
     WHERE rp.user_id = $1 AND r.status IN ('waiting', 'in_progress') LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.id || null;
};

export const assertHost = async (roomId, userId) => {
  const result = await pool.query('SELECT host_id FROM rooms WHERE id = $1', [roomId]);
  if (!result.rows[0] || result.rows[0].host_id !== userId) throw new Error('Host permission required.');
};
