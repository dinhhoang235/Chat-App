import React from 'react';
import { Modal, Pressable, View, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';
import type { Message } from '../constants/mockData';

export type MenuItem = { key: string; label: string; icon: string; destructive?: boolean };

type Props = {
  visible: boolean;
  menuPos: { x: number; y: number; w: number; h: number } | null;
  onClose: () => void;
  onAction: (action: string) => void;
  items: MenuItem[];
  message?: Message | null;
};

export default function MenuModal({ visible, menuPos, onClose, onAction, items, message = null }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { scheme, colors } = useTheme();
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';
  const rowBg = scheme === 'dark' ? colors.surface : '#fff';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        {menuPos && message ? (
          <View
            style={{
              position: 'absolute',
              left: menuPos.x,
              top: menuPos.y,
              width: menuPos.w,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: rowBg,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 8,
            }}
            pointerEvents="none"
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: message.color || '#6B7280' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{(message.initials ?? message.name.split(' ').map((n: string) => n[0]).slice(0,2).join(''))}</Text>
            </View>

            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: scheme === 'dark' ? '#fff' : '#0F172A', fontSize: 16 }}>{message.name}</Text>
              <Text style={{ color: scheme === 'dark' ? '#9CA3AF' : '#6B7280', fontSize: 12 }}>{message.lastMessage}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: scheme === 'dark' ? '#9CA3AF' : '#9CA3AF', fontSize: 12 }}>{message.time}</Text>
              {message.unread && message.unread > 0 ? (
                <View style={{ backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginTop: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{message.unread}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View
          style={(() => {
            const defaultW = Math.min(220, screenWidth - 48);
            if (!menuPos) return { position: 'absolute', left: 16, width: defaultW, top: 24, backgroundColor: rowBg, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 6 };
            const estimatedItemHeight = 32;
            const menuHeight = items.length * estimatedItemHeight + 8;
            const screenW = screenWidth;
            const screenH = screenHeight;
            const menuW = Math.min(220, screenW - 48);
            const left = Math.max(8, Math.min(menuPos.x, screenW - menuW - 8));
            const spacing = 8;
            const belowTop = menuPos.y + menuPos.h + spacing;
            const aboveTop = menuPos.y - menuHeight - spacing;
            
            // Ưu tiên trên khi bottom của menu vượt quá màn hình
            const menuBottomIfBelow = belowTop + menuHeight;
            const top = menuBottomIfBelow > screenH ? aboveTop : belowTop;
            return { position: 'absolute', left, top, width: menuW, backgroundColor: rowBg, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 6 };
          })()}
        >
          {items.map((it, idx) => {
            const isSelect = it.key === 'select';
            const isLast = idx === items.length - 1;
            const borderTopStyle = isSelect ? { borderTopWidth: 1, borderTopColor: scheme === 'dark' ? colors.surface : '#E5E7EB', marginTop: 6, paddingTop: 8 } : {}; 
            const bottomRadiusStyle = isLast ? { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 } : {};

            return (
              <TouchableOpacity
                key={it.key}
                onPress={() => onAction(it.key)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, ...borderTopStyle, ...bottomRadiusStyle }}
              >
                <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name={it.icon as any} size={16} color={it.destructive ? '#DC2626' : (scheme === 'dark' ? '#E5E7EB' : '#111827')} />
                </View>
                <Text style={{ marginLeft: 10, flex: 1, color: it.destructive ? '#DC2626' : (scheme === 'dark' ? '#E5E7EB' : '#111827'), fontSize: 13 }}>{it.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}
