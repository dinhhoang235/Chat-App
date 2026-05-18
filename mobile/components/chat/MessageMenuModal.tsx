import React from 'react';
import { Modal, Pressable, View, TouchableOpacity, Text, useWindowDimensions, Platform, StatusBar, StyleSheet, Animated } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export type MessageMenuItem = { key: string; label: string; icon: string; destructive?: boolean; ionicon?: boolean };

type Props = {
  visible: boolean;
  menuPos: { x: number; y: number; w: number; h: number } | null;
  onClose: () => void;
  onAction: (action: string) => void;
  items: MessageMenuItem[];
  message: any;
  isOutgoing: boolean;
  children?: React.ReactNode; // This will be the message bubble clone
};

const REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

export default function MessageMenuModal({ visible, menuPos, onClose, onAction, items, message, isOutgoing, children }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.90)' : 'rgba(255,255,255,0.90)';
  const menuBg = colors.surface;
  
  

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
  const contentTranslateY = React.useRef(new Animated.Value(0)).current;

  // Calculate layout
  const statusBarOffset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const initialY = menuPos ? menuPos.y + statusBarOffset : 0;
  const menuItemHeight = 42;
  const menuHeight = items.length * menuItemHeight + 12;
  const reactionHeight = 56;
  const spacing = 12;
  const bottomPadding = insets.bottom + 20;

  // Logic: We want the menu BELOW the message if possible.
  // If there's not enough space below, we "push" the message up.
  const totalHeightNeededBelow = menuPos ? menuPos.h + menuHeight + spacing + bottomPadding : 0;
  const availableSpaceBelow = screenHeight - initialY;
  
  let shiftY = 0;
  if (menuPos && availableSpaceBelow < totalHeightNeededBelow) {
    shiftY = totalHeightNeededBelow - availableSpaceBelow;
    // Don't shift so much that the message goes off top
    shiftY = Math.min(shiftY, initialY - (insets.top + reactionHeight + 20));
  }

  const finalY = initialY - shiftY;

  React.useEffect(() => {
    if (visible) {
      contentTranslateY.setValue(shiftY > 0 ? 20 : 0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 9, tension: 100, useNativeDriver: true }),
        Animated.spring(contentTranslateY, { toValue: 0, friction: 9, tension: 100, useNativeDriver: true }),
      ]).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [visible, fadeAnim, scaleAnim, contentTranslateY, shiftY]);

  if (!visible || !menuPos) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View 
          style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor, opacity: fadeAnim }]} 
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        
        <Animated.View 
          style={{ 
            flex: 1, 
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: contentTranslateY }
            ]
          }}
          pointerEvents="box-none"
        >
          {/* Reaction Bar - Always above the message */}
          <View
            style={{
              position: 'absolute',
              left: isOutgoing ? undefined : Math.max(16, menuPos.x),
              right: isOutgoing ? Math.max(16, screenWidth - (menuPos.x + menuPos.w)) : undefined,
              top: finalY - 65,
              backgroundColor: menuBg,
              borderRadius: 30,
              paddingHorizontal: 8,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
              zIndex: 1001,
            }}
          >
            {REACTIONS.map((emoji) => (
              <TouchableOpacity 
                key={emoji} 
                onPress={() => {
                  onAction(`react_${emoji}`);
                  onClose();
                }}
                style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 28 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              onPress={() => {
                onAction('react_more');
                onClose();
              }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 }}
            >
              <MaterialIcons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Message Bubble Clone (Lifted) */}
          <View
            style={{
              position: 'absolute',
              left: menuPos.x,
              top: finalY,
              width: menuPos.w,
              height: menuPos.h,
              zIndex: 1000,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 15,
              elevation: 5,
            }}
            pointerEvents="none"
          >
            {children}
          </View>

          {/* Action Menu - Always below the message */}
          <View
            style={{
              position: 'absolute',
              left: isOutgoing ? undefined : Math.max(16, menuPos.x),
              right: isOutgoing ? Math.max(16, screenWidth - (menuPos.x + menuPos.w)) : undefined,
              top: finalY + menuPos.h + spacing,
              width: 190,
              backgroundColor: menuBg,
              borderRadius: 12,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 12,
              zIndex: 1001,
            }}
          >
            {items.map((it, idx) => (
              <React.Fragment key={it.key}>
                {(it.key === 'more' || it.key === 'less') && (
                  <View style={{ height: 6, backgroundColor: scheme === 'dark' ? '#2c2c2c' : '#f0f2f5' }} />
                )}
                <TouchableOpacity
                  onPress={() => {
                    onAction(it.key);
                    if (it.key !== 'more' && it.key !== 'less') {
                      onClose();
                    }
                  }}
                  activeOpacity={0.7}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    paddingVertical: 10, 
                    paddingHorizontal: 14,
                    borderBottomWidth: (idx === items.length - 1 || items[idx + 1]?.key === 'more' || items[idx + 1]?.key === 'less') ? 0 : 0.5,
                    borderBottomColor: colors.border
                  }}
                >
                  <Text style={{ flex: 1, color: it.destructive ? colors.danger : colors.text, fontSize: 15, fontWeight: '500' }}>
                    {it.label}
                  </Text>
                  {it.ionicon ? (
                     <Ionicons name={it.icon as any} size={18} color={it.destructive ? colors.danger : colors.textSecondary} />
                  ) : (
                    <MaterialIcons name={it.icon as any} size={18} color={it.destructive ? colors.danger : colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
