import { View, Text } from "react-native";
import { Header } from "../components/Header";
import { useTheme } from "../context/themeContext";

export default function NewContact() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Thêm liên hệ" showSearch={false} showBack={true} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Form thêm liên hệ (mock)</Text>
      </View>
    </View>
  );
} 
