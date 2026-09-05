import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://aero-warehouse.onrender.com',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'https://aero-warehouse.onrender.com',
        ws: true
      }
    }
  }
});
