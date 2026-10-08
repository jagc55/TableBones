import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import { Pool } from 'pg';
import { WebSocket } from 'ws';
import { ROOT_DIR } from '../src/server/config.js';
import { pool } from '../src/server/db/pool.js';
import { createBroadcaster } from '../src/server/websocket/broadcast.js';
import { attachWebSocketServer } from '../src/server/websocket/server.js';
import { createMatchState, submitBonegleWord } from '../src/server/games/index.js';
import { createRequestHandler } from '../src/server/routes/index.js';

const databaseUrl = process.env.TABLEBONES_TEST_DATABASE_URL;

const unusedPort = async () => {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
};

const waitForStartup = (child) => new Promise((resolve, reject) => {
  let output = '';
  const timer = setTimeout(() => reject(new Error(`Backend startup timed out: ${output}`)), 10000);
  const failed = (error) => {
    clearTimeout(timer);
    reject(error);
  };
  child.once('error', failed);
  child.once('exit', (code) => failed(new Error(`Backend exited (${code}): ${output}`)));
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.stdout.on('data', (chunk) => {
    output += chunk;
    if (output.includes('server running on port')) {
      clearTimeout(timer);
      resolve();
    }
  });
});

const connect = async (port, token) => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/tablebones/tablebones-ws?token=${encodeURIComponent(token)}`);
  const events = [];
  socket.on('message', (raw) => events.push(JSON.parse(raw.toString())));
  await once(socket, 'open');
  const next = async (type, predicate = () => true) => {
    const take = () => {
      const index = events.findIndex((event) => event.type === type && predicate(event));
      return index < 0 ? null : events.splice(index, 1)[0];
    };
    const buffered = take();
    if (buffered) return buffered;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.off('message', receive);
        reject(new Error(`Expected WebSocket event ${type}`));
      }, 10000);
      const receive = () => {
        const event = take();
        if (!event) return;
        clearTimeout(timeout);
        socket.off('message', receive);
        resolve(event);
      };
      socket.on('message', receive);
    });
  };
  await next('CONNECTED');
  return {
    socket,
    next,
    send: (message) => socket.send(JSON.stringify(message)),
  };
};

test('WebSocket authenticates, scopes subscriptions and routes actions to the game engine', async () => {
  const players = ['human', 'peer'].map((id) => ({ id, name: id, avatarId: 'boxer', isBot: false }));
  const state = createMatchState({
    id: 'room-wire', gameId: 'bonegle', players,
    settings: { dictionaryLang: 'en', bonegleGridSize: 4, roundDurationSec: 120 },
  }, 'wire-test');
  state.board = [['C', 'X', 'X'], ['X', 'A', 'T'], ['X', 'X', 'S']];
  const connections = new Map();
  const broadcast = createBroadcaster(connections);
  const matches = {
    getLiveMatch: async () => ({ state }),
    applyMatchAction: async (roomId, userId, action) => {
      submitBonegleWord(state, userId, action, ROOT_DIR);
      broadcast.broadcastMatchState(roomId, state);
      return { type: 'BONEGLE_WORD_RESULT', roomId, word: action.word, status: 'valid' };
    },
  };
  const originalQuery = pool.query;
  const usersByToken = new Map(['human', 'peer', 'outsider'].map((id) => [
    createHash('sha256').update(`${id}-token`).digest('hex'),
    { id, alias: id, avatar_id: 'boxer' },
  ]));
  pool.query = async (sql, values) => {
    if (sql.includes('SELECT u.* FROM auth_sessions')) {
      const user = usersByToken.get(values[0]);
      return { rows: user ? [user] : [] };
    }
    if (sql.includes('SELECT muted_user_id')) return { rows: [] };
    if (sql.includes('SELECT 1 FROM room_players')) return { rowCount: players.some((player) => player.id === values[1]) ? 1 : 0 };
    if (sql.includes('SELECT * FROM rooms')) return { rows: [{
      id: state.roomId, code: 'TB-TEST', title: 'Wire room', game_id: 'bonegle',
      is_private: false, min_players: 2, max_players: 6, status: 'in_progress',
      host_id: 'human', settings: {}, created_at: new Date(),
    }] };
    if (sql.includes('FROM room_players rp JOIN users')) return { rows: players.map((player) => ({
      user_id: player.id, alias: player.name, avatar_id: player.avatarId, is_ready: true, score: 0, is_bot: false,
    })) };
    throw new Error(`Unexpected test query: ${sql}`);
  };
  const server = http.createServer(createRequestHandler(async () => {}));
  const wss = attachWebSocketServer(server, connections, broadcast, matches, { leavePlayerFromRoom: async () => {} });
  const sockets = [];
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    const unauthorized = new WebSocket(`ws://127.0.0.1:${port}/tablebones-ws?token=invalid`);
    sockets.push(unauthorized);
    const [closeCode] = await once(unauthorized, 'close');
    assert.equal(closeCode, 4401);
    const human = await connect(port, 'human-token');
    sockets.push(human.socket);
    const peer = await connect(port, 'peer-token');
    sockets.push(peer.socket);
    const outsider = await connect(port, 'outsider-token');
    sockets.push(outsider.socket);
    const me = await fetch(`http://127.0.0.1:${port}/tablebones/api/me`, {
      headers: { Authorization: 'Bearer human-token' },
    });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.id, 'human');
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/me`)).status, 401);
    const networkInfo = await fetch(`http://127.0.0.1:${port}/tablebones/api/network-info`);
    assert.equal(networkInfo.status, 200);
    assert.ok((await networkInfo.json()).lanUrl.endsWith('/tablebones/'));
    const page = await fetch(`http://127.0.0.1:${port}/tablebones/`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /assets\/index-/);
    const asset = html.match(/src="([^"]+\.js)"/)[1];
    assert.equal((await fetch(`http://127.0.0.1:${port}${asset}`)).status, 200);
    outsider.send({ type: 'SUBSCRIBE_ROOM', roomId: state.roomId });
    assert.match((await outsider.next('ERROR')).message, /membership/);
    for (const client of [human, peer]) {
      client.send({ type: 'SUBSCRIBE_ROOM', roomId: state.roomId });
      assert.equal((await client.next('ROOM_UPDATED')).room.id, state.roomId);
      assert.deepEqual((await client.next('MATCH_STATE')).state.board, state.board);
    }
    outsider.send({ type: 'GAME_ACTION', roomId: state.roomId, action: { type: 'SUBMIT_WORD' } });
    assert.match((await outsider.next('ERROR')).message, /membership/);
    human.send({ type: 'GAME_ACTION', roomId: state.roomId, action: {
      type: 'SUBMIT_WORD', word: 'CAT', path: [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
    } });
    assert.equal((await human.next('BONEGLE_WORD_RESULT')).status, 'valid');
    assert.equal((await peer.next('MATCH_STATE')).state.submittedWords.human[0].word, 'CAT');
    peer.send({ type: 'UNSUBSCRIBE_ROOM', roomId: state.roomId });
    peer.send({ type: 'NOT_SUPPORTED' });
    await peer.next('ERROR');
    const peerConnection = [...connections.values()].find((connection) => connection.userId === 'peer');
    assert.equal(peerConnection.roomIds.size, 0);
  } finally {
    for (const userId of ['human', 'peer', 'outsider']) connections.set(Symbol(userId), { userId, roomIds: new Set() });
    const closed = new Promise((resolve) => wss.close(resolve));
    for (const client of wss.clients) client.terminate();
    for (const socket of sockets) socket.terminate();
    await closed;
    await new Promise((resolve) => server.close(resolve));
    pool.query = originalQuery;
  }
});

