import { View, Text } from "react-native";
import { Header } from "../components/Header";

export default function NewContact() {
  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <Header title="Thêm liên hệ" showSearch={false} showBack={true} />
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500 dark:text-gray-400">Form thêm liên hệ (mock)</Text>
      </View>
    </View>
  );
}
