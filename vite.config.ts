import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const backendTarget = process.env.BACKEND_URL || 'http://localhost:5228';

// base './' keeps the build deployable on any static host / sub-path (HashRouter is used).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
