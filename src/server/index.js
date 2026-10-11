import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { PORT } from './config.js';
import { pool } from './db/pool.js';
import { initializeDatabase } from './db/schema.js';
import { createBroadcaster } from './websocket/broadcast.js';
import { attachWebSocketServer } from './websocket/server.js';
import { createMatchService } from './services/matches.js';
import { createRoomLifecycle } from './services/roomLifecycle.js';
import { createRoomRoutes } from './routes/rooms.js';
import { createRequestHandler } from './routes/index.js';

const ensureDatabaseBridge = () =>
  new Promise((resolve) => {
    const testSocket = net.connect(5432, '127.0.0.1', () => {
      testSocket.end();
      resolve(null);
    });
    testSocket.on('error', () => {
      const bridge = net.createServer((sock) => {
        sock.on('error', () => {});
        const child = spawn('wsl', ['nc', '127.0.0.1', '5432'], { stdio: ['pipe', 'pipe', 'ignore'] });
        child.on('error', () => sock.destroy());
        sock.pipe(child.stdin);
        child.stdout.pipe(sock);
        child.stdin.on('error', () => {});
        child.stdout.on('error', () => {});
        const cleanup = () => {
          try { child.kill(); } catch {}
          try { sock.destroy(); } catch {}
        };
        sock.on('close', cleanup);
        child.on('close', cleanup);
      });
      bridge.on('error', () => resolve(null));
      bridge.listen(5432, '127.0.0.1', () => {
        console.log('PostgreSQL bridge connected on 127.0.0.1:5432');
        resolve(bridge);
      });
    });
  });

const connections = new Map();
const broadcast = createBroadcaster(connections);
const matches = createMatchService(broadcast);
const lifecycle = createRoomLifecycle(connections, broadcast, matches);
const handleRoomRoutes = createRoomRoutes(connections, broadcast, matches, lifecycle);
const server = http.createServer(createRequestHandler(handleRoomRoutes));
attachWebSocketServer(server, connections, broadcast, matches, lifecycle);

ensureDatabaseBridge()
  .then(() => initializeDatabase())
  .then(async () => {
    try {
      await pool.query("UPDATE rooms SET status = 'closed', closed_at = NOW() WHERE status IN ('waiting', 'in_progress')");
    } catch {
      // Ignore if table not yet populated
    }
  })
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`TableSkull server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed', error);
    process.exit(1);
  });
