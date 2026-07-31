import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri expects a fixed dev-server port and passes TAURI_* env vars.
// https://v2.tauri.app/start/frontend/vite/
export default defineConfig(async () => ({
  plugins: [react()],

  // Prevent Vite from obscuring Rust errors.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Don't watch the Rust source tree.
      ignored: ['**/src-tauri/**'],
    },
  },
}));
