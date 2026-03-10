import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { API_URL } from '@/services/api';

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

type SearchResult = {
  id: number;
  phone: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  isFriend: boolean;
  source: 'friend' | 'stranger';
  requestStatus?: 'pending' | 'accepted' | 'rejected' | null;
  requestDirection?: 'sent' | 'received' | null;
};

type Props = {
  contactResults: Contact[];
  messageResults: Message[];
  query: string;
  sentRequests: string[];
  searchResultsData?: SearchResult[];
  onOpenChat: (id: string) => void;
  onOpenProfile?: (id: string) => void;
  onSendFriendRequest: (phone: string) => void;
  onAcceptFriendRequest?: (userId: number) => void;
  onRejectFriendRequest?: (userId: number) => void;
  onCancelFriendRequest?: (userId: number) => void;
  colors: any;
};

export default function ResultsList({ contactResults, messageResults, query, sentRequests, searchResultsData = [], onOpenChat, onOpenProfile, onSendFriendRequest, onAcceptFriendRequest, onRejectFriendRequest, onCancelFriendRequest, colors }: Props) {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <View>
      {contactResults.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Liên hệ</Text>
          {contactResults.map((c) => {
            const resultData = searchResultsData.find(r => r.id === parseInt(c.id));
            
            return (
              <TouchableOpacity key={c.id} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => (typeof onOpenProfile === 'function' ? onOpenProfile(c.id) : onOpenChat(c.id))}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' }}>
                    {resultData?.avatar ? (
                      <Image
                        source={{ uri: `${API_URL}${resultData.avatar}` }}
                        style={{ width: 40, height: 40, borderRadius: 20 }}
                      />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{getInitials(c.name)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{c.name}</Text>
                    <Text style={{ color: colors.textSecondary }}>{c.phone}</Text>
                  </View>
                </View>

                {resultData && (
                  <View style={{ marginLeft: 8 }}>
                    {resultData.isFriend ? (
                      <TouchableOpacity onPress={() => onOpenChat(c.id)}>
                        <MaterialIcons name="chat" size={20} color={colors.tint} />
                      </TouchableOpacity>
                    ) : resultData.requestStatus === 'pending' && resultData.requestDirection === 'received' ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => onAcceptFriendRequest?.(resultData.id)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                            backgroundColor: '#2563EB'
                          }}
                        >
                          <Text style={{
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: 12
                          }}>
                            Đồng ý
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => onRejectFriendRequest?.(resultData.id)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border
                          }}
                        >
                          <Text style={{
                            color: colors.textSecondary,
                            fontWeight: '700',
                            fontSize: 12
                          }}>
                            Từ chối
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : resultData.requestStatus === 'pending' && resultData.requestDirection === 'sent' ? (
                      <TouchableOpacity
                        onPress={() => onCancelFriendRequest?.(resultData.id)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border
                        }}
                      >
                        <Text style={{
                          color: colors.textSecondary,
                          fontWeight: '700',
                          fontSize: 12
                        }}>
                          Đã gửi
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => onSendFriendRequest(c.phone || '')}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: '#2563EB'
                        }}
                      >
                        <Text style={{
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: 12
                        }}>
                          Kết bạn
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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

      {contactResults.length === 0 && messageResults.length === 0 && (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Text style={{ color: colors.textSecondary }}>Không tìm thấy kết quả</Text>
        </View>
      )}
    </View>
  );
}
