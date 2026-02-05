import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from "../context/themeContext";
import MenuModal from './MenuModal';
import { contacts } from '../constants/mockData';
import MuteOptionsSheet from './MuteOptionsSheet';
import MuteSettingsModal from './MuteSettingsModal';
import type { Message } from '../constants/mockData';

type Props = {
  message: Message;
  onPress?: () => void;
  onAction?: (action: string) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
};

export function MessageRow({ message, onPress, onAction, selectionMode = false, selected = false, onToggleSelect }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [muteVisible, setMuteVisible] = useState(false);
  const [muteSettingsVisible, setMuteSettingsVisible] = useState(false);
  const [selectedMuteOption, setSelectedMuteOption] = useState<string>('Trong 1 giờ');
  const [excludeReminders, setExcludeReminders] = useState<boolean>(false);
  const rowRef = useRef<any>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const initials = message.initials ?? message.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  const contact = contacts.find(c => c.id === message.id);
  const isGroup = !!contact?.isGroup;

  const menuItems = [
    { key: 'mark_unread', label: 'Đánh dấu chưa đọc', icon: 'drafts' },
    { key: 'pin', label: 'Ghim', icon: 'push-pin' },
    { key: 'mute', label: 'Tắt thông báo', icon: 'notifications-off' },
    { key: 'hide', label: 'Ẩn', icon: 'visibility-off' },
    { key: 'delete', label: 'Xóa', icon: 'delete', destructive: true },
    { key: 'select', label: 'Chọn nhiều', icon: 'check-circle' },
  ];

  const { colors } = useTheme();

  const handleAction = (action: string) => {
    setMenuVisible(false);
    if (action === 'mute') {
      setMuteVisible(true);
      return;
    }
    if (action === 'select') {
      onAction?.(action);
      return;
    }

    console.log('Action:', action, 'on', message.id);
    onAction?.(action);
  };

  return (
    <>
      <TouchableOpacity
        ref={rowRef}
        onPress={() => {
          if (selectionMode) {
            onToggleSelect?.(message.id);
          } else {
            onPress?.();
          }
        }}
        onLongPress={() => {
          if (selectionMode) {
            onToggleSelect?.(message.id);
            return;
          }
          // measure position of the row and open menu anchored to it
          rowRef.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
            setMenuPos({ x, y, w, h });
            setMenuVisible(true);
          });
        }}
        delayLongPress={200}
        className="px-4 py-3 flex-row items-center"
        style={selectionMode && (selected ? { backgroundColor: colors.surface, borderRadius: 8 } : { borderRadius: 8 })}
      >
        {/* Left: checkbox + avatar in selection mode, otherwise avatar */}
        {selectionMode ? (
          <View style={{ width: 92, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => onToggleSelect?.(message.id)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              {selected ? (
                <MaterialIcons name="check-circle" size={26} color={colors.tint} />
              ) : (
                <MaterialIcons name="radio-button-unchecked" size={22} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: message.color || '#6B7280', marginLeft: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
            </View>
          </View>
        ) : (
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: message.color || '#6B7280' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
          </View>
        )}

        <View style={{ marginLeft: 12, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginRight: isGroup ? 8 : 0 }}>{message.name}</Text>
            {isGroup ? <MaterialIcons name="groups" size={16} color={colors.textSecondary} /> : null}
          </View>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{message.lastMessage}</Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{message.time}</Text>
          {message.unread && message.unread > 0 ? (
            <View style={{ backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginTop: 8 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{message.unread}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      <MenuModal visible={menuVisible} menuPos={menuPos} onClose={() => setMenuVisible(false)} onAction={handleAction} items={menuItems} message={message} />

      <MuteOptionsSheet
        visible={muteVisible}
        onClose={() => setMuteVisible(false)}
        onOpenSettings={() => { setMuteVisible(false); setMuteSettingsVisible(true); }}
        options={['Trong 1 giờ', 'Trong 4 giờ', 'Đến 8 giờ sáng', 'Cho đến khi được mở lại']}
        onSelect={(opt) => { console.log('Mute:', opt, 'on', message.id); /* TODO: save state */ }}
      />

      <MuteSettingsModal
        visible={muteSettingsVisible}
        onClose={() => setMuteSettingsVisible(false)}
        initialOption={selectedMuteOption}
        initialExclude={excludeReminders}
        onSave={(opt, exclude) => { setSelectedMuteOption(opt); setExcludeReminders(exclude); console.log('Mute settings saved', opt, exclude, 'on', message.id); }}
      />
    </>
  );
}
