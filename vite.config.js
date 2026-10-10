import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // `npm run dev:api` serves the order API on :8787 during development.
    proxy: { '/api': 'http://localhost:8787', '^/images/upload-': 'http://localhost:8787' },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Stable vendor chunk: framework code stays cached across storefront releases.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-dom/client', 'react-router', 'react-router-dom'],
        },
      },
    },
  },
});
