import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/themeContext';
import { SearchBar, SearchHistory, ResultsList } from '@/components';
import ScannerModal from '@/components/modals/ScannerModal';
import { useProfileScanner } from '@/hooks/useProfileScanner';
import { userAPI } from '@/services/user';
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest } from '@/services/friendship';

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

export default function GlobalSearch() {
    const { colors } = useTheme();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const { scannerVisible, openScanner, closeScanner, handleScan } = useProfileScanner();
    const [history, setHistory] = useState<any[]>([]);

    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchCache, setSearchCache] = useState<Record<string, SearchResult[]>>({});

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const response = await userAPI.getSearchHistoryDB();
            if (response.success) {
                setHistory(response.data);
            }
        } catch (e) {
            console.error('Failed to load search history from DB', e);
        }
    };

    const removeHistoryItem = async (searchedUserId: number) => {
        // Optimistic UI: Xóa ngay trên giao diện trước khi đợi server phản hồi
        const previousHistory = [...history];
        setHistory((prev) => prev.filter((x) => x.id !== searchedUserId));

        try {
            await userAPI.removeSearchHistoryDB(searchedUserId);
        } catch (e) {
            // Nếu lỗi thì hoàn tác lại danh sách cũ
            setHistory(previousHistory);
            console.error('Failed to remove history item', e);
        }
    };

    const clearHistory = async () => {
        const previousHistory = [...history];
        setHistory([]);

        try {
            await userAPI.clearSearchHistoryDB();
        } catch (e) {
            setHistory(previousHistory);
            console.error('Failed to clear history', e);
        }
    };

    const handleOpenProfile = async (id: string) => {
        try {
            // Không đợi API xong mới chuyển trang để tránh lag UI
            userAPI.saveSearchHistoryDB(parseInt(id)).catch(e => {
                console.error('Failed to save search history:', e);
            });
        } catch {}
        router.push(`/profile/${id}`);
    };

    // Perform search when query changes
    useEffect(() => {
        const performSearch = async () => {
            if (!query.trim()) {
                setSearchResults([]);
                setSearchError(null);
                return;
            }

            // Check cache first
            const cacheKey = query.trim().toLowerCase();
            if (searchCache[cacheKey]) {
                setSearchResults(searchCache[cacheKey]);
                setSearchError(null);
                return;
            }

            setIsLoading(true);
            setSearchError(null);

            try {
                const response = await userAPI.searchUsers(query);
                const results = response.data || [];
                setSearchResults(results);
                
                // Cache the results
                setSearchCache((prev) => ({
                    ...prev,
                    [cacheKey]: results
                }));
            } catch (error) {
                console.error('Search error:', error);
                setSearchError('Không thể thực hiện tìm kiếm');
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(performSearch, 300);
        return () => clearTimeout(debounceTimer);
    }, [query, searchCache]);

    // Refresh search results when screen regains focus to update friendship status
    useFocusEffect(
        useCallback(() => {
            if (!query.trim()) {
                loadHistory();
            } else {
                const refreshResults = async () => {
                    try {
                        const response = await userAPI.searchUsers(query);
                        setSearchResults(response.data || []);
                        
                        // Update cache as well
                        const cacheKey = query.trim().toLowerCase();
                        setSearchCache((prev) => ({
                            ...prev,
                            [cacheKey]: response.data || []
                        }));
                    } catch (error) {
                        console.error('Failed to refresh search results:', error);
                    }
                };
                refreshResults();
            }
        }, [query])
    );

    const contactResults = useMemo(() => {
        return searchResults.map((result) => ({
            id: String(result.id),
            name: result.fullName,
            phone: result.phone,
        }));
    }, [searchResults]);

    const handleSendFriendRequest = async (userId: number) => {
        try {
            setIsLoading(true);
            await sendFriendRequest(userId);
            
            // Update searchResults to reflect pending status
            setSearchResults((prev) => 
                prev.map((result) => 
                    result.id === userId ? { ...result, requestStatus: 'pending', requestDirection: 'sent' } : result
                )
            );

            Alert.alert('Yêu cầu kết bạn', 'Yêu cầu kết bạn đã được gửi thành công');
        } catch (error) {
            console.error('Failed to send friend request:', error);
            Alert.alert('Lỗi', 'Không thể gửi yêu cầu kết bạn');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptFriendRequest = async (userId: number) => {
        try {
            setIsLoading(true);
            await acceptFriendRequest(userId);
            
            // Update searchResults to reflect accepted status
            setSearchResults((prev) => 
                prev.map((result) => 
                    result.id === userId ? { ...result, isFriend: true, requestStatus: 'accepted' } : result
                )
            );

            Alert.alert('Đã chấp nhận', 'Bạn đã chấp nhận yêu cầu kết bạn');
        } catch (error) {
            console.error('Failed to accept friend request:', error);
            Alert.alert('Lỗi', 'Không thể chấp nhận yêu cầu kết bạn');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectFriendRequest = async (userId: number) => {
        try {
            setIsLoading(true);
            await rejectFriendRequest(userId);
            
            // Update searchResults to reflect rejected status
            setSearchResults((prev) => 
                prev.map((result) => 
                    result.id === userId ? { ...result, requestStatus: 'rejected', requestDirection: null } : result
                )
            );

            Alert.alert('Đã từ chối', 'Bạn đã từ chối yêu cầu kết bạn');
        } catch (error) {
            console.error('Failed to reject friend request:', error);
            Alert.alert('Lỗi', 'Không thể từ chối yêu cầu kết bạn');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelFriendRequest = async (userId: number) => {
        try {
            setIsLoading(true);
            await cancelFriendRequest(userId);
            
            // Update searchResults to reflect cancelled status
            setSearchResults((prev) => 
                prev.map((result) => 
                    result.id === userId ? { ...result, requestStatus: null, requestDirection: null } : result
                )
            );

            Alert.alert('Đã hủy', 'Bạn đã hủy yêu cầu kết bạn');
        } catch (error) {
            console.error('Failed to cancel friend request:', error);
            Alert.alert('Lỗi', 'Không thể hủy yêu cầu kết bạn');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={() => {}}
                onBack={() => router.back()}
                onQR={openScanner}
                colors={colors}
            />

            <View style={{ flex: 1, padding: 12 }}>
                {query.trim().length === 0 ? (
                    history.length > 0 ? (
                        <SearchHistory
                            history={history}
                            onSelect={(user) => { handleOpenProfile(String(user.id)); }}
                            onRemove={removeHistoryItem}
                            onClear={clearHistory}
                            colors={colors}
                        />
                    ) : (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ color: colors.textSecondary }}>Bắt đầu nhập để tìm kiếm bạn bè</Text>
                        </View>
                    )
                ) : (
                    <>
                        {isLoading && (
                            <View style={{ alignItems: 'center', marginTop: 20 }}>
                                <Text style={{ color: colors.textSecondary }}>Đang tìm kiếm...</Text>
                            </View>
                        )}
                        
                        {searchError && (
                            <View style={{ alignItems: 'center', marginTop: 20 }}>
                                <Text style={{ color: '#ef4444' }}>{searchError}</Text>
                            </View>
                        )}

                        {!isLoading && !searchError && contactResults.length === 0 && (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Text style={{ color: colors.textSecondary }}>Không tìm thấy kết quả</Text>
                            </View>
                        )}

                        {!isLoading && !searchError && contactResults.length > 0 && (
                            <ResultsList
                                contactResults={contactResults}
                                messageResults={[]}
                                query={query}
                                sentRequests={[]}
                                searchResultsData={searchResults}
                                onOpenChat={(id) => router.push(`/chat/${id}`)}
                                onOpenProfile={handleOpenProfile}
                                onSendFriendRequest={(phone) => {
                                    const result = searchResults.find(r => r.phone === phone);
                                    if (result) {
                                        handleSendFriendRequest(result.id);
                                    }
                                }}
                                onAcceptFriendRequest={handleAcceptFriendRequest}
                                onRejectFriendRequest={handleRejectFriendRequest}
                                onCancelFriendRequest={handleCancelFriendRequest}
                                colors={colors}
                            />
                        )}
                    </>
                )}
            </View>
            <ScannerModal 
                visible={scannerVisible} 
                onClose={closeScanner} 
                onScan={handleScan} 
            />
        </SafeAreaView>
    );
}
