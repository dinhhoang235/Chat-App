import { FlatList, View, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from 'react';
import { Header, SelectionHeader, BottomActionBar, MessageRow, StartChatModal, EmptyConversations } from '@/components';
import { useAddMenu } from '@/context/addMenuContext';
import { useTabBar } from '@/context/tabBarContext';
import { useConversations } from '@/hooks/useConversations';

export default function Messages() {
  const { toggle, setAddLayout, setHeaderLayout } = useAddMenu();
  const { tabBarHeight } = useTabBar();
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0);
  
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
    handleDeleteSelected,
    handleDeleteConversation,
    handleMute,
    handleUnmute,
    handlePin,
    router,
    colors
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
    console.log('Row action', action, id);
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
          leftAddAction={{ icon: 'qr-code-scanner', onPress: () => console.log('QR pressed'), size: 24 }}
          onAddLayout={(layout) => setAddLayout?.(layout)}
          onHeaderLayout={(layout) => setHeaderLayout?.(layout)}
        />
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
        <BottomActionBar onMarkRead={handleMarkRead} onDelete={handleDeleteSelected} onLayout={(h) => setBottomBarHeight(h)} />
      ) : null}

      <StartChatModal 
        visible={startChatVisible} 
        onClose={() => setStartChatVisible(false)} 
      />
    </SafeAreaView>
  );
}
