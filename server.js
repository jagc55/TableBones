import { createHash, randomBytes, randomUUID } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { OAuth2Client } from 'google-auth-library';
import { WebSocketServer, WebSocket } from 'ws';
import {
  automaticMidnightAction,
  createMatchState,
  matchScores,
  projectMatchState,
  removePlayerFromMatch,
  resolveBonegle,
  setDeadline,
  submitBonegleWord,
  submitMidnightAction,
} from './server/matchEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.join(__dirname, 'dist');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://tableskull:tableskull@127.0.0.1:5432/tableskull';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const pool = new Pool({ connectionString: DATABASE_URL });
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);
const activeMatches = new Map();
const connections = new Map();
const disconnectTimers = new Map();
const DISCONNECT_GRACE_MS = 4000;

const DEFAULT_STATS = {
  matchesPlayed: 0,
  matchesWon: 0,
  wordsFound: 0,
  walkoverWins: 0,
};

const DEFAULT_SETTINGS = {
  roundDurationSec: 120,
  turnTimeLimitSec: 45,
  dictionaryLang: 'es',
  bonegleGridSize: 5,
};

const ACHIEVEMENT_IDS = new Set([
  'first-match',
  'ring-champion',
  'gracious-host',
  'secret-society',
  'peacekeeper',
  'silver-tongue',
  'last-man-standing',
  'high-roller',
]);

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const awardAchievement = async (userId, achievementId, client = pool) => {
  if (!ACHIEVEMENT_IDS.has(achievementId)) return false;
  const result = await client.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     VALUES ($1, $2) ON CONFLICT (user_id, achievement_id) DO NOTHING`,
    [userId, achievementId]
  );
  return result.rowCount > 0;
};

const writeJson = (res, statusCode, body) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

const readJson = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
};

const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const ifaceList of Object.values(interfaces)) {
    for (const iface of ifaceList || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
};

const toProfile = (row) => ({
  id: row.id,
  name: row.alias,
  avatarId: row.avatar_id,
  isGoogleAuth: Boolean(row.google_sub),
  googleEmail: row.google_email || undefined,
  stats: { ...DEFAULT_STATS, ...(row.stats || {}) },
  mutedPlayerIds: [],
});

const createSession = async (userId) => {
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, new Date(Date.now() + SESSION_TTL_MS)]
  );
  return token;
};

const getUserByToken = async (token) => {
  if (!token) return null;
  const result = await pool.query(
    `SELECT u.* FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)]
  );
  return result.rows[0] || null;
};

const requireUser = async (req, res) => {
  const user = await getUserByToken(getBearerToken(req));
  if (!user) {
    writeJson(res, 401, { error: 'Authentication required.' });
    return null;
  }
  return user;
};

const createRoomCode = () => `TB-${randomBytes(3).toString('hex').toUpperCase()}`;

