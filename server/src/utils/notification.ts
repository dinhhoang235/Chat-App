import Expo, { ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export interface PushNotificationData {
  title: string;
  body: string;
  data?: any;
  sound?: string;
  channelId?: string;
}

export const sendPushNotifications = async (tokens: string[], notification: PushNotificationData) => {
  const messages: ExpoPushMessage[] = [];
  
  for (const token of tokens) {
    if (!token || !Expo.isExpoPushToken(token)) continue;

    messages.push({
      to: token,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      channelId: notification.channelId || 'chat',
      priority: 'high',
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const results = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      results.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending push notification chunk:', error);
    }
  }

  return results;
};

export const formatMessageNotification = (message: any) => {
  let bodyText = '';
  const type = message.type;
  const content = message.content;

  if (type === 'text') {
    bodyText = content;
  } else if (type === 'image') {
    bodyText = '📷 Ảnh';
  } else if (type === 'file') {
    try {
      const info = typeof content === 'string' ? JSON.parse(content) : content;
      bodyText = `📎 ${info?.name || 'Tệp'}`;
    } catch {
      bodyText = '📎 Tệp';
    }
  } else if (type === 'audio') {
    bodyText = '🎤 Ghi âm';
  } else if (type === 'call') {
    try {
      const info = typeof content === 'string' ? JSON.parse(content) : content;
      if (info.status === 'missed' || info.status === 'no_answer') {
        bodyText = `📞 Cuộc gọi lỡ (${info.callType === 'video' ? 'video' : 'thoại'})`;
      } else if (info.status === 'rejected') {
        bodyText = `📞 Cuộc gọi bị từ chối`;
      } else {
        bodyText = `📞 Cuộc gọi đã kết thúc (${Math.floor(info.duration / 60)}:${(info.duration % 60).toString().padStart(2, '0')})`;
      }
    } catch {
      bodyText = '📞 Cuộc gọi';
    }
  }

  let titleText = message.sender?.fullName || 'Tin nhắn mới';
  if (message.conversation?.isGroup) {
    titleText = `Nhóm ${message.conversation.name || ''}`.trim();
    const senderName = message.sender?.fullName || 'Ai đó';
    bodyText = `${senderName}: ${bodyText}`;
  }

  return {
    title: titleText,
    body: bodyText,
    data: {
      conversationId: message.conversationId,
      isGroup: message.conversation?.isGroup || false,
      name: message.conversation?.name || '',
      type: message.type
    }
  };
};
