import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { API_URL } from '../services/api';

type SearchUser = {
  id: number;
  fullName: string;
  phone: string;
  avatar?: string;
};

type Props = {
  history: SearchUser[];
  onSelect: (user: SearchUser) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  colors: any;
};

export default function SearchHistory({ history, onSelect, onRemove, onClear, colors }: Props) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Lịch sử tìm kiếm</Text>
        <TouchableOpacity onPress={onClear} style={{ padding: 4 }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Xóa tất cả</Text>
        </TouchableOpacity>
      </View>

      {history.map((user) => (
        <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
          <TouchableOpacity 
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} 
            onPress={() => onSelect(user)}
          >
            {user.avatar ? (
              <Image 
                source={{ uri: user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}` }} 
                style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} 
              />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, marginRight: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{getInitials(user.fullName)}</Text>
              </View>
            )}
            <View>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{user.fullName}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{user.phone}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onRemove(user.id)} style={{ padding: 8 }}>
            <MaterialIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
