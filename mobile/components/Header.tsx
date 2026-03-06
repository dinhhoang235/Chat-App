import { View, Text, TouchableOpacity, TextStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../context/themeContext";

interface HeaderProps {
  title?: string;
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
  onTitlePress?: () => void;
  leftElement?: React.ReactNode;
  variant?: "light" | "dark";
  /** Render header transparent (no background/border). Useful to overlay over cover images. */
  transparent?: boolean;
  /** Position header absolutely on top of content (overlay). Use with `transparent` typically. */
  overlay?: boolean;
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
  onTitlePress,
  leftElement,
  variant,
  transparent = false,
  overlay = false,
}) => {
  const router = useRouter();
  const theme = useTheme();

  const handleBack = () => {
    if (onBackPress) return onBackPress();
    router.back();
  };

  const { colors } = theme;
  const iconColor = transparent ? '#fff' : colors.icon;
  const titleStyle: TextStyle = { color: transparent ? '#fff' : colors.text, fontSize: 20, fontWeight: '700', lineHeight: 24, marginTop: 6 };

  // container styling: allow transparent + overlay
  const containerStyle: any = {
    backgroundColor: transparent ? 'transparent' : colors.header,
    borderBottomWidth: transparent ? 0 : 1,
    borderBottomColor: transparent ? 'transparent' : colors.border,
    paddingVertical: 8,
    minHeight: 56,
  };

  if (overlay) {
    containerStyle.position = 'absolute';
    containerStyle.top = 0;
    containerStyle.left = 0;
    containerStyle.right = 0;
    containerStyle.zIndex = 50;
  }

  return (
    <View onLayout={(e) => onHeaderLayout && onHeaderLayout(e.nativeEvent.layout)} style={containerStyle} className="px-6">
      <View style={{ justifyContent: 'center' }}>
        {!showSearch ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {showBack && (
                <TouchableOpacity className="mr-3 mt-2" onPress={handleBack}>
                  <MaterialIcons name="arrow-back" color={iconColor} size={28} />
                </TouchableOpacity>
              )}
              {leftElement && (
                <View className="mr-2 mt-1">
                  {leftElement}
                </View>
              )}
              <View>
                {title ? (
                  <TouchableOpacity 
                    disabled={!onTitlePress} 
                    onPress={() => onTitlePress?.()}
                    style={{ paddingRight: 40 }}
                  >
                    <Text style={titleStyle} numberOfLines={1}>{title}</Text>
                  </TouchableOpacity>
                ) : null}
                {subtitle ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: -2 }} numberOfLines={1}>{subtitle}</Text>
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
                {/* Make the header search navigate to a full-screen /search route so the keyboard autofocuses there */}
                <TouchableOpacity onPress={() => router.push('/search')} style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ height: 34, borderRadius: 18, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: colors.surface }}>
                    <Text style={{ color: colors.textSecondary }}>Tìm kiếm...</Text>
                  </View>
                </TouchableOpacity>

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
