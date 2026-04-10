import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Image } from 'expo-image';
import { getAvatarUrl } from '@/utils/avatar';

interface ChatComposerProps {
  messageText: string;
  onTextChange: (text: string) => void;
  inputRef: React.RefObject<any>;
  handleSend: () => void;
  creatingConversation: boolean;
  composerVisible: boolean;
  setComposerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  colors: any;
  insets: { bottom: number };
  onImagePress?: () => void;
  /** if true, show image icon as active (blue) */
  imageActive?: 'gallery' | 'actions' | 'emoji' | 'mic' | boolean;
  /** unified sheet opener: 'gallery' | 'actions' | 'emoji' | 'mic' */
  onOpenSheet?: (type: 'gallery' | 'actions' | 'emoji' | 'mic') => void;
  micTextMode?: boolean;
  onMorePress?: () => void;
  attachments?: {uri: string}[];
  onRemoveAttachment?: (arg: number | string) => void;
  onClearAttachments?: () => void;
  onFocus?: () => void;
  replyingTo?: any;
  onCancelReply?: () => void;
}

export default function ChatComposer({
  messageText,
  onTextChange,
  inputRef,
  handleSend,
  creatingConversation,
  composerVisible,
  setComposerVisible,
  colors,
  insets,
  onImagePress,
  imageActive,
  onOpenSheet,
  micTextMode = false,
  onMorePress,
  attachments,
  onRemoveAttachment,
  onClearAttachments,
  onFocus,
  replyingTo,
  onCancelReply,
}: ChatComposerProps) {
  const [imagePressed, setImagePressed] = useState(false);
  const hasAttachments = Boolean(attachments && attachments.length > 0);

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.surfaceVariant,
        backgroundColor: colors.surface,
        marginTop: -14,
      }}
    >
      {replyingTo && (
        <View className="flex-row items-center justify-between px-4 py-2" style={{ borderBottomColor: colors.surfaceVariant, borderBottomWidth: 1 }}>
          <View className="flex-1 mr-2">
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
              Đang trả lời {replyingTo.contactName || replyingTo.sender?.fullName || 'Người dùng'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }} numberOfLines={1}>
              {replyingTo.type === 'image' || replyingTo.type === 'image_group' ? '[Hình ảnh]' : (replyingTo.type === 'video' ? '[Video]' : (replyingTo.type === 'audio' ? '[Bản ghi âm]' : (replyingTo.type === 'text' ? replyingTo.content : '[Tệp]')))}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(replyingTo.type === 'image' || replyingTo.type === 'image_group' || replyingTo.type === 'video') && (
              <Image 
                source={{ 
                  uri: (() => {
                    let url = replyingTo.type === 'image_group' ? replyingTo.images?.[0]?.fileInfo?.url : replyingTo.fileInfo?.url;
                    if (!url && (replyingTo.type === 'image' || replyingTo.type === 'video')) {
                      try {
                        const info = typeof replyingTo.content === 'string' ? JSON.parse(replyingTo.content) : replyingTo.content;
                        url = info?.url;
                      } catch {
                        url = replyingTo.content;
                      }
                    }
                    if (!url) return undefined;
                    if (url.startsWith('http')) return url;
                    return getAvatarUrl(url) || url;
                  })()
                }} 
                style={{ width: 36, height: 36, borderRadius: 6, marginRight: 8, backgroundColor: colors.surfaceVariant }}
                contentFit="cover"
              />
            )}
            <TouchableOpacity onPress={onCancelReply} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View
        className="px-4 flex-row items-center"
        style={{
          paddingBottom: 1,
          paddingTop: 1,
        }}
      >
        {hasAttachments ? (
          <TouchableOpacity className="mr-3" onPress={onClearAttachments}>
            <FontAwesome5 name="chevron-left" size={24} color={colors.icon} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            className="mr-3" 
            onPress={() => {
              if (onOpenSheet) onOpenSheet('emoji');
            }}
          >
            <MaterialIcons 
              name="emoji-emotions" 
              size={26} 
              color={imageActive === 'emoji' ? colors.tint : colors.icon} 
            />
          </TouchableOpacity>
        )}

        <View
          className="flex-1 px-2 py-2 mr-3"
          style={{
            backgroundColor: colors.surface,
            borderRadius: 10,
            minHeight: 40,
            maxHeight: 100,
            justifyContent: 'center',
          }}
        >
          <TouchableWithoutFeedback onPress={() => setComposerVisible(false)} disabled={hasAttachments}>
            <View>
              <TextInput
                ref={inputRef}
                value={messageText}
                onChangeText={onTextChange}
                onFocus={() => {
                  if (onFocus) onFocus();
                }}
                placeholder="Tin nhắn"
                placeholderTextColor={colors.textSecondary}
                editable={!hasAttachments}
                showSoftInputOnFocus={!hasAttachments}
                style={{
                  color: colors.text,
                  fontSize: 16,
                  paddingVertical: 8,
                  textAlignVertical: 'center',
                  opacity: hasAttachments ? 0 : 1,
                }}
                multiline
              />
            </View>
          </TouchableWithoutFeedback>
        </View>

        {/* Right action icons: show send when typing, otherwise more/mic/image */}
        <View className="flex-row items-center">
          {(messageText.trim().length > 0 || hasAttachments) ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={creatingConversation}
              style={{ padding: 6, opacity: creatingConversation ? 0.5 : 1 }}
            >
              {creatingConversation ? (
                <ActivityIndicator size={26} color={colors.tint} />
              ) : (
                <AntDesign name="send" size={24} color={colors.tint} />
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                className="mr-4"
                onPress={() => {
                  inputRef.current?.blur?.();
                  Keyboard.dismiss();
                  if (onOpenSheet) {
                    onOpenSheet('actions');
                  } else if (onMorePress) {
                    onMorePress();
                  } else {
                    setComposerVisible(v => !v);
                  }
                }}
                style={{ padding: 6 }}
              >
                <MaterialIcons
                  name="more-horiz"
                  size={26}
                  color={composerVisible ? colors.tint : colors.icon}
                />
              </TouchableOpacity>

              <TouchableOpacity
                className="mr-4"
                onPress={() => {
                  if (onOpenSheet) onOpenSheet('mic');
                }}
                style={{ padding: 6 }}
              >
                {micTextMode ? (
                  <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons
                      name="mic"
                      size={26}
                      color={imageActive === 'mic' ? colors.tint : colors.icon}
                    />
                    <Text
                      style={{
                        position: 'absolute',
                        right: -1,
                        bottom: 0,
                        color: imageActive === 'mic' ? colors.tint : colors.icon,
                        fontSize: 8,
                        fontWeight: '800',
                        lineHeight: 9,
                      }}
                    >
                      A
                    </Text>
                  </View>
                ) : (
                  <MaterialIcons
                    name="mic"
                    size={26}
                    color={imageActive === 'mic' ? colors.tint : colors.icon}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPressIn={() => setImagePressed(true)}
                onPressOut={() => setImagePressed(false)}
                onPress={() => {
                  if (onOpenSheet) {
                    onOpenSheet('gallery');
                  } else if (onImagePress) {
                    onImagePress();
                  }
                }}
                activeOpacity={0.7}
                style={{ padding: 6 }}
              >
                <MaterialIcons
                  name="image"
                  size={26}
                  color={
                    (imageActive === 'gallery' || imageActive === true) || imagePressed ? colors.tint : colors.icon
                  }
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

    </View>
  );
}
