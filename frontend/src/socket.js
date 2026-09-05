import { io } from 'socket.io-client';

// In development with Vite proxy, '/' connects to backend port 5000
const URL = '[https://aero-warehouse.onrender.com](https://aero-warehouse.onrender.com)';
export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
});
