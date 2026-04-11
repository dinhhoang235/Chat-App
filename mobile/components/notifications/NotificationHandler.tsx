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
import { useCall } from '@/context/callContext';
import { useRouter } from 'expo-router';

// Register notification categories at the top level for reliability
Notifications.setNotificationCategoryAsync('call', [
  {
    identifier: 'accept',
    buttonTitle: 'Chấp nhận',
    options: { opensAppToForeground: true },
  },
  {
    identifier: 'reject',
    buttonTitle: 'Từ chối',
    options: { isDestructive: true, opensAppToForeground: false },
  },
], {
  allowInCarPlay: true,
  allowAnnouncement: true,
}).catch((err: any) => console.error('Category registration error:', err));

// minimal response type used locally to avoid export issues
interface NotificationResponse {
  notification: {
    request: {
      identifier: string;
      content: {
        data?: any;
      };
    };
  };
  actionIdentifier: string;
  userText?: string;
}

// server messages include conversation info in data payload
interface IncomingMessage {
  id: number;
  conversationId?: number | string;
  senderId?: number;           // sometimes message may still have this
  sender?: { id: number; fullName: string };
  type?: string;
  content?: any;
  conversation?: { isGroup?: boolean; name?: string };
}

// foreground notification behavior - hide system banners when app is active
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldPlaySound: false,
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
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    console.log('[Push] Registering with projectId:', projectId);

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
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
  const router = useRouter();
  const { setIncomingCall, setCallStatus, activeCall } = useCall();

  // when a notification is tapped we want to navigate to the related chat
  const coldHandled = useRef(false);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response: NotificationResponse) => {
        const data: any = response.notification.request.content.data;
        console.log('notification tapped data', data);

        if (data?.type === 'call') {
          console.log('Call notification action:', response.actionIdentifier);
          
          const callInfo = {
            callId: data.callId,
            conversationId: data.conversationId,
            callType: data.callType || 'voice',
            isOutgoing: false,
            remoteUserId: data.callerId ? Number(data.callerId) : 0,
            remoteName: data.callerName || 'Unknown',
            remoteAvatar: data.callerAvatar,
          };

          if (response.actionIdentifier === 'accept') {
            setIncomingCall(callInfo);
            setCallStatus('incoming');
          } else if (response.actionIdentifier === 'reject') {
             // Handle reject locally if needed
          } else {
            // Standard tap (not a button)
            if (!activeCall) {
              setIncomingCall(callInfo);
              setCallStatus('incoming');
            }
          }
          return;
        }

        const convId = data?.conversationId;
        if (convId) {
          const params: any = { id: convId };
          if (data.isGroup) params.isGroup = 'true';
          if (data.name) params.name = data.name;
          router.push({ pathname: '/chat/[id]', params });
        }
      }
    );

    return () => subscription.remove();
  }, [router, activeCall, setCallStatus, setIncomingCall]);

  // cold start should only be handled once ever
  useEffect(() => {
    if (coldHandled.current) return;
    (async () => {
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        const data: any = lastResponse.notification.request.content.data;
        console.log('cold start notification data', data);
        const convId = data?.conversationId;
        if (data?.type === 'call') {
          if (!activeCall) {
            setIncomingCall({
              callId: data.callId,
              conversationId: data.conversationId,
              callType: data.callType || 'voice',
              isOutgoing: false,
              remoteUserId: data.callerId ? Number(data.callerId) : 0,
              remoteName: data.callerName || 'Unknown',
              remoteAvatar: data.callerAvatar,
            });
            setCallStatus('incoming');
          }
        } else if (convId) {
          const params: any = { id: convId };
          if (data.isGroup) params.isGroup = 'true';
          if (data.name) params.name = data.name;
          router.push({ pathname: '/chat/[id]', params });
        }
      }
      coldHandled.current = true;
    })();
  }, [router, activeCall, setCallStatus, setIncomingCall]);

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
      Notifications.setNotificationChannelAsync('call', {
        name: 'Incoming calls',
        importance: Notifications.AndroidImportance.HIGH, // High instead of MAX to potentially avoid intrusive sound
        vibrationPattern: [0, 500, 500, 500, 500, 500],
        lightColor: '#3B82F6',
        sound: null, // Explicitly disable sound for the call channel
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
    const handleNewMessage = async (message: IncomingMessage) => {
      // Ignore own messages
      if (message.senderId === user?.id) return;

      // Skip if user is actively viewing this conversation
      const convStr = message.conversationId?.toString();
      if (appState.current === 'active' && convStr && convStr === activeConversationId) {
        return;
      }

      // prepare notification text
      const isGroup = message.conversation?.isGroup;
      const convName = message.conversation?.name;

      let title = message.sender?.fullName || 'Tin nhắn mới';
      let body = '';

      if (message.type === 'text') {
        body = message.content;
      } else if (message.type === 'image') {
        body = '[Hình Ảnh]';
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

      if (isGroup) {
        title = `Nhóm ${convName || ''}`.trim();
        const senderName = message.sender?.fullName || 'Ai đó';
        body = `${senderName}: ${body}`;
      }

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: SOUND_NAME,
            data: {
              conversationId: message.conversationId?.toString(),
              isGroup: isGroup || false,
              name: convName || ''
            },
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