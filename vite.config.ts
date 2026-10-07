import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/tablebones/',
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/tablebones/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tablebones/, ''),
      },
      '/tablebones-ws': {
        target: 'ws://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/tablebones/tablebones-ws': {
        target: 'ws://localhost:3000',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/tablebones/, ''),
      },
    },
  },
});
