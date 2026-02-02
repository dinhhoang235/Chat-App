import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Header } from "../../components/Header";

export default function Messages() {
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
    <View className="flex-1 bg-white">
      <Header 
        title="Tin nhắn" 
        subtitle="Cuộc trò chuyện của bạn"
        showSearch={true}
        onSearch={handleSearch}
        onFilterPress={handleFilter}
        onAddPress={handleAdd}
      />

      <View className="flex-1 items-center justify-center px-6">
        <MaterialIcons name="mail-outline" color="#ccc" size={60} />
        <Text className="text-gray-400 mt-4">Chưa có cuộc trò chuyện nào</Text>
        <Text className="text-gray-400 text-sm mt-2">Bắt đầu một cuộc trò chuyện mới</Text>
      </View>
    </View>
  );
}
