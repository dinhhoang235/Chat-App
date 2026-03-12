import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Asset } from 'expo-asset';
import notificationSound from '@/assets/sounds/notification.mp3';
import { socketService } from '@/services/socket';
import { activeConversationId } from '@/services/notificationState';
import { useAuth } from '@/context/authContext';
import { userAPI } from '@/services/user';

// foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'web') return;

  if (!Constants.isDevice && Platform.OS === 'ios') {
    console.warn('Push notifications require a real device on iOS');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push permission denied');
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (e: any) {
    if (e.message?.includes('FirebaseApp is not initialized')) {
      console.error(
        'FCM not configured. See: https://docs.expo.dev/push-notifications/fcm-credentials/'
      );
    } else {
      console.error('Error getting push token:', e);
    }
    return;
  }
}

// Sound name differs by platform:
// - Android: no extension (reads from res/raw/)
// - iOS: with extension (reads from app bundle)
const SOUND_NAME = Platform.OS === 'android' ? 'notification' : 'notification.mp3';

export default function NotificationHandler() {
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);

  // Setup: preload sound asset + create Android channel
  useEffect(() => {
    // Preload so bundler includes the file
    Asset.fromModule(notificationSound).downloadAsync().catch(() => {});

    if (Platform.OS === 'android') {
      Notifications.deleteNotificationChannelAsync('default').catch(() => {});
      Notifications.deleteNotificationChannelAsync('miscellaneous').catch(() => {});
      Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'notification', 
      });
    }

    const sub = AppState.addEventListener('change', state => {
      appState.current = state;
    });

    return () => sub.remove();
  }, []);

  // Register push token when user is available
  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAsync().then(async token => {
      if (!token) {
        console.warn('No push token obtained');
        return;
      }
      try {
        await userAPI.updatePushToken(user.id, token);
        console.log('Push token saved to backend');
      } catch (err) {
        console.error('Failed to save push token:', err);
      }
    });
  }, [user]);

  // Listen for incoming socket messages and fire local notifications
  useEffect(() => {
    const handleNewMessage = async (message: any) => {
      // Ignore own messages
      if (message.senderId === user?.id) return;

      // Skip if user is actively viewing this conversation
      const convStr = message.conversationId?.toString();
      if (appState.current === 'active' && convStr && convStr === activeConversationId) {
        return;
      }

      const title = message.sender?.fullName || 'Tin nhắn mới';
      let body = '';

      if (message.type === 'text') {
        body = message.content;
      } else if (message.type === 'image') {
        body = '📷 Ảnh';
      } else if (message.type === 'file') {
        try {
          const info =
            typeof message.content === 'string'
              ? JSON.parse(message.content)
              : message.content;
          body = `📎 ${info?.name || 'Tệp'}`;
        } catch {
          body = '📎 Tệp';
        }
      }

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: SOUND_NAME,
            // Android: bind to our channel so the channel's sound/vibration is used
            ...(Platform.OS === 'android' && {
              android: { channelId: 'chat' },
            }),
          },
          trigger: null,
        });
      } catch (e) {
        console.error('Failed to schedule notification:', e);
      }
    };

    socketService.on('new_message', handleNewMessage);
    return () => socketService.off('new_message', handleNewMessage);
  }, [user]);

  return null;
}