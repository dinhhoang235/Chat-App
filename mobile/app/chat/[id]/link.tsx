import React from 'react';
import { View, Text, Image, TouchableOpacity, Alert, Share } from 'react-native';
import { useTheme } from '../../../context/themeContext';
import { Header } from '../../../components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { contacts } from '../../../constants/mockData';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export default function GroupLink() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = (params as any).id as string;
  const contact = contacts.find(c => c.id === id);
  const name = contact?.name ?? 'Nhóm';
  const link = contact && (contact as any).groupLink ? (contact as any).groupLink : `https://zalo.me/g/${id}`;
  const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`;

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(link);
      Alert.alert('Sao chép', 'Đã sao chép link vào bộ nhớ tạm.');
    } catch {
      Alert.alert('Sao chép', 'Không thể sao chép link.');
    }
  };

  const shareLink = async () => {
    try {
      await Share.share({ message: `${name} — ${link}` });
    } catch {
      Alert.alert('Chia sẻ', 'Không thể chia sẻ link.');
    }
  };

  const saveQr = async () => {
    try {
      const filename = `${(FileSystem as any).documentDirectory}qr-${id}.png`;
      const { uri } = await (FileSystem as any).downloadAsync(qrUri, filename);

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Lưu QR', 'Cần quyền truy cập ảnh để lưu QR.');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Lưu QR', 'Đã lưu mã QR vào thư viện ảnh.');
    } catch {
      Alert.alert('Lưu QR', 'Không thể lưu mã QR.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Link nhóm" subtitle={name} showBack onBackPress={() => router.back()} />

      <View style={{ alignItems: 'center', padding: 24 }}>
        <View style={{ width: 220, height: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface }}>
          <Image source={{ uri: qrUri }} style={{ width: 220, height: 220 }} resizeMode="cover" />
        </View>

        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 16 }}>{link}</Text>

        <View style={{ flexDirection: 'row', marginTop: 18 }}>
          <TouchableOpacity onPress={copyLink} style={{ padding: 12, alignItems: 'center' }}>
            <MaterialIcons name="content-copy" size={22} color={colors.tint} />
            <Text style={{ color: colors.tint, marginTop: 6 }}>Sao chép link</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={shareLink} style={{ padding: 12, alignItems: 'center', marginLeft: 16 }}>
            <MaterialIcons name="share" size={22} color={colors.tint} />
            <Text style={{ color: colors.tint, marginTop: 6 }}>Chia sẻ</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={saveQr} style={{ padding: 12, alignItems: 'center', marginLeft: 16 }}>
            <MaterialIcons name="save" size={22} color={colors.tint} />
            <Text style={{ color: colors.tint, marginTop: 6 }}>Lưu mã QR</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.textSecondary, marginTop: 18, textAlign: 'center', paddingHorizontal: 24 }}>Bạn có thể chia sẻ hoặc lưu mã QR để mời thành viên khác tham gia nhóm.</Text>
      </View>
    </SafeAreaView>
  );
}
