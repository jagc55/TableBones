import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { pool } from '../db/pool.js';
import { PORT } from '../config.js';
import {
  createSession,
  toProfile,
  requireUser,
  getUserByToken,
  awardAchievement,
  hashPassword,
  verifyPassword,
  dummyVerifyPassword,
} from '../services/auth.js';
import { getActiveRoomForUser, loadRoom } from '../services/rooms.js';
import { readJson, writeJson, getBearerToken } from './http.js';

// In-memory rate limiter for login attempts (15 min window, max 5 failed attempts)
const loginRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '127.0.0.1';
};

const checkLoginRateLimit = (key) => {
  const now = Date.now();
  const record = loginRateLimitMap.get(key);
  if (!record) return { allowed: true };
  if (now > record.resetAt) {
    loginRateLimitMap.delete(key);
    return { allowed: true };
  }
  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    const remainingSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remainingSeconds };
  }
  return { allowed: true };
};

const recordFailedLogin = (key) => {
  const now = Date.now();
  const record = loginRateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    loginRateLimitMap.set(key, { attempts: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    record.attempts += 1;
  }
};

const resetLoginRateLimit = (key) => {
  loginRateLimitMap.delete(key);
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

  // Anonymous guest session (with optional initial alias / stats / achievements)
  if (apiPath === '/api/auth/guest' && req.method === 'POST') {
    const body = await readJson(req);
    const requestedAlias = String(body.alias || '').trim().slice(0, 24);
    let alias = requestedAlias;

    // Check if the requested alias is already protected by a registered user
    if (alias) {
      const protectedUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(alias) = LOWER($1) AND password_hash IS NOT NULL',
        [alias]
      );
      if (protectedUser.rows.length > 0) {
        alias = `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }
    if (!alias) {
      alias = `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const avatarId = String(body.avatarId || 'boxer').trim().slice(0, 64) || 'boxer';
    const stats = (body.stats && typeof body.stats === 'object') ? body.stats : {};
    const userId = randomUUID();
    const result = await pool.query(
      'INSERT INTO users (id, alias, avatar_id, stats) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, alias, avatarId, JSON.stringify(stats)]
    );
    const token = await createSession(userId);
    if (Array.isArray(body.achievements)) {
      for (const ach of body.achievements) {
        if (ach && ach.id) await awardAchievement(userId, ach.id);
      }
    }
    writeJson(res, 201, { token, user: toProfile(result.rows[0]) });
    return;
  }

  // Login with registered username and password
  if (apiPath === '/api/auth/login' && req.method === 'POST') {
    const body = await readJson(req);
    const username = String(body.username || '').trim().slice(0, 24);
    const password = String(body.password || '');

    const ip = getClientIp(req);
    const rateLimitKey = `${ip}:${username.toLowerCase()}`;
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      writeJson(res, 429, { error: 'Too many failed attempts. Please try again later.' });
      return;
    }

    if (!username || !password) {
      recordFailedLogin(rateLimitKey);
      writeJson(res, 400, { error: 'Invalid username or password.' });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(alias) = LOWER($1) AND password_hash IS NOT NULL',
      [username]
    );

    if (result.rows.length === 0) {
      await dummyVerifyPassword(password);
      recordFailedLogin(rateLimitKey);
      writeJson(res, 401, { error: 'Invalid username or password.' });
      return;
    }

    const targetUser = result.rows[0];
    const passwordMatches = await verifyPassword(password, targetUser.password_hash);
    if (!passwordMatches) {
      recordFailedLogin(rateLimitKey);
      writeJson(res, 401, { error: 'Invalid username or password.' });
      return;
    }

    resetLoginRateLimit(rateLimitKey);

    // Merge any achievements unlocked in current anonymous session into the registered account
    const bearerToken = getBearerToken(req);
    const currentUser = bearerToken ? await getUserByToken(bearerToken) : null;
    if (currentUser && currentUser.id !== targetUser.id) {
      await pool.query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         SELECT $1, achievement_id FROM user_achievements WHERE user_id = $2
         ON CONFLICT (user_id, achievement_id) DO NOTHING`,
        [targetUser.id, currentUser.id]
      );
    }

    const token = await createSession(targetUser.id);
    writeJson(res, 200, { token, user: toProfile(targetUser) });
    return;
  }

  // Set password on the current user identity (claiming / protecting the username)
  if (apiPath === '/api/me/password' && req.method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = await readJson(req);
    const password = body.password;

    if (!password || typeof password !== 'string' || password.length < 6) {
      writeJson(res, 400, { error: 'Password must be at least 6 characters.' });
      return;
    }
    if (password.length > 128) {
      writeJson(res, 400, { error: 'Password cannot exceed 128 characters.' });
      return;
    }

    // Ensure no other registered user already claimed this alias
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(alias) = LOWER($1) AND password_hash IS NOT NULL AND id != $2',
      [user.alias, user.id]
    );
    if (existing.rows.length > 0) {
      writeJson(res, 409, { error: 'This username is already registered by someone else.' });
      return;
    }

    const hash = await hashPassword(password);
    const updated = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [hash, user.id]
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

  // Update profile alias and/or avatar
  if (apiPath === '/api/me' && req.method === 'PATCH') {
    const user = await requireUser(req, res);
    if (!user) return;
    const body = await readJson(req);
    const requestedAlias = body.name === undefined ? user.alias : String(body.name).trim().slice(0, 24);
    const avatarId = body.avatarId === undefined ? user.avatar_id : String(body.avatarId).trim().slice(0, 64);
    if (!requestedAlias || !avatarId) {
      writeJson(res, 400, { error: 'Alias and avatar are required.' });
      return;
    }

    // If changing name, verify target name is not protected by another registered user
    if (requestedAlias.toLowerCase() !== user.alias.toLowerCase()) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE LOWER(alias) = LOWER($1) AND password_hash IS NOT NULL AND id != $2',
        [requestedAlias, user.id]
      );
      if (existing.rows.length > 0) {
        writeJson(res, 409, {
          error: 'This username is protected by a password. Log in to use it.',
          isProtected: true,
        });
        return;
      }
    }

    const updated = await pool.query(
      'UPDATE users SET alias = $1, avatar_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [requestedAlias, avatarId, user.id]
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
