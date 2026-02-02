import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { messages } from '../../constants/mockData';
import { MessageRow } from '../../components/MessageRow';

export default function Messages() {
  const { scheme } = useTheme();

  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };

  const handleFilter = () => {
    console.log("Filter pressed");
  };

  const handleAdd = () => {
    console.log("Add pressed");
  };

  return (
    <SafeAreaView className={`${scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <Header 
        title="Tin nhắn" 
        subtitle="Cuộc trò chuyện của bạn"
        showSearch={true}
        onSearch={handleSearch}
        onFilterPress={handleFilter}
        onAddPress={handleAdd}
      />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageRow message={item} onPress={() => {}} />}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
    </SafeAreaView>
  );
}
