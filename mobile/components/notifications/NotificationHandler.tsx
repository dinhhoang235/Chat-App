import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { socketService } from '@/services/socket';
import { activeConversationId } from '@/services/notificationState';
import { useAuth } from '@/context/authContext';
import { userAPI } from '@/services/user';

// configure how notifications are shown when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // `shouldShowAlert` is deprecated; use banner/list instead
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// helper to register for push notifications and return the token
async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Constants.isDevice && Platform.OS === 'ios') {
    console.warn('Must use physical device for Push Notifications on iOS');
    return;
  }

  // static import means Notifications is always available on native
  if (Platform.OS === 'web') {
    console.warn('Notifications not supported on web');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notifications!');
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('Expo push token:', token);
    return token;
  } catch (e: any) {
    // Some Android builds require FCM configuration; provide actionable log
    if (e.message && e.message.includes('FirebaseApp is not initialized')) {
      console.error(
        'Push token generation failed: FCM not configured. ' +
        'Follow https://docs.expo.dev/push-notifications/fcm-credentials/ to set up Firebase credentials for Android.'
      );
    } else {
      console.error('Error getting Expo push token:', e);
    }
    return;
  }
}

export default function NotificationHandler() {
  const appState = useRef(AppState.currentState);
  const { user } = useAuth();

  useEffect(() => {
    // Android channel setup -- only needs to run once
    if (Notifications && Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // track app state transitions so we know whether the app is active
    const sub = AppState.addEventListener('change', nextState => {
      appState.current = nextState;
    });
    return () => {
      sub.remove();
    };
  }, []);

  // separate effect for registration, only when we have a user
  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAsync().then(async token => {
      if (token) {
        try {
          // update on backend so the server can use it when sending push
          const resp = await userAPI.updatePushToken(user.id, token);
          console.log('updated push token on backend:', resp);
        } catch (err) {
          console.error('Failed to save push token', err);
        }
      } else {
        console.warn('No push token obtained from expo');
      }
    });
  }, [user]);

  useEffect(() => {
    const handleNewMessage = async (message: any) => {
      console.log('NotificationHandler received new_message', message, 'appState', appState.current, 'activeConv', activeConversationId);
      // ignore messages sent by ourselves
      if (message.senderId === user?.id) {
        console.log('ignoring own message');
        return;
      }

      const convStr = message.conversationId?.toString();
      // don't fire if we're currently looking at this conversation and app is active
      if (appState.current === 'active' && convStr && convStr === activeConversationId) {
        console.log('skipping notification because conversation active');
        return;
      }

      // build readable title/body
      const title = message.sender?.fullName || 'Tin nhắn mới';
      let body = '';
      if (message.type === 'text') {
        body = message.content;
      } else if (message.type === 'image') {
        body = '📷 Ảnh';
      } else if (message.type === 'file') {
        try {
          const info = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
          body = `📎 ${info?.name || 'Tệp'}`;
        } catch {
          body = '📎 Tệp';
        }
      }

      if (Notifications) {
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: true },
            trigger: null,
          });
          console.log('scheduled local notification', id, title, body);
        } catch (e) {
          console.error('error scheduling local notification', e);
        }
      } else {
        console.warn('Notifications module not available, cannot schedule');
      }
    };

    socketService.on('new_message', handleNewMessage);
    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, [user]);

  return null;
}
