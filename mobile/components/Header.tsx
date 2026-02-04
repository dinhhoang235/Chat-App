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
  /** Action button to show left of the add button (e.g., QR icon) */
  leftAddAction?: { icon: string; onPress?: () => void; size?: number };
  /** Callback to receive layout of the add button (x, y, width, height) */
  onAddLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
  /** Callback to receive layout of the header (x, y, width, height) */
  onHeaderLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
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
  leftAddAction,
  onAddLayout,
  onHeaderLayout,
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
  const titleStyle: TextStyle = { color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 24, marginTop: 6 };

  return (
    <View onLayout={(e) => onHeaderLayout && onHeaderLayout(e.nativeEvent.layout)} style={{ backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, minHeight: 56 }} className="px-6">
      <View style={{ justifyContent: 'center' }}>
        {!showSearch ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {showBack && (
                <TouchableOpacity className="mr-3 mt-2" onPress={handleBack}>
                  <MaterialIcons name="arrow-back" color={iconColor} size={28} />
                </TouchableOpacity>
              )}
              <View>
                <Text style={titleStyle} numberOfLines={1}>{title}</Text>
                {subtitle ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
                ) : null}
              </View>
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

              {leftAddAction && (
                <TouchableOpacity onPress={leftAddAction.onPress} className="mr-2">
                  <MaterialIcons name={leftAddAction.icon as any} color={iconColor} size={leftAddAction.size ?? 24} />
                </TouchableOpacity>
              )}

              <View onLayout={(e) => onAddLayout && onAddLayout(e.nativeEvent.layout)}>
                {addHref ? (
                  <Link href={addHref as any} asChild>
                    <TouchableOpacity>
                      <MaterialIcons name={addIconName as any} color={iconColor} size={24} />
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
          </View>
        ) : (
          <>
            <View className="flex-row items-center">
              {showBack && (
                <TouchableOpacity className="mr-3" onPress={handleBack}>
                  <MaterialIcons name="arrow-back" color={iconColor} size={24} />
                </TouchableOpacity>
              )}

              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 34 }} className="flex-row items-center">
                <MaterialIcons name="search" color={iconColor} size={28} />
                <TextInput
                  className="flex-1 ml-3 text-sm"
                  placeholder="Tìm kiếm..."
                  placeholderTextColor={colors.textSecondary}
                  style={{ color: colors.text }}
                  onChangeText={onSearch}
                />
                {rightActions && rightActions.map((a, idx) => (
                  <TouchableOpacity key={idx} className="px-3" onPress={a.onPress}>
                    <MaterialIcons name={a.icon as any} color={iconColor} size={a.size ?? 28} />
                  </TouchableOpacity>
                ))}

                {leftAddAction && (
                  <TouchableOpacity onPress={leftAddAction.onPress} className="px-2">
                    <MaterialIcons name={leftAddAction.icon as any} color={iconColor} size={leftAddAction.size ?? 28} />
                  </TouchableOpacity>
                )}

                <View onLayout={(e) => onAddLayout && onAddLayout(e.nativeEvent.layout)}>
                  {addHref ? (
                    <Link href={addHref as any} asChild>
                      <TouchableOpacity className="px-3">
                        <MaterialIcons name={addIconName as any} color={iconColor} size={28} />
                      </TouchableOpacity>
                    </Link>
                  ) : (
                    onAddPress && (
                      <TouchableOpacity className="px-3" onPress={onAddPress}>
                        <MaterialIcons name={addIconName as any} color={iconColor} size={28} />
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
};
