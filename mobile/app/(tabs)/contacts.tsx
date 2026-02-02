import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";

export default function Contacts() {
  const { scheme } = useTheme();

  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };


  return (
    <SafeAreaView className={`${scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
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
        <Text className="text-gray-400 dark:text-gray-400 mt-4">Chưa có danh bạ</Text>
      </View>
    </SafeAreaView>
  );
}
