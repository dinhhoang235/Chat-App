import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/utils/tokenStorage';

// Use environment variable for socket URL
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

class SocketService {
  private socket: Socket | null = null;
  private emitQueue: { event: string; data: any }[] = [];
  private listenerQueue: { event: string; callback: (data: any) => void }[] = [];

  connect() {
    if (this.socket) return; 

    tokenStorage.getAccessToken().then(token => {
      if (!token) return;

      if (!this.socket) {
        this.socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket'],
        });

        this.socket.on('connect', () => {
          console.log('Connected to socket server');
          // Send all queued emits
          while (this.emitQueue.length > 0) {
            const item = this.emitQueue.shift();
            if (item) this.socket?.emit(item.event, item.data);
          }
        });

        // Register all queued listeners
        while (this.listenerQueue.length > 0) {
          const item = this.listenerQueue.shift();
          if (item) this.socket.on(item.event, item.callback);
        }

        this.socket.on('disconnect', () => {
          console.log('Disconnected from socket server');
        });

        this.socket.on('connect_error', (error) => {
          console.log('Socket connect error:', error.message);
        });
      }
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
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      this.emitQueue.push({ event, data });
      if (!this.socket) this.connect();
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      this.listenerQueue.push({ event, callback });
      this.connect();
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    } else {
      // Remove from queue if it hasn't been registered yet
      if (callback) {
        this.listenerQueue = this.listenerQueue.filter(
          l => l.event !== event || l.callback !== callback
        );
      } else {
        this.listenerQueue = this.listenerQueue.filter(l => l.event !== event);
      }
    }
  }
}

export const socketService = new SocketService();
