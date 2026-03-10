import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, Text, TextInput, Pressable, Keyboard } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialName?: string;
  onSave: (name: string) => void;
};

export default function EditDisplayNameModal({ visible, onClose, initialName = '', onSave }: Props) {
  const [value, setValue] = useState<string>(initialName);
  const inputRef = useRef<TextInput | null>(null);
  const { scheme, colors } = useTheme();
  const rowBg = colors.surface;

  useEffect(() => {
    let t: number | undefined;
    if (visible) {
      setValue(initialName);
      // focus the input after a moment so keyboard appears and pushes the sheet up
      t = setTimeout(() => inputRef.current?.focus(), 150) as unknown as number;
    }

    return () => {
      if (t) clearTimeout(t);
    };
  }, [visible, initialName]);

  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';

  // keyboard height shared value (reanimated)
  const keyboardHeight = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // also track keyboard visibility in JS so we can decide overlay behavior
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useKeyboardHandler({
    onMove: (event) => {
      'worklet';
      keyboardHeight.value = Math.max(event.height || 0, 0);
    },
    onEnd: (event) => {
      'worklet';
      keyboardHeight.value = Math.max(event.height || 0, 0);
    },
  }, []);

  const footerAnimatedStyle = useAnimatedStyle(() => {
    // position the footer right above the keyboard with a small gap and respect safe area
    const safe = insets.bottom || 0;
    const gap = 8; // small gap between footer and keyboard
    const translate = keyboardHeight.value > 0 ? -Math.max(0, keyboardHeight.value - safe - gap) : 0;
    return { transform: [{ translateY: withTiming(translate, { duration: 160 }) }] };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    // keep content padding minimal so footer sits close to keyboard
    const pad = keyboardHeight.value > 0 ? (insets.bottom || 0) + 8 : 0;
    return { paddingBottom: withTiming(pad, { duration: 160 }) };
  });



  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: overlayColor }}>
        {/* overlay behind modal content; tapping it dismisses keyboard if open, otherwise closes modal */}
        <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={() => { if (keyboardOpen) { Keyboard.dismiss(); } else { onClose(); } }} />

        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: rowBg }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>

              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Đổi tên gợi nhớ</Text>

              <View style={{ width: 24 }} />
            </View>

            <Pressable style={{ flex: 1 }} onPress={() => { if (keyboardOpen) Keyboard.dismiss(); }}>
              <Animated.View style={[{ flex: 1 }, contentAnimatedStyle]}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, flex: 1 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Tên gợi nhớ dùng để bạn nhận diện cuộc trò chuyện (chỉ hiển thị cho bạn).</Text>

                <View style={{ position: 'relative' }}>
                  <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={setValue}
                    placeholder="Nhập tên..."
                    placeholderTextColor={colors.textSecondary}
                    style={{ backgroundColor: colors.surface, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 12, paddingRight: 44, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border }}
                    returnKeyType="done"
                    onSubmitEditing={() => { onSave(value.trim()); onClose(); }}
                  />

                  {value ? (
                    <TouchableOpacity
                      accessibilityLabel="Xóa"
                      onPress={() => { setValue(''); inputRef.current?.focus(); }}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: [{ translateY: -12 }], width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <Animated.View style={[{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }, footerAnimatedStyle]}>
                <TouchableOpacity onPress={() => { onSave(value.trim()); onClose(); }} style={{ backgroundColor: colors.tint, borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Lưu</Text>
                </TouchableOpacity>
              </Animated.View>
              </Animated.View>
            </Pressable>

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
