import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/themeContext';
import { contacts, messages } from '../constants/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SearchBar from '../components/SearchBar';
import SearchHistory from '../components/SearchHistory';
import ResultsList from '../components/ResultsList';

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
            <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={() => addToHistory(query)}
                onBack={() => router.back()}
                onQR={() => Alert.alert('Quét mã QR', 'Chức năng quét mã QR chưa được triển khai.')}
                colors={colors}
            />

            <View style={{ flex: 1, padding: 12 }}>
                {query.trim().length === 0 ? (
                    history.length > 0 ? (
                        <SearchHistory
                            history={history}
                            onSelect={(h) => { setQuery(h); addToHistory(h); }}
                            onRemove={removeHistoryItem}
                            onClear={clearHistory}
                            colors={colors}
                        />
                    ) : (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ color: colors.textSecondary }}>Bắt đầu nhập để tìm kiếm trong danh bạ và tin nhắn</Text>
                        </View>
                    )
                ) : (
                    <ResultsList
                        contactResults={contactResults}
                        messageResults={messageResults}
                        query={query}
                        sentRequests={sentRequests}
                        onOpenChat={(id) => router.push(`/chat/${id}`)}
                        onOpenProfile={(id) => router.push(`/profile/${id}`)}
                        onSendFriendRequest={(phone) => sendFriendRequest(phone)}
                        colors={colors}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
