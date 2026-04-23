import { useState, useEffect } from 'react';
import { socketService } from '@/services/socket';

export const useSocketStatus = () => {
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);

  useEffect(() => {
    const unsubscribe = socketService.onStatusChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        setHasConnectedOnce(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isConnected, hasConnectedOnce };
};
