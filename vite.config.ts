import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (ifaceList) {
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

function tablebonesServerPlugin(): Plugin {
  return {
    name: 'tablebones-server-plugin',
    configureServer(server) {
      // 1. Attach WebSocket Server to Vite's httpServer safely without interfering with Vite HMR
      if (server.httpServer) {
        const wss = new WebSocketServer({ noServer: true });

        server.httpServer.on('upgrade', (request, socket, head) => {
          if (request.url?.startsWith('/tablebones-ws')) {
            wss.handleUpgrade(request, socket, head, (ws) => {
              wss.emit('connection', ws, request);
            });
          }
          // Do NOT destroy sockets that don't match, allowing Vite HMR to handle them!
        });

        wss.on('connection', (ws) => {
          ws.on('message', (messageRaw) => {
            const messageStr = messageRaw.toString();
            // Relay to all other connected clients
            for (const client of wss.clients) {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
              }
            }
          });
        });
      }

      // 2. Add /api/network-info endpoint
      server.middlewares.use('/api/network-info', (_req, res) => {
        const ip = getLocalIp();
        const info = {
          localIp: ip,
          port: 3000,
          lanUrl: `http://${ip}:3000`,
        };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(info));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tablebonesServerPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
  },
});
