import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  logLevel: 'info',
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:5001',
      '/db': 'http://localhost:5001',
      '/auth': 'http://localhost:5001'
    },
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    // Ensure environment variables are available at build time
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL)
  }
});
