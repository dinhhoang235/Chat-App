import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";

export default function HelpSettings() {
  const theme = useTheme();

  return (
    <SafeAreaView className={`${theme.scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <Header title="Trợ giúp" showBack={true} showSearch={false} />
      <View className="px-4 pt-4">
        <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium mb-2`}>Trợ giúp & Hỗ trợ</Text>
        <Text className={`${theme.scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Hướng dẫn sử dụng, câu hỏi thường gặp và liên hệ hỗ trợ.</Text>
      </View>
    </SafeAreaView>
  );
}
