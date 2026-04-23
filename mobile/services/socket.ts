import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/utils/tokenStorage';

// Use environment variable for socket URL
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

class SocketService {
  private socket: Socket | null = null;
  private emitQueue: { event: string; data: any }[] = [];
  private listenerQueue: { event: string; callback: (data: any) => void }[] = [];
  private statusListeners: ((connected: boolean) => void)[] = [];

  connect() {
    if (this.socket) return; 

    tokenStorage.getAccessToken().then(token => {
      if (!token) return;

      if (!this.socket) {
        this.socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });

        this.socket.on('connect', () => {
          console.log('Connected to socket server');
          this.notifyStatusListeners(true);
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

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from socket server:', reason);
          this.notifyStatusListeners(false);
        });

        this.socket.on('connect_error', (error) => {
          console.log('Socket connect error:', error.message);
          this.notifyStatusListeners(false);
        });

        this.socket.on('reconnect_attempt', () => {
          console.log('Attempting to reconnect...');
        });
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.notifyStatusListeners(false);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  onStatusChange(callback: (connected: boolean) => void) {
    this.statusListeners.push(callback);
    // Call immediately with current status
    callback(this.isConnected());
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== callback);
    };
  }

  private notifyStatusListeners(connected: boolean) {
    this.statusListeners.forEach(listener => listener(connected));
  }

  getSocket() {
    return this.socket;
  }

  emit(event: string, data: any, callback?: (response: any) => void) {
    if (this.socket?.connected) {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
    } else {
      this.emitQueue.push({ event, data });
      if (!this.socket) this.connect();
      if (callback) {
        // If socket isn't connected yet, queue an immediate callback failure
        setTimeout(() => callback({ error: 'Socket not connected' }), 0);
      }
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
