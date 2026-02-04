import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use relative paths for production (Electron), absolute for dev
  base: command === 'build' ? './' : '/',
  build: {
    sourcemap: true,
  },
  server: {
    open: true, // Auto-open browser on npm run dev
  },
}));
