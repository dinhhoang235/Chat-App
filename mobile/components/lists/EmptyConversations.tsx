import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  colors: any;
  onPress: () => void;
};

const EmptyConversations = ({ colors, onPress }: Props) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
    <MaterialIcons name="chat-bubble-outline" size={80} color={colors.textSecondary} />
    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
      Chưa có cuộc trò chuyện nào
    </Text>
    <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center', marginBottom: 24 }}>
      Hãy bắt đầu trò chuyện với bạn bè của bạn ngay bây giờ
    </Text>
    <TouchableOpacity 
      style={{ 
        backgroundColor: colors.tint, 
        paddingHorizontal: 32, 
        paddingVertical: 14, 
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center'
      }}
      onPress={onPress}
    >
      <MaterialIcons name="add" size={24} color="#fff" style={{ marginRight: 8 }} />
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Bắt đầu trò chuyện</Text>
    </TouchableOpacity>
  </View>
);

export default EmptyConversations;
