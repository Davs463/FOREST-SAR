import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Relative base: the bundle works at the domain root or in a subfolder (hash routing, static hosting).
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(projectRoot),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
