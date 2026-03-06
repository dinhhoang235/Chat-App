import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '../utils/tokenStorage';

// Use environment variable for socket URL
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    tokenStorage.getAccessToken().then(token => {
      if (!token) return;

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Connected to socket server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });

      this.socket.on('connect_error', (error) => {
        console.log('Socket connect error:', error.message);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      // If socket not connected yet, try connecting or wait
      console.log(`Socket not connected, cannot listen to ${event}. Attempting connect...`);
      this.connect();
      // We could queue listeners here if needed, but for now just log
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }
}

export const socketService = new SocketService();
