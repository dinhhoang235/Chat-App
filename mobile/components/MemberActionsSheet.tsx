import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';
import type { User } from '../services/friendship';
import { getInitials } from '../utils/contacts';
import { API_URL } from '../services/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  member: (User & { role?: string }) | null;
  isOwner?: boolean;
  onPromote?: (id: number) => void;
  onBlock?: (id: number) => void;
  onRemove?: (id: number) => void;
  onViewProfile?: (id: number) => void;
};

export default function MemberActionsSheet({ visible, onClose, member, isOwner, onPromote, onBlock, onRemove, onViewProfile }: Props) {
  const { scheme, colors } = useTheme();
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';
  if (!member) return null;

  const initials = getInitials(member.fullName);
  const avatarUrl = member.avatar ? (member.avatar.startsWith('http') ? member.avatar : `${API_URL}${member.avatar}`) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>

          <View style={{ width: 40, height: 4, backgroundColor: colors.surfaceVariant, alignSelf: 'center', borderRadius: 2, marginBottom: 8 }} />

          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' }}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{initials}</Text>
                )}
              </View>
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: 8 }}>{member.fullName}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
              <TouchableOpacity style={{ alignItems: 'center', marginHorizontal: 18 }} onPress={() => { onViewProfile?.(member.id); onClose(); }}>
                <MaterialIcons name="person" size={22} color={colors.icon} />
                <Text style={{ color: colors.textSecondary, marginTop: 6 }}>Trang cá nhân</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ alignItems: 'center', marginHorizontal: 18 }} onPress={() => { /* mock call */ onClose(); }}>
                <MaterialIcons name="call" size={22} color={colors.icon} />
                <Text style={{ color: colors.textSecondary, marginTop: 6 }}>Gọi</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ alignItems: 'center', marginHorizontal: 18 }} onPress={() => { /* mock chat */ onClose(); }}>
                <MaterialIcons name="chat" size={22} color={colors.icon} />
                <Text style={{ color: colors.textSecondary, marginTop: 6 }}>Nhắn tin</Text>
              </TouchableOpacity>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceVariant, paddingTop: 12 }}>
              {isOwner && member.role !== 'owner' ? (
                <>
                  <TouchableOpacity onPress={() => { onPromote?.(member.id); onClose(); }} style={{ paddingVertical: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>Bổ nhiệm làm phó nhóm</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => { onRemove?.(member.id); onClose(); }} style={{ paddingVertical: 12 }}>
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>Xóa khỏi nhóm</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <TouchableOpacity onPress={() => { onBlock?.(member.id); onClose(); }} style={{ paddingVertical: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Chặn thành viên</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}