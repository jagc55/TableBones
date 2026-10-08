import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { pool } from '../db/pool.js';
import { PORT, GOOGLE_CLIENT_ID } from '../config.js';
import { googleClient, createSession, toProfile, requireUser } from '../services/auth.js';
import { getActiveRoomForUser, loadRoom } from '../services/rooms.js';
import { readJson, writeJson } from './http.js';
const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const ifaceList of Object.values(interfaces)) {
    for (const iface of ifaceList || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
};
export const handleProfileRoutes = async (req, res, apiPath) => {
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


};
