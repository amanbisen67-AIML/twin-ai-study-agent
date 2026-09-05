import { io } from 'socket.io-client';

// In development with Vite proxy, '/' connects to backend port 5000
const URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
});
