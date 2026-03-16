import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

export function useProfileScanner() {
  const [scannerVisible, setScannerVisible] = useState(false);
  const router = useRouter();

  const openScanner = useCallback(() => {
    setScannerVisible(true);
  }, []);

  const closeScanner = useCallback(() => {
    setScannerVisible(false);
  }, []);

  const handleScan = useCallback((data: string) => {
    setScannerVisible(false);
    
    // Check if it's a profile link: chatapp://profile/ID
    if (data.startsWith('chatapp://profile/')) {
      const userId = data.replace('chatapp://profile/', '');
      if (userId) {
        router.push(`/profile/${userId}`);
      }
    } else {
      Alert.alert('Thông báo', 'Mã QR không hợp lệ hoặc không được hỗ trợ.');
    }
  }, [router]);

  return {
    scannerVisible,
    openScanner,
    closeScanner,
    handleScan
  };
}
