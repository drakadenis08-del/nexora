import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    // The 3D mascot chunk (three.js + R3F + Drei) is ~1 MB but loads lazily, only when the hero is on screen.
    chunkSizeWarningLimit: 1100
  }
});