const mapRoom = (roomRow, playerRows) => ({
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

const loadRoom = async (roomId) => {
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

const isRoomMember = async (roomId, userId) => {
  const result = await pool.query(
    'SELECT 1 FROM room_players WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  return result.rowCount > 0;
};

const getActiveRoomForUser = async (userId) => {
  const result = await pool.query(
    `SELECT r.id FROM rooms r JOIN room_players rp ON rp.room_id = r.id
     WHERE rp.user_id = $1 AND r.status IN ('waiting', 'in_progress') LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.id || null;
};

const withTransaction = async (work) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

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

const sendMatchState = (ws, state, userId, type = 'MATCH_STATE') => {
  send(ws, { type, roomId: state.roomId, state: projectMatchState(state, userId) });
};

const broadcastMatchState = (roomId, state, type = 'MATCH_STATE') => {
  for (const [ws, connection] of connections) {
    if (connection.roomIds.has(roomId)) sendMatchState(ws, state, connection.userId, type);
  }
};

const broadcastMatchFinished = (roomId, state, room) => {
  for (const [ws, connection] of connections) {
    if (connection.roomIds.has(roomId)) {
      send(ws, { type: 'MATCH_FINISHED', roomId, room, state: projectMatchState(state, connection.userId) });
    }
  }
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
      submitBonegleWord(match.state, userId, action, __dirname);
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
          if (match.state.gameId === 'bonegle') {
            resolveBonegle(match.state);
          } else {
            match.state.phase = 'game_over';
            match.state.currentTrick = [];
            match.state.turnPlayerId = null;
            match.state.leadPlayerId = null;
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
        if (match.state.gameId === 'midnight-alley') {
          setDeadline(match.state, match.state.turnTimeLimitSec || remaining.settings.turnTimeLimitSec);
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

const assertHost = async (roomId, userId) => {
  const result = await pool.query('SELECT host_id FROM rooms WHERE id = $1', [roomId]);
  if (!result.rows[0] || result.rows[0].host_id !== userId) throw new Error('Host permission required.');
};

const initializeDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      alias VARCHAR(24) NOT NULL,
      avatar_id VARCHAR(64) NOT NULL DEFAULT 'boxer',
      google_sub TEXT UNIQUE,
      google_email TEXT UNIQUE,
      stats JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash CHAR(64) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id UUID PRIMARY KEY,
      code VARCHAR(16) UNIQUE NOT NULL,
      title VARCHAR(36) NOT NULL,
      game_id VARCHAR(32) NOT NULL CHECK (game_id IN ('bonegle', 'midnight-alley')),
      is_private BOOLEAN NOT NULL DEFAULT FALSE,
      min_players SMALLINT NOT NULL,
      max_players SMALLINT NOT NULL,
      status VARCHAR(16) NOT NULL CHECK (status IN ('waiting', 'in_progress', 'finished', 'closed')),
      host_id UUID NOT NULL REFERENCES users(id),
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      winner_id UUID REFERENCES users(id),
      win_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS room_players (
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_ready BOOLEAN NOT NULL DEFAULT FALSE,
      score INTEGER NOT NULL DEFAULT 0,
      is_bot BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS matches (
      id UUID PRIMARY KEY,
      room_id UUID NOT NULL REFERENCES rooms(id),
      game_id VARCHAR(32) NOT NULL CHECK (game_id IN ('bonegle', 'midnight-alley')),
      status VARCHAR(16) NOT NULL CHECK (status IN ('active', 'finished', 'abandoned')),
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      winner_id UUID REFERENCES users(id),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY,
      room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      sender_name VARCHAR(24) NOT NULL,
      sender_avatar_id VARCHAR(64) NOT NULL,
      text VARCHAR(140) NOT NULL,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS muted_players (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      muted_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, muted_user_id)
    );
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, achievement_id)
    );
  `);
  await pool.query(`
    UPDATE rooms SET status = 'closed', closed_at = NOW()
    WHERE status IN ('waiting', 'in_progress')
    AND id NOT IN (
      SELECT DISTINCT room_id FROM room_players WHERE is_bot = FALSE
    )
  `);
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const server = http.createServer(async (req, res) => {
  // CORS & Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;
  const apiPath = pathname.replace(/^\/tablebones(?=\/api)/, '');

  try {
    if (apiPath === '/api/network-info' && req.method === 'GET') {
      const ip = getLocalIp();
      writeJson(res, 200, {
        localIp: ip,
        port: PORT,
        lanUrl: `http://${ip}:${PORT}/tablebones/`,
      });
      return;
    }

    if (apiPath === '/api/auth/guest' && req.method === 'POST') {
      const body = await readJson(req);
      const alias = String(body.alias || 'Lucky Pugilist').trim().slice(0, 24) || 'Lucky Pugilist';
      const avatarId = String(body.avatarId || 'boxer').trim().slice(0, 64) || 'boxer';
      const userId = randomUUID();
      const result = await pool.query(
        'INSERT INTO users (id, alias, avatar_id) VALUES ($1, $2, $3) RETURNING *',
        [userId, alias, avatarId]
      );
      const token = await createSession(userId);
      writeJson(res, 201, { token, user: toProfile(result.rows[0]) });
      return;
    }

    if (apiPath === '/api/auth/google' && req.method === 'POST') {
      if (!GOOGLE_CLIENT_ID) {
        writeJson(res, 503, { error: 'Google account linking is not configured.' });
        return;
      }
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readJson(req);
      const ticket = await googleClient.verifyIdToken({ idToken: body.credential, audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) throw new Error('Invalid Google identity token.');
      const updated = await pool.query(
        `UPDATE users SET google_sub = $1, google_email = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [payload.sub, payload.email, user.id]
      );
      writeJson(res, 200, { user: toProfile(updated.rows[0]) });
      return;
    }

    if (apiPath === '/api/me' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const muted = await pool.query('SELECT muted_user_id FROM muted_players WHERE user_id = $1', [user.id]);
      writeJson(res, 200, {
        user: { ...toProfile(user), mutedPlayerIds: muted.rows.map((row) => row.muted_user_id) },
      });
      return;
    }

    if (apiPath === '/api/me' && req.method === 'PATCH') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readJson(req);
      const alias = body.name === undefined ? user.alias : String(body.name).trim().slice(0, 24);
      const avatarId = body.avatarId === undefined ? user.avatar_id : String(body.avatarId).trim().slice(0, 64);
      if (!alias || !avatarId) throw new Error('Alias and avatar are required.');
      const updated = await pool.query(
        'UPDATE users SET alias = $1, avatar_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [alias, avatarId, user.id]
      );
      writeJson(res, 200, { user: toProfile(updated.rows[0]) });
      return;
    }

    if (apiPath === '/api/me/achievements' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await pool.query(
        `SELECT achievement_id, unlocked_at FROM user_achievements
         WHERE user_id = $1 ORDER BY unlocked_at ASC`,
        [user.id]
      );
      writeJson(res, 200, {
        achievements: result.rows.map((achievement) => ({
          id: achievement.achievement_id,
          unlockedAt: new Date(achievement.unlocked_at).getTime(),
        })),
      });
      return;
    }

    if (apiPath === '/api/me/active-room' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const roomId = await getActiveRoomForUser(user.id);
      writeJson(res, 200, { room: roomId ? await loadRoom(roomId) : null });
      return;
    }

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

    const roomMatch = apiPath.match(/^\/api\/rooms\/([\w-]+)(?:\/(join|leave|ready|start|rematch|chat|mute|kick|transfer|transfer-host|bot|add-bot|settings))?$/);
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

      if (action === 'rematch' && req.method === 'POST') {
        await assertHost(roomId, user.id);
        if (!(await isRoomMember(roomId, user.id))) throw new Error('Room membership required.');
        if (room.status !== 'finished') throw new Error('Rematches are only available after a finished match.');
        if (room.players.length < room.minPlayers) throw new Error('Not enough remaining players for a rematch.');
        const match = await createActiveMatch(room, true);
        const updatedRoom = await loadRoom(roomId);
        await broadcastRoom(roomId, 'MATCH_STARTED');
        broadcastMatchState(roomId, match.state);
        scheduleMatch(match);
        await broadcastPublicRooms();
        writeJson(res, 200, { room: updatedRoom, match: projectMatchState(match.state, user.id) });
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
  } catch (error) {
    console.error('API request failed', error);
    writeJson(res, 400, { error: error instanceof Error ? error.message : 'Request failed.' });
    return;
  }

  // Strip subpath /tablebones if present
  if (pathname.startsWith('/tablebones/')) {
    pathname = pathname.slice('/tablebones'.length);
  } else if (pathname === '/tablebones') {
    res.writeHead(301, { Location: '/tablebones/' });
    res.end();
    return;
  }

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  let filePath = path.join(DIST_DIR, pathname);

  // Security check against directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || stats.isDirectory()) {
      // SPA Fallback to index.html
      const fallbackPath = path.join(DIST_DIR, 'index.html');
      fs.readFile(fallbackPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found. Make sure to build the project first (npm run build).');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Static assets can be cached
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

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
          if (result?.type === 'BONEGLE_WORD_RESULT') send(ws, result);
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

initializeDatabase()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`TableSkull server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed', error);
    process.exit(1);
  });
