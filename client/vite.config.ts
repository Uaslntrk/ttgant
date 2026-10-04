import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/teams': 'http://localhost:5000',
      '/tasks': 'http://localhost:5000',
      '/team': 'http://localhost:5000',
      '/nearest': 'http://localhost:5000',
      '/route': 'http://localhost:5000',
      '/upload-excel': 'http://localhost:5000',
      '/notifications': 'http://localhost:5000',
      '/api': 'http://localhost:5000'
    }
  }
});
