import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Header } from "../../components/Header";

export default function Contacts() {
  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };

  return (
    <View className="flex-1 bg-white">
      <Header 
        title="Danh bạ" 
        subtitle="Những người liên hệ của bạn"
        showSearch={true}
        onSearch={handleSearch}
        addHref="/new-contact"
        addIconName="person-add"
      />
      <View className="flex-1 items-center justify-center">
        <MaterialIcons name="contacts" color="#ccc" size={60} />
        <Text className="text-gray-400 mt-4">Chưa có danh bạ</Text>
      </View>
    </View>
  );
}
