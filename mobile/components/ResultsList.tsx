import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type Contact = {
  id: string;
  name: string;
  phone?: string;
};

type Message = {
  id: string;
  lastMessage: string;
  time: string;
};

type Props = {
  contactResults: Contact[];
  messageResults: Message[];
  query: string;
  sentRequests: string[];
  onOpenChat: (id: string) => void;
  onSendFriendRequest: (phone: string) => void;
  colors: any;
};

export default function ResultsList({ contactResults, messageResults, query, sentRequests, onOpenChat, onSendFriendRequest, colors }: Props) {
  const normalizedDigits = query.replace(/\D/g, '');
  const isPhoneQuery = normalizedDigits.length >= 3;
  const noContactMatch = isPhoneQuery && contactResults.length === 0;

  return (
    <View>
      {contactResults.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Liên hệ</Text>
          {contactResults.map((c) => (
            <TouchableOpacity key={c.id} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => onOpenChat(c.id)}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{c.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{c.name}</Text>
                <Text style={{ color: colors.textSecondary }}>{c.phone}</Text>
              </View>
              <MaterialIcons name="call" size={20} color={colors.tint} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {noContactMatch && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Tìm bạn qua số điện thoại</Text>

          <View style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{query.charAt(query.length - 1)}</Text>
              </View>
              <View style={{ maxWidth: 200 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Người dùng</Text>
                <Text style={{ color: colors.textSecondary }}>Số điện thoại: {query}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => onOpenChat(normalizedDigits)} style={{ paddingHorizontal: 8 }}>
                <MaterialIcons name="chat" size={20} color={colors.tint} />
              </TouchableOpacity>

              {sentRequests.includes(normalizedDigits) ? (
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Đã gửi</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => onSendFriendRequest(query)} style={{ paddingHorizontal: 8 }}>
                  <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Kết bạn</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {messageResults.length > 0 && (
        <View>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Tin nhắn</Text>
          {messageResults.map((m) => (
            <TouchableOpacity key={m.id} style={{ paddingVertical: 10 }} onPress={() => onOpenChat(m.id)}>
              <Text style={{ color: colors.text }}>{m.lastMessage}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{m.time}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {contactResults.length === 0 && messageResults.length === 0 && !noContactMatch && (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ color: colors.textSecondary }}>Không tìm thấy kết quả</Text>
        </View>
      )}
    </View>
  );
}
