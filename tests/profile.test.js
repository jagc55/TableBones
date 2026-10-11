import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { once } from 'node:events';
import { createRequestHandler } from '../src/server/routes/index.js';
import { pool } from '../src/server/db/pool.js';

test('Username-based identity, password protection, login, rate limiting, and security', async () => {
  const usersById = new Map();
  const sessionsByHash = new Map();
  const achievementsByUser = new Map();

  const originalQuery = pool.query;
  pool.query = async (sql, values = []) => {
    // 1. Insert into users
    if (sql.includes('INSERT INTO users')) {
      const [id, alias, avatarId, statsJson] = values;
      const user = {
        id,
        alias,
        avatar_id: avatarId,
        stats: typeof statsJson === 'string' ? JSON.parse(statsJson) : (statsJson || {}),
        password_hash: null,
      };
      usersById.set(user.id, user);
      return { rows: [user] };
    }

    // 2. Insert into auth_sessions
    if (sql.includes('INSERT INTO auth_sessions')) {
      const [tokenHash, userId, expiresAt] = values;
      sessionsByHash.set(tokenHash, { userId, expiresAt });
      return { rowCount: 1 };
    }

    // 3. Select user by session token
    if (sql.includes('SELECT u.* FROM auth_sessions')) {
      const session = sessionsByHash.get(values[0]);
      if (session) {
        const user = usersById.get(session.userId);
        return { rows: user ? [user] : [] };
      }
      return { rows: [] };
    }

    // 4. Check for protected alias excluding user id
    if (sql.includes('SELECT id FROM users WHERE LOWER(alias) = LOWER($1) AND password_hash IS NOT NULL AND id != $2')) {
      const [targetAlias, excludeId] = values;
      const found = [...usersById.values()].filter(
        (u) => Boolean(u.password_hash) && u.alias.toLowerCase() === targetAlias.toLowerCase() && u.id !== excludeId
      );
      return { rows: found.map((u) => ({ id: u.id })) };
    }

    // 5. Check for protected alias
    if (sql.includes('SELECT id FROM users WHERE LOWER(alias) = LOWER($1) AND password_hash IS NOT NULL')) {
      const [targetAlias] = values;
      const found = [...usersById.values()].filter(
        (u) => Boolean(u.password_hash) && u.alias.toLowerCase() === targetAlias.toLowerCase()
      );
      return { rows: found.map((u) => ({ id: u.id })) };
    }

    // 6. Look up user by alias for login
    if (sql.includes('SELECT * FROM users WHERE LOWER(alias) = LOWER($1) AND password_hash IS NOT NULL')) {
      const [targetAlias] = values;
      const found = [...usersById.values()].find(
        (u) => Boolean(u.password_hash) && u.alias.toLowerCase() === targetAlias.toLowerCase()
      );
      return { rows: found ? [found] : [] };
    }

    // 7. Set password hash
    if (sql.includes('UPDATE users SET password_hash = $1')) {
      const [hash, userId] = values;
      const user = usersById.get(userId);
      if (user) {
        user.password_hash = hash;
        return { rows: [user] };
      }
      return { rows: [] };
    }

    // 8. Update alias & avatar
    if (sql.includes('UPDATE users SET alias = $1, avatar_id = $2')) {
      const [alias, avatarId, userId] = values;
      const user = usersById.get(userId);
      if (user) {
        user.alias = alias;
        user.avatar_id = avatarId;
        return { rows: [user] };
      }
      return { rows: [] };
    }

    // 9. Merge achievements
    if (sql.includes('INSERT INTO user_achievements (user_id, achievement_id)\n         SELECT $1, achievement_id FROM user_achievements WHERE user_id = $2')
        || sql.includes('INSERT INTO user_achievements (user_id, achievement_id)')) {
      if (sql.includes('SELECT $1, achievement_id')) {
        const [targetUserId, sourceUserId] = values;
        const sourceSet = achievementsByUser.get(sourceUserId) || new Set();
        if (!achievementsByUser.has(targetUserId)) achievementsByUser.set(targetUserId, new Set());
        const targetSet = achievementsByUser.get(targetUserId);
        for (const id of sourceSet) targetSet.add(id);
        return { rowCount: sourceSet.size };
      }
      const [userId, achId] = values;
      if (!achievementsByUser.has(userId)) achievementsByUser.set(userId, new Set());
      achievementsByUser.get(userId).add(achId);
      return { rowCount: 1 };
    }

    // 10. List user achievements
    if (sql.includes('SELECT achievement_id, unlocked_at FROM user_achievements')) {
      const set = achievementsByUser.get(values[0]) || new Set();
      return { rows: [...set].map((id) => ({ achievement_id: id, unlocked_at: new Date() })) };
    }

    // 11. Muted players
    if (sql.includes('SELECT muted_user_id FROM muted_players')) {
      return { rows: [] };
    }

    throw new Error(`Unexpected test query: ${sql}`);
  };

  const server = http.createServer(createRequestHandler(async () => {}));

  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}/tablebones/api`;

    // 1. Create anonymous guest session
    const guestRes = await fetch(`${base}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alias: 'Pikachu',
        avatarId: 'boxer',
        stats: { matchesPlayed: 3, matchesWon: 2, wordsFound: 10, walkoverWins: 0 },
        achievements: [{ id: 'first-win', unlockedAt: Date.now() }],
      }),
    });
    assert.equal(guestRes.status, 201);
    const guestData = await guestRes.json();
    assert.equal(guestData.user.name, 'Pikachu');
    assert.equal(guestData.user.isRegistered, false);
    assert.equal(guestData.user.password_hash, undefined);
    assert.ok(guestData.token);

    // 2. Change name as guest (allowed for free names)
    const renameRes = await fetch(`${base}/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestData.token}`,
      },
      body: JSON.stringify({ name: 'RedTrainer', avatarId: 'superman' }),
    });
    assert.equal(renameRes.status, 200);
    const renamedData = await renameRes.json();
    assert.equal(renamedData.user.name, 'RedTrainer');
    assert.equal(renamedData.user.avatarId, 'superman');
    assert.equal(renamedData.user.isRegistered, false);

    // 3. Set password on current name (protecting the identity)
    const setPassRes = await fetch(`${base}/me/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestData.token}`,
      },
      body: JSON.stringify({ password: 'SuperSecretPassword123!' }),
    });
    assert.equal(setPassRes.status, 200);
    const passData = await setPassRes.json();
    assert.equal(passData.user.isRegistered, true);
    assert.equal(passData.user.password_hash, undefined);

    // Verify stored password in DB is hashed with scrypt, NOT plaintext!
    const storedUser = usersById.get(guestData.user.id);
    assert.ok(storedUser.password_hash);
    assert.ok(storedUser.password_hash.startsWith('scrypt$16384$8$1$'));
    assert.equal(storedUser.password_hash.includes('SuperSecretPassword123!'), false);

    // 4. Try setting an invalid / short password (should be rejected)
    const shortPassRes = await fetch(`${base}/me/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestData.token}`,
      },
      body: JSON.stringify({ password: '123' }),
    });
    assert.equal(shortPassRes.status, 400);

    // 5. Another user tries to claim/rename to the protected name 'RedTrainer'
    // First, create second guest
    const guest2Res = await fetch(`${base}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias: 'BlueRival' }),
    });
    assert.equal(guest2Res.status, 201);
    const guest2Data = await guest2Res.json();

    // Guest 2 tries to rename to 'redtrainer' (case-insensitive check)
    const stealAttempt = await fetch(`${base}/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guest2Data.token}`,
      },
      body: JSON.stringify({ name: 'redtrainer' }),
    });
    assert.equal(stealAttempt.status, 409);
    const stealErr = await stealAttempt.json();
    assert.ok(stealErr.error.includes('protected by a password'));

    // 6. Guest session trying to start with an already protected alias gets assigned a guest fallback
    const protectedGuestInit = await fetch(`${base}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias: 'RedTrainer' }),
    });
    assert.equal(protectedGuestInit.status, 201);
    const protectedGuestData = await protectedGuestInit.json();
    assert.ok(protectedGuestData.user.name.startsWith('Guest '));
    assert.equal(protectedGuestData.user.name, protectedGuestData.user.name);

    // 7. Successful login with username and password from a new session
    const loginSuccessRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'redtrainer', // Test case-insensitivity
        password: 'SuperSecretPassword123!',
      }),
    });
    assert.equal(loginSuccessRes.status, 200);
    const loginSuccessData = await loginSuccessRes.json();
    assert.equal(loginSuccessData.user.id, guestData.user.id);
    assert.equal(loginSuccessData.user.name, 'RedTrainer');
    assert.equal(loginSuccessData.user.isRegistered, true);
    assert.equal(loginSuccessData.user.password_hash, undefined);
    assert.ok(loginSuccessData.token);

    // 8. Login with wrong password returns 401 with generic message
    const wrongPassRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'RedTrainer',
        password: 'WrongPassword!',
      }),
    });
    assert.equal(wrongPassRes.status, 401);
    const wrongPassData = await wrongPassRes.json();
    assert.equal(wrongPassData.error, 'Invalid username or password.');

    // 9. Login with unknown username returns same generic 401 message (no user enumeration)
    const unknownUserRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'NonExistentUser999',
        password: 'SomePassword!',
      }),
    });
    assert.equal(unknownUserRes.status, 401);
    const unknownUserData = await unknownUserRes.json();
    assert.equal(unknownUserData.error, 'Invalid username or password.');

    // 10. Rate limiting prevents brute force attacks (5 failed attempts max)
    const bruteForceTarget = 'VictimUser';
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.1',
        },
        body: JSON.stringify({ username: bruteForceTarget, password: `guess${i}` }),
      });
      assert.equal(res.status, 401);
    }
    // 5th failed attempt:
    const attempt5 = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.1',
      },
      body: JSON.stringify({ username: bruteForceTarget, password: 'guess4' }),
    });
    assert.equal(attempt5.status, 401);

    // 6th attempt: should be blocked by rate limiter with 429
    const attempt6 = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.1',
      },
      body: JSON.stringify({ username: bruteForceTarget, password: 'guess5' }),
    });
    assert.equal(attempt6.status, 429);
    const rateLimitData = await attempt6.json();
    assert.ok(rateLimitData.error.includes('Too many failed attempts'));

  } finally {
    pool.query = originalQuery;
    await new Promise((resolve) => server.close(resolve));
  }
});
