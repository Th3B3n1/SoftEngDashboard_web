import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = process.env.BACKEND_URL || env.BACKEND_URL || env.VITE_BACKEND_URL || (mode === 'development' ? 'http://localhost:5228' : '');

  return {
    base: './',
    plugins: [react()],
    define: {
      'import.meta.env.BACKEND_URL': JSON.stringify(backendUrl),
    },
    server: {
      port: 5173,
    },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  };
});
