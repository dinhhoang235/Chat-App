import { View, Text, TextInput, TouchableOpacity, TextStyle } from "react-native";
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

  const handleBack = () => {
    if (onBackPress) return onBackPress();
    router.back();
  };

  const { colors } = theme;
  const iconColor = colors.icon;
  const titleStyle: TextStyle = { color: colors.text, fontSize: 24, fontWeight: '700' };

  return (
    <View style={{ backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.border }} className="px-6">
      <View>
        {!showSearch ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {showBack && (
                <TouchableOpacity className="mr-3" onPress={handleBack}>
                  <MaterialIcons name="arrow-back" color={iconColor} size={28} />
                </TouchableOpacity>
              )}
              <Text style={titleStyle}>{title}</Text>
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

              <View style={{ marginHorizontal: -24, elevation: 1, backgroundColor: colors.surface }} className="flex-row items-center rounded-lg px-3 py-2 flex-1">
                <MaterialIcons name="search" color={iconColor} size={24} />
                <TextInput
                  className="flex-1 ml-3 text-sm"
                  placeholder="Tìm kiếm..."
                  placeholderTextColor={colors.textSecondary}
                  style={{ color: colors.text }}
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
