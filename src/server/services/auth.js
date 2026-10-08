import { createHash, randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { pool } from '../db/pool.js';
import { GOOGLE_CLIENT_ID, SESSION_TTL_MS, DEFAULT_STATS, ACHIEVEMENT_IDS } from '../config.js';
import { getBearerToken, writeJson } from '../routes/http.js';
export const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

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
  isGoogleAuth: Boolean(row.google_sub),
  googleEmail: row.google_email || undefined,
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
