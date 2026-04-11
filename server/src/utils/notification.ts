import Expo from 'expo-server-sdk';

const expo = new Expo();

export interface PushNotificationData {
  title: string;
  body: string;
  data?: any;
  sound?: string;
  channelId?: string;
  categoryId?: string;
}

export const sendPushNotifications = async (tokens: string[], notification: PushNotificationData) => {
  const messages: any[] = []; // Using any to avoid strict type issues with categoryId if it's outdated in the SDK
  
  for (const token of tokens) {
    if (!token || !Expo.isExpoPushToken(token)) continue;

    messages.push({
      to: token,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      channelId: notification.channelId || 'chat',
      categoryId: notification.categoryId,
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
  let titleText = message.sender?.fullName || 'Tin nhắn mới';
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
      const callTypeName = info.callType === 'video' ? 'video' : 'thoại';
      
      if (info.status === 'missed' || info.status === 'no_answer') {
        titleText = 'Cuộc gọi lỡ';
        bodyText = `Bạn có cuộc gọi lỡ ${callTypeName} từ ${message.sender?.fullName || 'ai đó'}`;
      } else if (info.status === 'rejected') {
        titleText = 'Cuộc gọi bị từ chối';
        bodyText = `${message.sender?.fullName || 'Người dùng'} đã từ chối cuộc gọi ${callTypeName}`;
      } else {
        const minutes = Math.floor(info.duration / 60);
        const seconds = (info.duration % 60).toString().padStart(2, '0');
        titleText = 'Cuộc gọi đã kết thúc';
        bodyText = `Cuộc gọi ${callTypeName} kéo dài ${minutes}:${seconds}`;
      }
    } catch {
      titleText = 'Thông tin cuộc gọi';
      bodyText = 'Cập nhật cuộc gọi';
    }
    
    // Skip the group prefix logic for calls as they are usually private or have their own format
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
  }

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
