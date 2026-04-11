import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { chatApi } from '@/services/chat';
import { storageApi } from '@/services/storage';
import { prepareAttachmentForUpload } from '@/services/mediaUpload';
import { mapThreadMessage } from '@/utils/chatThread';

type AttachmentFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
  duration?: number;
  waveform?: number[];
};

type UseChatThreadAttachmentsArgs = {
  userId?: number;
  conversationId: string | null;
  isNewConversation: boolean;
  targetUserIdState: string | null;
  replyingTo: any;
  setReplyingTo: (value: any) => void;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setConversationId: (value: string | null) => void;
  setCreatingConversation: (value: boolean) => void;
  setUploadProgress: React.Dispatch<React.SetStateAction<Record<string, number>>>;
};

const MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024;
const DEFAULT_MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024;
const AUDIO_MULTIPART_THRESHOLD_BYTES = 2 * 1024 * 1024;

const getAttachmentType = (mime: string) => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
};

export function useChatThreadAttachments({
  userId,
  conversationId,
  isNewConversation,
  targetUserIdState,
  replyingTo,
  setReplyingTo,
  setMessages,
  setConversationId,
  setCreatingConversation,
  setUploadProgress,
}: UseChatThreadAttachmentsArgs) {
  const handleSendAttachment = useCallback(
    async (file: AttachmentFile, caption?: string) => {
      if (!file) return;

      if (file.size && file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        alert('Tệp quá lớn, giới hạn là 100MB');
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const clearUploadProgress = () => {
        setUploadProgress(prev => {
          if (!(tempId in prev)) return prev;
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      };

      const replyToSnapshot = replyingTo;
      setReplyingTo(null);

      const preparedAttachment = await prepareAttachmentForUpload(file);
      const uploadFileUri = preparedAttachment.uploadUri;
      const uploadFileName = preparedAttachment.uploadName;
      const uploadSize = preparedAttachment.uploadSize ?? file.size;

      const tempMessage: any = {
        id: tempId,
        content: uploadFileUri,
        fromMe: true,
        senderId: userId,
        createdAt: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sending',
        replyTo: replyToSnapshot,
        type: getAttachmentType(file.type),
        fileName: file.name,
        fileInfo: {
          url: uploadFileUri,
          size: uploadSize,
          mime: file.type,
          waveform: file.waveform,
        },
      };

      try {
        let targetConversationId = conversationId;

        if (isNewConversation && !conversationId) {
          setMessages([tempMessage]);
          setCreatingConversation(true);
          try {
            const isImage = file.type.startsWith('image/');

            let finalUrl = '';
            let thumbnailUrl = '';
            const multipartThreshold = file.type.startsWith('audio/')
              ? AUDIO_MULTIPART_THRESHOLD_BYTES
              : DEFAULT_MULTIPART_THRESHOLD_BYTES;
            const isLargeFile = Boolean(uploadSize && uploadSize > multipartThreshold);
            const isVideo = file.type.startsWith('video/');

            if (isVideo) {
              try {
                const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(file.uri, { time: 0 });
                const thumbName = `thumb_${file.name.replace(/\.[^/.]+$/, '')}.jpg`;
                const { uploadUrl: thumbTarget, finalUrl: thumbFinal, headers: thumbHeaders } = await storageApi.getUploadUrl(thumbName, 'image/jpeg');
                await storageApi.uploadToPresignedUrl(thumbTarget, thumbUri, thumbHeaders['Content-Type']);
                thumbnailUrl = thumbFinal;
              } catch (error) {
                console.warn('Thumbnail generation failed', error);
              }
            }

            if (isLargeFile) {
              finalUrl = await storageApi.uploadFileChunked(
                uploadFileUri,
                uploadFileName,
                file.type,
                uploadSize!,
                progress => setUploadProgress(prev => ({ ...prev, [tempId]: progress }))
              );
            } else {
              const { uploadUrl, finalUrl: fetchedUrl, headers } = await storageApi.getUploadUrl(uploadFileName, file.type);
              setUploadProgress(prev => ({ ...prev, [tempId]: 0.1 }));
              await storageApi.uploadToPresignedUrl(uploadUrl, uploadFileUri, headers['Content-Type']);
              finalUrl = fetchedUrl;
              setUploadProgress(prev => ({ ...prev, [tempId]: 1 }));
            }

            const fileInfo = {
              url: finalUrl,
              name: file.name,
              size: uploadSize,
              mime: file.type,
              duration: file.duration,
              waveform: file.waveform,
              thumbnailUrl: thumbnailUrl || undefined,
            };

            const response = await chatApi.startConversation(
              Number(targetUserIdState),
              JSON.stringify(fileInfo),
              undefined,
              isImage ? 'image' : (file.type.startsWith('video/') ? 'video' : (file.type.startsWith('audio/') ? 'audio' : 'file'))
            );

            const conv = response.data;
            const convId = conv.id || conv.conversationId;
            if (convId) {
              targetConversationId = convId.toString();
              setConversationId(targetConversationId);
              const lastMessage = conv.messages?.[0];
              if (lastMessage) {
                const mappedMessage = mapThreadMessage(lastMessage, userId, { status: 'sent', includeSeenBy: true });
                setMessages([mappedMessage]);
              }
            }
            clearUploadProgress();
            return;
          } catch (error) {
            console.error('Error creating conversation on attachment send:', error);
            setMessages([]);
            clearUploadProgress();
            return;
          } finally {
            setCreatingConversation(false);
          }
        }

        setMessages(prev => [tempMessage, ...prev]);
        const isImage = file.type.startsWith('image/');

        let finalFileUrl = '';
        let thumbnailUrl = '';
        try {
          const multipartThreshold = file.type.startsWith('audio/')
            ? AUDIO_MULTIPART_THRESHOLD_BYTES
            : DEFAULT_MULTIPART_THRESHOLD_BYTES;
          const isLargeFile = Boolean(uploadSize && uploadSize > multipartThreshold);
          const isVideo = file.type.startsWith('video/');

          if (isVideo) {
            try {
              const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(file.uri, { time: 0 });
              const thumbName = `thumb_${file.name.replace(/\.[^/.]+$/, '')}.jpg`;
              const { uploadUrl: thumbTarget, finalUrl: thumbFinal, headers: thumbHeaders } = await storageApi.getUploadUrl(thumbName, 'image/jpeg');
              await storageApi.uploadToPresignedUrl(thumbTarget, thumbUri, thumbHeaders['Content-Type']);
              thumbnailUrl = thumbFinal;
            } catch (error) {
              console.warn('Thumbnail generation failed', error);
            }
          }

          if (isLargeFile) {
            finalFileUrl = await storageApi.uploadFileChunked(
              uploadFileUri,
              uploadFileName,
              file.type,
              uploadSize!,
              progress => setUploadProgress(prev => ({ ...prev, [tempId]: progress }))
            );
          } else {
            const { uploadUrl, finalUrl, headers } = await storageApi.getUploadUrl(uploadFileName, file.type);
            setUploadProgress(prev => ({ ...prev, [tempId]: 0.1 }));
            await storageApi.uploadToPresignedUrl(uploadUrl, uploadFileUri, headers['Content-Type']);
            finalFileUrl = finalUrl;
            setUploadProgress(prev => ({ ...prev, [tempId]: 1 }));
          }
        } catch (error) {
          console.error('Upload failed', error);
          throw new Error('Upload failed');
        }

        const fileInfo = {
          url: finalFileUrl,
          name: file.name,
          size: uploadSize,
          mime: file.type,
          duration: file.duration,
          waveform: file.waveform,
          thumbnailUrl: thumbnailUrl || undefined,
        };

        const response = await chatApi.sendMessage(
          Number(targetConversationId),
          JSON.stringify(fileInfo),
          isImage ? 'image' : (file.type.startsWith('video/') ? 'video' : (file.type.startsWith('audio/') ? 'audio' : 'file')),
          undefined,
          replyToSnapshot?.id,
          tempId
        );

        const sentMessage = response.data;

        setMessages(prev => {
          const idx = prev.findIndex(message => message.id === tempId);
          if (idx !== -1) {
            const newMessages = [...prev];
            const mapped: any = mapThreadMessage(sentMessage, userId, { status: 'sent', includeSeenBy: true });
            newMessages[idx] = mapped;
            return newMessages;
          }
          return prev;
        });
        clearUploadProgress();
      } catch (error) {
        console.error('Attachment send error:', error);
        alert('Không thể gửi tệp, vui lòng thử lại');
        setMessages(prev => prev.filter(message => message.id !== tempId));
        clearUploadProgress();
      }
    },
    [
      conversationId,
      isNewConversation,
      replyingTo,
      setConversationId,
      setCreatingConversation,
      setMessages,
      setReplyingTo,
      setUploadProgress,
      targetUserIdState,
      userId,
    ]
  );

  const pickDocument = useCallback(async () => {
    try {
      const res: any = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      let uri: string | undefined;
      let name: string | undefined;
      let mime: string | undefined;
      let size: number | undefined;

      if (res.uri) {
        uri = res.uri;
        name = res.name;
        mime = res.mimeType;
        size = res.size;
      } else if (res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        uri = asset.uri;
        name = asset.name;
        mime = asset.mimeType;
        size = asset.size;
      }

      if (uri) {
        if (size && size > MAX_ATTACHMENT_SIZE_BYTES) {
          Alert.alert('Tệp quá lớn', 'Vui lòng chọn tệp nhỏ hơn 100MB.');
          return;
        }
        await handleSendAttachment({ uri, name: name || 'file', type: mime || 'application/octet-stream', size });
      }
    } catch (error) {
      console.error('Document picker error', error);
    }
  }, [handleSendAttachment]);

  return { handleSendAttachment, pickDocument };
}
