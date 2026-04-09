import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from "@/context/themeContext";
import { MenuModal, MuteOptionsSheet, MuteSettingsModal } from '@/components/modals';
import { GroupAvatar, ChatAvatar } from '@/components/avatars';

type Props = {
  message: {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    unread?: number;
    initials?: string;
    color?: string;
    avatar?: string;
    avatars?: (string | any)[]; // for groups
    isGroup?: boolean;
    membersCount?: number;
    status?: string;
    isMuted?: boolean;
    isPinned?: boolean;
  };
  onPress?: () => void;
  onAction?: (action: string, data?: any) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
};

export default function MessageRow({ message, onPress, onAction, selectionMode = false, selected = false, onToggleSelect }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [muteVisible, setMuteVisible] = useState(false);
  const [muteSettingsVisible, setMuteSettingsVisible] = useState(false);
  const [selectedMuteOption, setSelectedMuteOption] = useState<string>('Trong 1 giờ');
  const [excludeReminders, setExcludeReminders] = useState<boolean>(false);
  const rowRef = useRef<any>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const isGroupConversation = !!message.isGroup;

  const menuItems = [
    { 
      key: message.unread && message.unread > 0 ? 'mark_read' : 'mark_unread', 
      label: message.unread && message.unread > 0 ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc', 
      icon: message.unread && message.unread > 0 ? 'mark-chat-read' : 'mark-chat-unread' 
    },
    { key: 'pin', label: message.isPinned ? 'Bỏ ghim' : 'Ghim', icon: 'push-pin' },
    { 
      key: 'mute', 
      label: message.isMuted ? 'Bật thông báo' : 'Tắt thông báo', 
      icon: message.isMuted ? 'notifications' : 'notifications-off' 
    },
    { key: 'delete', label: 'Xóa', icon: 'delete', destructive: true },
    { key: 'select', label: 'Chọn nhiều', icon: 'check-circle' },
  ];

  const { colors } = useTheme();

  const handleAction = (action: string) => {
    setMenuVisible(false);
    if (action === 'mute') {
      if (message.isMuted) {
        onAction?.('unmute');
      } else {
        setMuteVisible(true);
      }
      return;
    }
    if (action === 'select') {
      onAction?.(action);
      return;
    }

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
        <MenuModal
          visible={menuVisible}
          menuPos={menuPos}
          onClose={() => setMenuVisible(false)}
          onAction={(action) => handleAction(action)}
          items={menuItems}
          message={{
            ...message,
            groupAvatars: message.avatars,
            isGroup: isGroupConversation,
            membersCount: message.membersCount
          } as any}
        />
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

            <View style={{ marginLeft: 8 }}>
              {isGroupConversation ? (
                <GroupAvatar avatars={message.avatars} size={48} membersCount={message.membersCount} />
              ) : (
                <ChatAvatar
                  avatar={message.avatar}
                  name={message.name}
                  online={message.status === 'online'}
                  size={48}
                  tintColor={message.color || colors.tint}
                  borderColor={colors.background}
                />
              )}
            </View>
          </View>
        ) : (
          <View>
            {isGroupConversation ? (
              <GroupAvatar avatars={message.avatars} size={48} membersCount={message.membersCount} />
            ) : (
              <ChatAvatar
                avatar={message.avatar}
                name={message.name}
                online={message.status === 'online'}
                size={48}
                tintColor={message.color || colors.tint}
                borderColor={colors.background}
              />
            )}
          </View>
        )}

        <View style={{ marginLeft: 12, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginRight: isGroupConversation ? 8 : 0 }}>{message.name}</Text>
            {isGroupConversation ? <MaterialIcons name="groups" size={16} color={colors.textSecondary} /> : null}
          </View>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{message.lastMessage}</Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {message.isMuted && (
              <MaterialIcons name="notifications-off" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
            )}
            {message.isPinned && (
              <MaterialIcons name="push-pin" size={12} color={colors.textSecondary} style={{ marginRight: 4, transform: [{ rotate: '45deg' }] }} />
            )}
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{message.time}</Text>
          </View>
          {message.unread && message.unread > 0 ? (
            <View style={{ backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginTop: 8 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{message.unread}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      <MenuModal
        visible={menuVisible}
        menuPos={menuPos}
        onClose={() => setMenuVisible(false)}
        onAction={handleAction}
        items={menuItems}
        message={{
          ...message,
          groupAvatars: message.avatars,
          isGroup: isGroupConversation,
          membersCount: message.membersCount
        } as any}
      />

      <MuteOptionsSheet
        visible={muteVisible}
        onClose={() => setMuteVisible(false)}
        onOpenSettings={() => { setMuteVisible(false); setMuteSettingsVisible(true); }}
        options={['Trong 1 giờ', 'Trong 4 giờ', 'Đến 8 giờ sáng', 'Cho đến khi được mở lại']}
        onSelect={(opt) => { onAction?.('mute', opt); }}
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