test('HTTP and WebSocket preserve the room and match lifecycle', {
  skip: !databaseUrl,
  timeout: 60000,
}, async () => {
  const admin = new Pool({ connectionString: databaseUrl });
  const schema = `tableskull_test_${randomBytes(8).toString('hex')}`;
  let child;
  let isolated;
  let schemaCreated = false;
  const sockets = [];
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    schemaCreated = true;
    const connectionUrl = new URL(databaseUrl);
    connectionUrl.searchParams.set('options', `-c search_path=${schema}`);
    isolated = new Pool({ connectionString: connectionUrl.href });
    const port = await unusedPort();
    child = spawn(process.execPath, ['src/server/index.js'], {
      cwd: ROOT_DIR,
      env: { ...process.env, PORT: String(port), DATABASE_URL: connectionUrl.href, GOOGLE_CLIENT_ID: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await waitForStartup(child);

    const request = async (route, { token, method = 'GET', body, status = 200 } = {}) => {
      const response = await fetch(`http://127.0.0.1:${port}/tablebones/api${route}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json();
      assert.equal(response.status, status, JSON.stringify(data));
      return data;
    };
    const guest = async (alias) => request('/auth/guest', {
      method: 'POST', status: 201, body: { alias, avatarId: 'boxer' },
    });
    const host = await guest('Test Host');
    const player = await guest('Test Player');
    const hostWire = await connect(port, host.token);
    const playerWire = await connect(port, player.token);
    sockets.push(hostWire.socket, playerWire.socket);
    assert.equal((await request('/me', { token: host.token })).user.id, host.user.id);
    await request('/me', { status: 401 });

    const created = await request('/rooms', {
      token: host.token, method: 'POST', status: 201,
      body: { title: 'Test Bonegle', gameId: 'bonegle', isPrivate: false, settings: { roundDurationSec: 60, dictionaryLang: 'en', bonegleGridSize: 4 } },
    });
    const roomId = created.room.id;
    assert.equal(created.room.status, 'waiting');
    assert.equal((await playerWire.next('ROOM_UPDATED', (event) => event.room.id === roomId)).room.status, 'waiting');
    await request(`/rooms/${roomId}/join`, { token: player.token, method: 'POST' });
    hostWire.send({ type: 'SUBSCRIBE_ROOM', roomId });
    playerWire.send({ type: 'SUBSCRIBE_ROOM', roomId });
    await hostWire.next('ROOM_UPDATED', (event) => event.room.players.length === 2);
    await playerWire.next('ROOM_UPDATED', (event) => event.room.players.length === 2);
    await request(`/rooms/${roomId}/ready`, { token: player.token, method: 'POST', body: { ready: true } });
    const started = await request(`/rooms/${roomId}/start`, { token: host.token, method: 'POST' });
    assert.equal(started.room.status, 'in_progress');
    assert.equal(started.match.board.length, 4);
    await playerWire.next('MATCH_STARTED', (event) => event.room.id === roomId);
    const initialState = await playerWire.next('MATCH_STATE', (event) => event.roomId === roomId);
    assert.deepEqual(initialState.state.board, started.match.board);
    await request(`/rooms/${roomId}/join`, { token: player.token, method: 'POST', status: 400 });
    playerWire.send({ type: 'GAME_ACTION', roomId, action: { type: 'SUBMIT_WORD', word: 'XX', path: [] } });
    assert.equal((await playerWire.next('BONEGLE_WORD_RESULT')).status, 'invalid');
    playerWire.send({ type: 'CHAT_SEND', roomId, text: 'Test message' });
    assert.equal((await hostWire.next('CHAT_MESSAGE')).chatMessage.text, 'Test message');
    assert.equal((await request(`/rooms/${roomId}/chat`, { token: host.token })).messages.at(-1).text, 'Test message');

    await request(`/rooms/${roomId}/leave`, { token: player.token, method: 'POST' });
    const finished = await hostWire.next('MATCH_FINISHED', (event) => event.roomId === roomId);
    assert.equal(finished.room.status, 'finished');
    assert.equal(finished.state.winnerId, host.user.id);
    const rematch = await request(`/rooms/${roomId}/rematch`, { token: host.token, method: 'POST' });
    assert.equal(rematch.room.status, 'waiting');
    await request(`/rooms/${roomId}/leave`, { token: host.token, method: 'POST' });
    await hostWire.next('ROOM_CLOSED', (event) => event.roomId === roomId);
    assert.equal((await request('/rooms')).rooms.length, 0);

    const midnight = await request('/rooms', {
      token: host.token, method: 'POST', status: 201,
      body: { title: 'Test Midnight', gameId: 'midnight-alley', isPrivate: true, settings: { turnTimeLimitSec: 45 } },
    });
    const midnightId = midnight.room.id;
    hostWire.send({ type: 'SUBSCRIBE_ROOM', roomId: midnightId });
    await hostWire.next('ROOM_UPDATED', (event) => event.room.id === midnightId);
    await request(`/rooms/${midnightId}/add-bot`, {
      token: host.token, method: 'POST', status: 201, body: { name: 'Test Bot', avatarId: 'boxer' },
    });
    const midnightStart = await request(`/rooms/${midnightId}/start`, { token: host.token, method: 'POST' });
    assert.deepEqual(Object.keys(midnightStart.match.hands), [host.user.id]);
    const midnightState = await hostWire.next('MATCH_STATE', (event) => event.roomId === midnightId);
    assert.deepEqual(Object.keys(midnightState.state.hands), [host.user.id]);
    hostWire.send({ type: 'GAME_ACTION', roomId: midnightId, action: { type: 'PLACE_BID', bid: 0 } });
    await hostWire.next('MATCH_STATE', (event) => event.roomId === midnightId && event.state.phase === 'playing');
    await request(`/rooms/${midnightId}/leave`, { token: host.token, method: 'POST' });
    await hostWire.next('ROOM_CLOSED', (event) => event.roomId === midnightId);
    assert.equal((await request('/me/active-room', { token: host.token })).room, null);

    const staticResponse = await fetch(`http://127.0.0.1:${port}/tablebones/`);
    assert.equal(staticResponse.status, 200);
    assert.match(await staticResponse.text(), /assets\/index-/);
    const stored = await isolated.query("SELECT status FROM matches WHERE status = 'finished'");
    assert.equal(stored.rowCount, 1);
  } finally {
    for (const socket of sockets) socket.terminate();
    if (child && child.exitCode === null) {
      const stopped = once(child, 'exit');
      child.kill();
      await stopped;
    }
    if (isolated) await isolated.end();
    try {
      if (schemaCreated) await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await admin.end();
    }
  }
});