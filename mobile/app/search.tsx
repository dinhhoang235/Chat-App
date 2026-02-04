import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/themeContext';
import { contacts, messages } from '../constants/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GlobalSearch() {
    const { colors } = useTheme();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const HISTORY_KEY = '@search_history';

    const [sentRequests, setSentRequests] = useState<string[]>([]);
    const SENT_KEY = '@sent_friend_requests';

    useEffect(() => {
        loadHistory();
        loadSentRequests();
    }, []);

    const loadHistory = async () => {
        try {
            const raw = await AsyncStorage.getItem(HISTORY_KEY);
            if (raw) setHistory(JSON.parse(raw));
        } catch (e) {
            console.warn('Failed to load search history', e);
        }
    };

    const loadSentRequests = async () => {
        try {
            const raw = await AsyncStorage.getItem(SENT_KEY);
            if (raw) setSentRequests(JSON.parse(raw));
        } catch (e) {
            console.warn('Failed to load sent friend requests', e);
        }
    };

    const saveHistory = async (arr: string[]) => {
        try {
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
        } catch (e) {
            console.warn('Failed to save search history', e);
        }
    };

    const saveSentRequests = async (arr: string[]) => {
        try {
            await AsyncStorage.setItem(SENT_KEY, JSON.stringify(arr));
        } catch (e) {
            console.warn('Failed to save sent friend requests', e);
        }
    };

    const addToHistory = async (q: string) => {
        const t = q.trim();
        if (!t) return;
        setHistory((prev) => {
            const next = [t, ...prev.filter((x) => x !== t)].slice(0, 10);
            saveHistory(next);
            return next;
        });
    };

    const removeHistoryItem = async (item: string) => {
        setHistory((prev) => {
            const next = prev.filter((x) => x !== item);
            saveHistory(next);
            return next;
        });
    };

    const clearHistory = async () => {
        setHistory([]);
        try {
            await AsyncStorage.removeItem(HISTORY_KEY);
        } catch (e) {
            console.warn('Failed to clear history', e);
        }
    };

    const contactResults = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        const normalizedDigits = query.replace(/\D/g, '');
        const isPhoneQuery = normalizedDigits.length >= 3; // require at least 3 digits to avoid accidental matches

        const results = contacts.filter((c) => {
            const nameMatch = c.name.toLowerCase().includes(q);
            const phone = (c.phone || '').replace(/\D/g, '');
            const phoneMatch = isPhoneQuery && phone.includes(normalizedDigits);
            return nameMatch || phoneMatch;
        });

        // prefer exact phone matches/phone matches first
        results.sort((a, b) => {
            const aPhone = (a.phone || '').replace(/\D/g, '');
            const bPhone = (b.phone || '').replace(/\D/g, '');
            const aPhoneMatch = isPhoneQuery && aPhone.includes(normalizedDigits) ? 1 : 0;
            const bPhoneMatch = isPhoneQuery && bPhone.includes(normalizedDigits) ? 1 : 0;
            return bPhoneMatch - aPhoneMatch;
        });

        return results;
    }, [query]);

    const messageResults = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return messages.filter((m) => (m.lastMessage || '').toLowerCase().includes(q));
    }, [query]);

    const sendFriendRequest = async (phone: string) => {
        // Placeholder: in a real app this would call your backend API.
        // For now show a confirmation Alert and mark the phone as requested (no navigation).
        try {
            const normalized = phone.replace(/\D/g, '');
            if (normalized) {
                setSentRequests((prev) => {
                    const next = [normalized, ...prev.filter((x) => x !== normalized)].slice(0, 50);
                    saveSentRequests(next);
                    return next;
                });
            }

            Alert.alert('Yêu cầu kết bạn', 'Yêu cầu kết bạn đã được gửi tới ' + phone);
        } catch (e) {
            console.warn('Failed to send friend request', e);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 8 }}>
                        <MaterialIcons name="arrow-back" color={colors.text} size={24} />
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginLeft: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12, height: 40 }}>
                            <MaterialIcons name="search" color={colors.textSecondary} size={20} />

                            <TextInput
                                placeholder="Tìm kiếm..."
                                placeholderTextColor={colors.textSecondary}
                                value={query}
                                onChangeText={setQuery}
                                onSubmitEditing={() => addToHistory(query)}
                                style={{ flex: 1, color: colors.text, fontSize: 14, marginLeft: 10 }}
                                autoFocus
                                autoCapitalize="none"
                                autoCorrect={false}
                                spellCheck={false}
                            />


                        </View>
                    </View>
                    <TouchableOpacity onPress={() => Alert.alert('Quét mã QR', 'Chức năng quét mã QR chưa được triển khai.')} style={{ paddingLeft: 8 }}>
                        <MaterialIcons name="qr-code-scanner" color={colors.textSecondary} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1, padding: 12 }}>
                {query.trim().length === 0 ? (
                    history.length > 0 ? (
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ color: colors.text, fontWeight: '700' }}>Lịch sử tìm kiếm</Text>
                                <TouchableOpacity onPress={clearHistory} style={{ padding: 8 }}>
                                    <MaterialIcons name="delete" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {history.map((h) => (
                                <View key={h} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                                    <TouchableOpacity style={{ flex: 1 }} onPress={() => { setQuery(h); addToHistory(h); }}>
                                        <Text style={{ color: colors.text }}>{h}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => removeHistoryItem(h)} style={{ paddingLeft: 12 }}>
                                        <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ color: colors.textSecondary }}>Bắt đầu nhập để tìm kiếm trong danh bạ và tin nhắn</Text>
                        </View>
                    )
                ) : (
                    <FlatList
                        data={[{ title: 'Contacts', data: contactResults }, { title: 'Messages', data: messageResults }]}
                        keyExtractor={(item, idx) => item.title ? item.title : String(idx)}
                        renderItem={({ item }) => null}
                        ListHeaderComponent={() => (
                            <>
                                {contactResults.length > 0 && (
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Liên hệ</Text>
                                        {contactResults.map((c) => (
                                            <TouchableOpacity key={c.id} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push(`/chat/${c.id}`)}>
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

                                {/* If the user typed a phone-like query and no contact matched, offer to chat or add contact */}
                                {(() => {
                                    const normalizedDigits = query.replace(/\D/g, '');
                                    const isPhoneQuery = normalizedDigits.length >= 3;
                                    const noContactMatch = isPhoneQuery && contactResults.length === 0;
                                    if (noContactMatch) {
                                        return (
                                            <View style={{ marginBottom: 16 }}>
                                                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Tìm bạn qua số điện thoại</Text>

                                                <View style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                            <Text style={{ color: '#fff', fontWeight: '700' }}>{query.charAt(query.length - 1)}</Text>
                                                        </View>
                                                        <View style={{ maxWidth: 200 }}>
                                                            <Text style={{ color: colors.text, fontWeight: '600' }}>{/* unknown name */}Người dùng</Text>
                                                            <Text style={{ color: colors.textSecondary }}>Số điện thoại: {query}</Text>
                                                        </View>
                                                    </View>

                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <TouchableOpacity onPress={() => router.push(`/chat/${normalizedDigits}`)} style={{ paddingHorizontal: 8 }}>
                                                            <MaterialIcons name="chat" size={20} color={colors.tint} />
                                                        </TouchableOpacity>

                                                        {sentRequests.includes(normalizedDigits) ? (
                                                            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                                                                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Đã gửi</Text>
                                                            </View>
                                                        ) : (
                                                            <TouchableOpacity onPress={async () => { try { await sendFriendRequest(query); } catch (e) { console.warn(e); } }} style={{ paddingHorizontal: 8 }}>
                                                                <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                                                                    <Text style={{ color: '#fff', fontWeight: '700' }}>Kết bạn</Text>
                                                                </View>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    }
                                    return null;
                                })()}

                                {messageResults.length > 0 && (
                                    <View>
                                        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Tin nhắn</Text>
                                        {messageResults.map((m) => (
                                            <TouchableOpacity key={m.id} style={{ paddingVertical: 10 }} onPress={() => router.push(`/chat/${m.id}`)}>
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
                            </>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
