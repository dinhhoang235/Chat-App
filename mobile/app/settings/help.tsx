import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";

export default function HelpSettings() {
  const { colors } = useTheme();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Trợ giúp" showBack={true} showSearch={false} />
      <View className="px-4 pt-4">
        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Trợ giúp & Hỗ trợ</Text>
        <Text style={{ color: colors.textSecondary }}>Hướng dẫn sử dụng, câu hỏi thường gặp và liên hệ hỗ trợ.</Text>
      </View>
    </SafeAreaView> 
  );
}
