import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../context/themeContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearch?: (text: string) => void;
  onFilterPress?: () => void;
  rightActions?: { icon: string; onPress?: () => void; size?: number }[];
  onAddPress?: () => void;
  addIconName?: string;
  addHref?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  variant?: "light" | "dark";
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  showSearch = false,
  onSearch,
  onFilterPress,
  rightActions,
  onAddPress,
  addIconName = "add",
  addHref,
  showBack = false,
  onBackPress,
  variant,
}) => {
  const router = useRouter();
  const theme = useTheme();
  const isDark = variant === "dark" ? true : variant === "light" ? false : theme.scheme === "dark";

  const handleBack = () => {
    if (onBackPress) return onBackPress();
    router.back();
  };

  const iconColor = isDark ? "#fff" : "#666";
  const titleClass = isDark ? "text-2xl font-bold text-white" : "text-2xl font-bold text-gray-900";

  return (
    <View className={`${theme.scheme === 'dark' ? 'bg-background-dark border-b border-gray-800' : 'bg-background border-b border-gray-100'} px-6`}>
      <View>
        {!showSearch ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {showBack && (
                <TouchableOpacity className="mr-3" onPress={handleBack}>
                  <MaterialIcons name="arrow-back" color={iconColor} size={28} />
                </TouchableOpacity>
              )}
              <Text className={titleClass}>{title}</Text>
            </View>
            <View className="flex-row items-center gap-4">
              {onFilterPress && (
                <TouchableOpacity onPress={onFilterPress}>
                  <MaterialIcons name="tune" color={iconColor} size={28} />
                </TouchableOpacity>
              )}

              {rightActions && rightActions.map((a, idx) => (
                <TouchableOpacity key={idx} onPress={a.onPress} className="ml-2">
                  <MaterialIcons name={a.icon as any} color={iconColor} size={a.size ?? 24} />
                </TouchableOpacity>
              ))}

              {addHref ? (
                <Link href={addHref as any} asChild>
                  <TouchableOpacity>
                    <MaterialIcons name={addIconName as any} color={iconColor} size={28} />
                  </TouchableOpacity>
                </Link>
              ) : (
                onAddPress && (
                  <TouchableOpacity onPress={onAddPress}>
                    <MaterialIcons name={addIconName as any} color={iconColor} size={24} />
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        ) : (
          <>
            <View className="flex-row items-center">
              {showBack && (
                <TouchableOpacity className="mr-3" onPress={handleBack}>
                  <MaterialIcons name="arrow-back" color={iconColor} size={24} />
                </TouchableOpacity>
              )}

              <View style={{ marginHorizontal: -24, elevation: 1 }} className={`${theme.scheme === 'dark' ? 'bg-background-dark' : 'bg-background'} flex-row items-center rounded-lg px-3 py-2 flex-1`}>
                <MaterialIcons name="search" color={iconColor} size={24} />
                <TextInput
                  className={`${isDark ? "flex-1 ml-3 text-white text-sm" : "flex-1 ml-3 text-gray-900 text-sm"}`}
                  placeholder="Tìm kiếm..."
                  placeholderTextColor={isDark ? "#ccc" : "#999"}
                  onChangeText={onSearch}
                />
                {rightActions && rightActions.map((a, idx) => (
                  <TouchableOpacity key={idx} className="px-3" onPress={a.onPress}>
                    <MaterialIcons name={a.icon as any} color={iconColor} size={a.size ?? 24} />
                  </TouchableOpacity>
                ))}

                {addHref ? (
                  <Link href={addHref as any} asChild>
                    <TouchableOpacity className="px-3">
                      <MaterialIcons name={addIconName as any} color={iconColor} size={24} />
                    </TouchableOpacity>
                  </Link>
                ) : (
                  onAddPress && (
                    <TouchableOpacity className="px-3" onPress={onAddPress}>
                      <MaterialIcons name={addIconName as any} color={iconColor} size={24} />
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
};
