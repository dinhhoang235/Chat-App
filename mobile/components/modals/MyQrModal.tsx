import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { getInitials } from '@/utils/initials';
import { getAvatarUrl } from '@/utils/avatar';

type Props = {
  visible: boolean;
  onClose: () => void;
  name?: string;
  phone?: string;
  avatarUri?: string;
  data?: string; // data encoded in QR
};

export default function MyQrModal({ visible, onClose, name, phone, avatarUri, data }: Props) {
  const { scheme, colors } = useTheme();
  const rowBg = colors.surface;
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';

  const qrUri = data ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(data)}` : 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=chatapp';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: overlayColor }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: rowBg }}>

            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>

              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Mã QR của tôi</Text>

              <View style={{ width: 24 }} />
            </View>

            <View style={{ alignItems: 'center', padding: 18 }}>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                {avatarUri && getAvatarUrl(avatarUri) ? (
                  <Image source={{ uri: getAvatarUrl(avatarUri) || undefined }} style={{ width: 60, height: 60, borderRadius: 30, marginBottom: 6 }} />
                ) : (
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Text style={{ color: colors.textSecondary }}>{getInitials(name)}</Text>
                  </View>
                )}

                <Text style={{ color: colors.text, fontWeight: '700' }}>{name ?? 'Người dùng'}</Text>
                {phone ? <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{phone}</Text> : null}
              </View>

              <View style={{ marginTop: 12, backgroundColor: '#fff', padding: 12, borderRadius: 12 }}> 
                <Image source={{ uri: qrUri }} style={{ width: 260, height: 260 }} />
              </View>

              <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'space-around', width: '80%' }}>
                <TouchableOpacity onPress={() => { /* placeholder share */ }} style={{ alignItems: 'center' }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="share" size={22} color={colors.text} />
                  </View>
                  <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Chia sẻ</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { /* placeholder download */ }} style={{ alignItems: 'center' }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="file-download" size={22} color={colors.text} />
                  </View>
                  <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Tải xuống</Text>
                </TouchableOpacity>
              </View>

            </View>

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
