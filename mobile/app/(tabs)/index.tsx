import { FlatList, View, ActivityIndicator, Alert, Animated, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from 'react';
import { Header, SelectionHeader, BottomActionBar, MessageRow, StartChatModal, EmptyConversations } from '@/components';
import { useAddMenu } from '@/context/addMenuContext';
import { useTabBar } from '@/context/tabBarContext';
import { useConversations } from '@/hooks/useConversations';
import { useSocketStatus } from '@/hooks/useSocketStatus';
import { useTheme } from '@/context/themeContext';

export default function Messages() {
  const { toggle, setAddLayout, setHeaderLayout } = useAddMenu();
  const { tabBarHeight } = useTabBar();
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0);
  
  const { scheme, colors } = useTheme();
  const { isConnected } = useSocketStatus();
  const [showStatus, setShowStatus] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusColor, setStatusColor] = useState("");
  const [textColor, setTextColor] = useState("#fff");
  const lastConnected = useRef(isConnected);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isConnected) {
      // Disconnected
      setStatusText("Không có kết nối");
      setStatusColor(scheme === 'dark' ? '#333' : '#F1F5F9'); 
      setTextColor(scheme === 'dark' ? '#fff' : '#64748B');
      setShowStatus(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else if (isConnected && !lastConnected.current) {
      // Reconnected
      setStatusText("Đã kết nối");
      setStatusColor(colors.success); 
      setTextColor("#fff");
      setShowStatus(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => setShowStatus(false));
      }, 2000);
      return () => clearTimeout(timer);
    }
    lastConnected.current = isConnected;
  }, [isConnected, fadeAnim, scheme, colors.success]);

  const {
    data,
    setData,
    loading,
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    startChatVisible,
    setStartChatVisible,
    toggleSelect,
    handleSelectAll,
    handleCancelSelection,
    handleMarkRead,
    handleMarkReadSingle,
    handleDeleteSelected,
    handleDeleteConversation,
    handleMute,
    handleUnmute,
    handlePin,
    handleMarkUnread,
    router
  } = useConversations();

  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };

  const handleFilter = () => {
    console.log("Filter pressed");
  };

  const handleAdd = () => {
    toggle();
  };

  const handleRowAction = (action: string, id: string, payload?: any) => {
    if (action === 'mark_unread') {
      handleMarkUnread(id);
      return;
    }
    if (action === 'mark_read') {
      handleMarkReadSingle(id);
      return;
    }
    if (action === 'select') {
      setSelectionMode(true);
      setSelectedIds([id]);
      return;
    }
    if (action === 'mute') {
      handleMute(id, payload);
      return;
    }
    if (action === 'unmute') {
      handleUnmute(id);
      return;
    }
    if (action === 'pin') {
      const conv = data.find((m: any) => m.id === id);
      if (conv) {
        handlePin(id, !conv.isPinned);
      }
      return;
    }
    if (action === 'delete') {
      Alert.alert(
        'Xóa cuộc trò chuyện',
        'Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa', style: 'destructive', onPress: () => handleDeleteConversation(id) }
        ]
      );
      return;
    }
  };

  const handleDeleteBulk = () => {
    if (selectedIds.length === 0) return;
    
    Alert.alert(
      'Xóa cuộc trò chuyện',
      `Bạn có chắc chắn muốn xóa ${selectedIds.length} cuộc trò chuyện đã chọn? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => handleDeleteSelected() }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {selectionMode ? (
        <SelectionHeader count={selectedIds.length} onCancel={handleCancelSelection} onSelectAll={handleSelectAll} />
      ) : (
        <Header 
          title="Tin nhắn" 
          subtitle="Cuộc trò chuyện của bạn"
          showSearch={true}
          onSearch={handleSearch}
          onFilterPress={handleFilter}
          onAddPress={handleAdd}
          onAddLayout={(layout) => setAddLayout?.(layout)}
          onHeaderLayout={(layout) => setHeaderLayout?.(layout)}
        />
      )}

      {showStatus && (
        <Animated.View 
          style={{ 
            height: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 28]
            }),
            backgroundColor: statusColor, 
            justifyContent: 'center', 
            alignItems: 'center',
            overflow: 'hidden',
            opacity: fadeAnim,
          }}
        >
          <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>{statusText}</Text>
        </Animated.View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : data.length === 0 ? (
        <EmptyConversations colors={colors} onPress={() => setStartChatVisible(true)} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageRow
              message={item}
              onPress={() => { 
                if (!selectionMode) {
                  // Optimistically clear unread count
                  setData(prev => prev.map(m => m.id === item.id ? { ...m, unread: 0 } : m));
                  
                  router.push({ 
                    pathname: '/chat/[id]', 
                    params: { 
                      id: item.id, 
                      name: item.name,
                      targetUserId: item.targetUserId,
                      avatar: item.avatar,
                      isGroup: item.isGroup ? 'true' : 'false',
                      membersCount: item.membersCount,
                      avatars: Array.isArray(item.avatars) ? item.avatars.join(',') : (item.avatars || '')
                    } 
                  }); 
                } 
              }}
              onAction={(action, payload) => handleRowAction(action, item.id, payload)}
              selectionMode={selectionMode}
              selected={selectedIds.includes(item.id)}
              onToggleSelect={(id) => toggleSelect(id)}
            />
          )}
          // padding bottom is dynamic: when selection mode, use measured bottom bar height; otherwise use tab bar height
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: selectionMode ? (Math.max(bottomBarHeight, 56) + 8) : (tabBarHeight + 8) }}
        />
      )}

      {selectionMode ? (
        <BottomActionBar onMarkRead={handleMarkRead} onDelete={handleDeleteBulk} onLayout={(h) => setBottomBarHeight(h)} />
      ) : null}

      <StartChatModal 
        visible={startChatVisible} 
        onClose={() => setStartChatVisible(false)} 
      />
    </SafeAreaView>
  );
}
