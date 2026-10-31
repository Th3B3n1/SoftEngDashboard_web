import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/hf-api': {
        target: 'https://softeng-hw.ftsrg.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hf-api/, ''),
        headers: {
          Referer: 'https://softeng-hw.ftsrg.org/',
        },
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
