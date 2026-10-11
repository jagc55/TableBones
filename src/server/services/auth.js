import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { pool } from '../db/pool.js';
import { SESSION_TTL_MS, DEFAULT_STATS, ACHIEVEMENT_IDS } from '../config.js';
import { getBearerToken, writeJson } from '../routes/http.js';

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export const hashPassword = async (password) => {
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }
  if (password.length > 128) {
    throw new Error('La contraseña no puede exceder 128 caracteres.');
  }
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err, key) => {
      if (err) reject(err);
      else resolve(key.toString('hex'));
    });
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derivedKey}`;
};

export const verifyPassword = async (password, storedHash) => {
  if (!storedHash || typeof storedHash !== 'string' || typeof password !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, salt, keyHex] = parts;
  const N = parseInt(nStr, 10);
  const r = parseInt(rStr, 10);
  const p = parseInt(pStr, 10);
  const originalKey = Buffer.from(keyHex, 'hex');

  const derivedKey = await new Promise((resolve, reject) => {
    scrypt(password, salt, originalKey.length, { N, r, p }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  return timingSafeEqual(originalKey, derivedKey);
};

export const dummyVerifyPassword = async (password) => {
  const dummySalt = '0123456789abcdef0123456789abcdef';
  await new Promise((resolve) => {
    scrypt(password || 'dummy', dummySalt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, () => resolve(false));
  });
  return false;
};

export const awardAchievement = async (userId, achievementId, client = pool) => {
  if (!ACHIEVEMENT_IDS.has(achievementId)) return false;
  const result = await client.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     VALUES ($1, $2) ON CONFLICT (user_id, achievement_id) DO NOTHING`,
    [userId, achievementId]
  );
  return result.rowCount > 0;
};

export const toProfile = (row) => ({
  id: row.id,
  name: row.alias,
  avatarId: row.avatar_id,
  isRegistered: Boolean(row.password_hash),
  isProtected: Boolean(row.password_hash),
  stats: { ...DEFAULT_STATS, ...(row.stats || {}) },
  mutedPlayerIds: [],
});

export const createSession = async (userId) => {
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, new Date(Date.now() + SESSION_TTL_MS)]
  );
  return token;
};

export const getUserByToken = async (token) => {
  if (!token) return null;
  const result = await pool.query(
    `SELECT u.* FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)]
  );
  return result.rows[0] || null;
};

export const requireUser = async (req, res) => {
  const user = await getUserByToken(getBearerToken(req));
  if (!user) {
    writeJson(res, 401, { error: 'Authentication required.' });
    return null;
  }
  return user;
};
