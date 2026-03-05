import { FlatList, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import SelectionHeader from "../../components/SelectionHeader";
import BottomActionBar from "../../components/BottomActionBar";
import { useTheme } from "../../context/themeContext";
import { useSelection } from "../../context/selectionContext";
import { MessageRow } from '../../components/MessageRow';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAddMenu } from '../../context/addMenuContext';
import { useTabBar } from '../../context/tabBarContext';
import { chatApi } from "../../services/chat";
import { socketService } from "../../services/socket";
import { useAuth } from "../../context/authContext";
import StartChatModal from "../../components/StartChatModal";
import { MaterialIcons } from '@expo/vector-icons';

export default function Messages() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const { selectionMode, setSelectionMode } = useSelection();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toggle, setAddLayout, setHeaderLayout } = useAddMenu();
  const { tabBarHeight } = useTabBar();
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [startChatVisible, setStartChatVisible] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await chatApi.getConversations();
      const mapped = response.data.map((conv: any) => {
        const lastMsg = conv.messages[0];
        const otherParticipant = conv.participants.find((p: any) => p.userId !== user?.id);
        
        return {
          id: conv.id.toString(),
          name: conv.name || otherParticipant?.user.fullName || 'Người dùng Zalo',
          lastMessage: lastMsg?.content || 'Chưa có tin nhắn',
          time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          unread: conv._count?.messages || 0,
          initials: (conv.name || otherParticipant?.user.fullName || 'Z')[0],
          color: conv.isGroup ? colors.tint : (otherParticipant?.user.avatar ? undefined : colors.tint),
          avatar: otherParticipant?.user.avatar,
          isGroup: conv.isGroup
        };
      });
      setData(mapped);
    } catch (err) {
      console.error("Fetch conversations error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, colors.tint]);

  useEffect(() => {
    fetchConversations();

    socketService.on('conversation_updated', () => {
      fetchConversations(); 
    });

    return () => {
      socketService.off('conversation_updated');
    };
  }, [fetchConversations]);

  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };

  const handleFilter = () => {
    console.log("Filter pressed");
  };

  const handleAdd = () => {
    toggle();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRowAction = (action: string, id: string) => {
    if (action === 'select') {
      setSelectionMode(true);
      setSelectedIds([id]);
      return;
    }
    console.log('Row action', action, id);
  };

  const handleSelectAll = () => {
    setSelectedIds(data.map(d => d.id));
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleMarkRead = () => {
    setData((prev) => prev.map(m => selectedIds.includes(m.id) ? { ...m, unread: 0 } : m));
    // keep in selection mode so user can take more actions
  };

  const handleDeleteSelected = () => {
    setData((prev) => prev.filter(m => !selectedIds.includes(m.id)));
    setSelectionMode(false);
    setSelectedIds([]);
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
            onPress={() => setStartChatVisible(true)}
          >
            <MaterialIcons name="add" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Bắt đầu trò chuyện</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageRow
              message={item}
              onPress={() => { if (!selectionMode) router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.name } }); }}
              onAction={(action) => handleRowAction(action, item.id)}
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
