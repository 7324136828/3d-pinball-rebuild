import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendUrl = process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.BACKEND_HOST || '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
  preview: { host: process.env.BACKEND_HOST || '0.0.0.0' },
  build: { rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
});
