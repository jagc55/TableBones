import http from 'node:http';
import { PORT } from './config.js';
import { initializeDatabase } from './db/schema.js';
import { createBroadcaster } from './websocket/broadcast.js';
import { attachWebSocketServer } from './websocket/server.js';
import { createMatchService } from './services/matches.js';
import { createRoomLifecycle } from './services/roomLifecycle.js';
import { createRoomRoutes } from './routes/rooms.js';
import { createRequestHandler } from './routes/index.js';

const connections = new Map();
const broadcast = createBroadcaster(connections);
const matches = createMatchService(broadcast);
const lifecycle = createRoomLifecycle(connections, broadcast, matches);
const handleRoomRoutes = createRoomRoutes(connections, broadcast, matches, lifecycle);
const server = http.createServer(createRequestHandler(handleRoomRoutes));
attachWebSocketServer(server, connections, broadcast, matches, lifecycle);

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
