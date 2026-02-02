import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearch?: (text: string) => void;
  onFilterPress?: () => void;
  onAddPress?: () => void;
  addIconName?: string;
  addHref?: string;
  showBack?: boolean;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  showSearch = false,
  onSearch,
  onFilterPress,
  onAddPress,
  addIconName = "add",
  addHref,
  showBack = false,
  onBackPress,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) return onBackPress();
    router.back();
  };

  return (
    <SafeAreaView edges={["top"]} className="bg-white px-6 pb-4">
      <View>
        {!showSearch ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {showBack && (
                <TouchableOpacity className="mr-3" onPress={handleBack}>
                  <MaterialIcons name="arrow-back" color="#666" size={28} />
                </TouchableOpacity>
              )}
              <Text className="text-2xl font-bold text-gray-900">{title}</Text>
            </View>
            <View className="flex-row items-center gap-4">
              {onFilterPress && (
                <TouchableOpacity onPress={onFilterPress}>
                  <MaterialIcons name="tune" color="#666" size={28} />
                </TouchableOpacity>
              )}
              {addHref ? (
                <Link href={addHref as any} asChild>
                  <TouchableOpacity>
                    <MaterialIcons name={addIconName as any} color="#666" size={28} />
                  </TouchableOpacity>
                </Link>
              ) : (
                onAddPress && (
                  <TouchableOpacity onPress={onAddPress}>
                    <MaterialIcons name={addIconName as any} color="#666" size={24} />
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        ) : (
          <>
            <View className="flex-row items-center mt-3">
              {showBack && (
                <TouchableOpacity className="mr-3" onPress={handleBack}>
                  <MaterialIcons name="arrow-back" color="#666" size={24} />
                </TouchableOpacity>
              )}

              <View style={{ marginHorizontal: -24, elevation: 1 }} className="flex-row items-center bg-white rounded-lg px-3 py-2 flex-1">
                <MaterialIcons name="search" color="#666" size={24} />
                <TextInput
                  className="flex-1 ml-3 text-gray-900 text-sm"
                  placeholder="Tìm kiếm..."
                  placeholderTextColor="#999"
                  onChangeText={onSearch}
                />
                {addHref ? (
                  <Link href={addHref as any} asChild>
                    <TouchableOpacity className="px-3">
                      <MaterialIcons name={addIconName as any} color="#666" size={24} />
                    </TouchableOpacity>
                  </Link>
                ) : (
                  onAddPress && (
                    <TouchableOpacity className="px-3" onPress={onAddPress}>
                      <MaterialIcons name={addIconName as any} color="#666" size={24} />
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};
