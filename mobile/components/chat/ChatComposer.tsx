import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
  imageActive?: boolean;
  /** unified sheet opener: 'gallery' | 'actions' */
  onOpenSheet?: (type: 'gallery' | 'actions') => void;
  onMorePress?: () => void;
  attachments?: {uri: string}[];
  onRemoveAttachment?: (arg: number | string) => void;
  onClearAttachments?: () => void;
  onFocus?: () => void;
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
  onMorePress,
  attachments,
  onRemoveAttachment,
  onClearAttachments,
  onFocus,
}: ChatComposerProps) {
  const [imagePressed, setImagePressed] = useState(false);

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.surfaceVariant,
        backgroundColor: colors.surface,
        marginTop: -14,
      }}
    >
      <View
        className="px-4 flex-row items-center"
        style={{
          paddingBottom: 1,
          paddingTop: 1,
        }}
      >
        {attachments && attachments.length > 0 ? (
          <TouchableOpacity className="mr-3" onPress={onClearAttachments}>
            <MaterialIcons name="chevron-left" size={26} color={colors.icon} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity className="mr-3">
            <MaterialIcons name="emoji-emotions" size={26} color={colors.icon} />
          </TouchableOpacity>
        )}

        {(!attachments || attachments.length === 0) ? (
          <TouchableWithoutFeedback onPress={() => setComposerVisible(false)}>
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
              <TextInput
                ref={inputRef}
                value={messageText}
                onChangeText={onTextChange}
                onFocus={() => {
                  if (onFocus) onFocus();
                }}
                placeholder="Tin nhắn"
                placeholderTextColor={colors.textSecondary}
                style={{
                  color: colors.text,
                  fontSize: 16,
                  paddingVertical: 8,
                  textAlignVertical: 'center',
                }}
                multiline
              />
            </View>
          </TouchableWithoutFeedback>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* Right action icons: show send when typing, otherwise more/mic/image */}
        <View className="flex-row items-center">
          {(messageText.trim().length > 0 || (attachments && attachments.length > 0)) ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={creatingConversation}
              style={{ padding: 6, opacity: creatingConversation ? 0.5 : 1 }}
            >
              {creatingConversation ? (
                <ActivityIndicator size={26} color={colors.tint} />
              ) : (
                <MaterialIcons name="send" size={26} color={colors.tint} />
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
                onPress={() => console.log('Mic pressed')}
                style={{ padding: 6 }}
              >
                <MaterialIcons name="mic" size={26} color={colors.icon} />
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
                    imageActive || imagePressed ? colors.tint : colors.icon
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
