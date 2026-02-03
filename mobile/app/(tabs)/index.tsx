import { FlatList } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import SelectionHeader from "../../components/SelectionHeader";
import BottomActionBar from "../../components/BottomActionBar";
import { useTheme } from "../../context/themeContext";
import { useSelection } from "../../context/selectionContext";
import { messages as initialMessages } from '../../constants/mockData';
import { MessageRow } from '../../components/MessageRow';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAddMenu } from '../../context/addMenuContext';

export default function Messages() {
  const { colors } = useTheme();
  const router = useRouter();
  const [data, setData] = useState(initialMessages);
  const { selectionMode, setSelectionMode } = useSelection();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toggle, setAddLayout, setHeaderLayout } = useAddMenu();
  const insets = useSafeAreaInsets();

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
          onAddLayout={(layout) => setAddLayout?.(layout)}
          onHeaderLayout={(layout) => setHeaderLayout?.(layout)}
        />
      )}



      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageRow
            message={item}
            onPress={() => { if (!selectionMode) router.push(`/chat/${item.id}`); }}
            onAction={(action) => handleRowAction(action, item.id)}
            selectionMode={selectionMode}
            selected={selectedIds.includes(item.id)}
            onToggleSelect={(id) => toggleSelect(id)}
          />
        )}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: selectionMode ? 92 + insets.bottom : 8 }}
      />

      {selectionMode ? (
        <BottomActionBar onMarkRead={handleMarkRead} onDelete={handleDeleteSelected} />
      ) : null}
    </SafeAreaView>
  );
}
