import { FlatList, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import SelectionHeader from "../../components/SelectionHeader";
import BottomActionBar from "../../components/BottomActionBar";
import { MessageRow } from '../../components/MessageRow';
import { useState } from 'react';
import { useAddMenu } from '../../context/addMenuContext';
import { useTabBar } from '../../context/tabBarContext';
import StartChatModal from "../../components/StartChatModal";
import { useConversations } from "../../hooks/useConversations";
import { EmptyConversations } from "../../components/EmptyConversations";

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

  const handleRowAction = (action: string, id: string) => {
    if (action === 'select') {
      setSelectionMode(true);
      setSelectedIds([id]);
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
              onAction={(action) => {
                if (action === 'select') {
                  setSelectionMode(true);
                  setSelectedIds([item.id]);
                }
                console.log('Row action', action, item.id);
              }}
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
