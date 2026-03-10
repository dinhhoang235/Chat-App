import React from 'react';
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
}: ChatComposerProps) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.surfaceVariant,
        backgroundColor: colors.surface,
        marginTop: -8, // Kéo composer lên sát hơn với tin nhắn
      }}
    >
      <View
        className="px-4 flex-row items-center"
        style={{
          paddingBottom: 4,
          paddingTop: 4,
        }}
      >
        <TouchableOpacity className="mr-3">
          <MaterialIcons name="emoji-emotions" size={26} color={colors.icon} />
        </TouchableOpacity>

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
              onFocus={() => setComposerVisible(false)}
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

        {/* Right action icons: show send when typing, otherwise more/mic/image */}
        <View className="flex-row items-center">
          {messageText.trim().length > 0 ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={creatingConversation}
              style={{ padding: 6, opacity: creatingConversation ? 0.5 : 1 }}
            >
              {creatingConversation ? (
                <ActivityIndicator size={28} color={colors.tint} />
              ) : (
                <MaterialIcons name="send" size={34} color={colors.tint} />
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                className="mr-4"
                onPress={() => {
                  inputRef.current?.blur?.();
                  Keyboard.dismiss();
                  setComposerVisible(v => !v);
                }}
                style={{ padding: 6 }}
              >
                <MaterialIcons
                  name="more-horiz"
                  size={24}
                  color={composerVisible ? colors.tint : colors.icon}
                />
              </TouchableOpacity>

              <TouchableOpacity
                className="mr-4"
                onPress={() => console.log('Mic pressed')}
                style={{ padding: 6 }}
              >
                <MaterialIcons name="mic" size={28} color={colors.icon} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (onImagePress) {
                    onImagePress();
                  } else {
                    console.log('Image pressed');
                  }
                }}
                style={{ padding: 6 }}
              >
                <MaterialIcons name="image" size={26} color={colors.icon} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Return to using a small spacer or insets for default state */}
      <View style={{ height: insets.bottom / 2 }} />
    </View>
  );
}
