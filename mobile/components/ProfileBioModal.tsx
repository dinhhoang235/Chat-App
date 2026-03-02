import React from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';
import { useAuth } from '../context/authContext';
import { userAPI } from '../services/user';


type Props = {
  visible: boolean;
  onClose: () => void;
  initialValue?: string;
  onSave?: (value: string, share: boolean) => void;
};

export default function ProfileBioModal({ visible, onClose, initialValue = '', onSave }: Props) {
  const { scheme, colors } = useTheme();
  const { user, updateProfile } = useAuth();
  const rowBg = colors.surface;
  const [value, setValue] = React.useState(initialValue);
  const [share, setShare] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const maxLen = 100;

  React.useEffect(() => {
    if (visible) {
      setValue(initialValue ?? '');
      setShare(false);
    }
  }, [visible, initialValue]);

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Lỗi', 'Không thể lưu bio');
      return;
    }

    setLoading(true);
    try {
      await userAPI.updateUser(user.id, { bio: value.trim() });
      updateProfile({ bio: value.trim() });
      onSave?.(value.trim(), share);
      onClose();
    } catch (error) {
      console.error('Failed to update bio:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật bio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: rowBg }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={onClose} disabled={loading}>
                <MaterialIcons name="close" size={24} color={loading ? colors.textSecondary : colors.text} />
              </TouchableOpacity>

              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Chỉnh sửa lời giới thiệu</Text>

              <TouchableOpacity onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <Text style={{ color: colors.tint, fontWeight: '700' }}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <TextInput
                value={value}
                onChangeText={(t) => setValue(t.slice(0, maxLen))}
                placeholder="Thêm lời giới thiệu của bạn"
                placeholderTextColor={colors.textSecondary}
                multiline
                style={{ color: colors.text, minHeight: 120, textAlignVertical: 'top', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 }}
                maxLength={maxLen}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                <Text style={{ color: colors.textSecondary }}>{`${value.length}/${maxLen}`}</Text>
              </View>

            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
