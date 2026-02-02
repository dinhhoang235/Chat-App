import { View, Text } from "react-native";
import { Header } from "../components/Header";

export default function NewContact() {
  return (
    <View className="flex-1 bg-white">
      <Header title="Thêm liên hệ" showSearch={false} showBack={true} />
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Form thêm liên hệ (mock)</Text>
      </View>
    </View>
  );
}
