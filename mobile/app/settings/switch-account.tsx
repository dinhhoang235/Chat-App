import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert, TouchableWithoutFeedback, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from '@/components';
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from '@/context/themeContext';
import { useAuth } from '@/context/authContext';
import { useRouter } from "expo-router";
import { getAvatarUrl } from '@/utils/avatar';
import { getInitials } from '@/utils/initials';

export default function SwitchAccount() {
  const { scheme, colors } = useTheme();
  const { user, savedAccounts, login, removeAccount } = useAuth();
  const router = useRouter();
  
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [switchModalAccount, setSwitchModalAccount] = useState<any>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const sortedAccounts = [...savedAccounts].sort((a, b) => {
    if (a.user.id === user?.id) return -1;
    if (b.user.id === user?.id) return 1;
    return 0;
  });

  const handleConfirmPassword = async () => {
    if (!passwordInput) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu");
      return;
    }
    setLoadingLogin(true);
    try {
      const success = await login(switchModalAccount.user.phone, passwordInput);
      if (success) {
        setSwitchModalAccount(null);
        setPasswordInput("");
        router.replace('/(tabs)/');
      } else {
        Alert.alert("Lỗi", "Mật khẩu không đúng");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi đăng nhập");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleRemoveAccount = (userId: number) => {
    Alert.alert(
      "Xóa tài khoản",
      "Bạn có chắc chắn muốn xóa tài khoản này khỏi danh sách lưu?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive",
          onPress: async () => {
            await removeAccount(userId);
          }
        }
      ]
    );
  };

  const toggleMenu = (userId: number) => {
    setOpenMenuId(prev => prev === userId ? null : userId);
  };

  const closeMenu = () => {
    if (openMenuId !== null) setOpenMenuId(null);
  };

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Chuyển tài khoản" showBack={true} showSearch={false} />

        <View className="px-4 pt-4 flex-1">
          <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Thêm tài khoản để đăng nhập nhanh.</Text>

          <View className="space-y-3">
            {sortedAccounts.length > 0 ? sortedAccounts.map((account) => {
              const isCurrent = user?.id === account.user.id;
              const isMenuOpen = openMenuId === account.user.id;
              
              return (
                <View key={account.user.id} style={{ zIndex: isMenuOpen ? 50 : 1 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="px-4 py-3 rounded-lg flex-row items-center justify-between"
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: isCurrent ? colors.tint : colors.border }}
                    onPress={() => {
                      closeMenu();
                      if (!isCurrent) {
                        setSwitchModalAccount(account);
                        setPasswordInput("");
                      }
                    }}
                    disabled={isCurrent}
                  >
                    <View className="flex-row items-center flex-1">
                      <View style={{ position: 'relative' }} className="mr-4">
                        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surface }}>
                          {account.user?.avatar ? (
                            <Image
                              source={{ uri: getAvatarUrl(account.user.avatar) || undefined }}
                              style={{ width: 48, height: 48, borderRadius: 24 }}
                            />
                          ) : (
                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{getInitials(account.user.fullName, account.user.id?.toString())}</Text>
                          )}
                        </View>
                        {isCurrent && (
                          <View style={{ position: 'absolute', right: -6, top: -6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, borderWidth: 2, borderColor: '#fff' }}>
                            <MaterialIcons name="check" size={14} color="#fff" />
                          </View>
                        )}
                      </View>

                      <View className="flex-1 flex-row items-center justify-between pr-2">
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17, flexShrink: 1 }} numberOfLines={1}>
                          {account.user.fullName}
                        </Text>
                        {isCurrent && (
                          <View style={{ backgroundColor: colors.tint + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 }}>
                            <Text style={{ color: colors.tint, fontSize: 12, fontWeight: '600' }}>Đã đăng nhập</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {!isCurrent && (
                      <TouchableOpacity 
                        className="p-2"
                        onPress={() => toggleMenu(account.user.id)}
                      >
                        <MaterialIcons name="more-vert" size={24} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  {isMenuOpen && (
                    <View 
                      style={{
                        position: 'absolute',
                        right: 48,
                        top: 36,
                        backgroundColor: colors.card,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 5,
                        width: 140,
                        zIndex: 100
                      }}
                    >
                      <TouchableOpacity 
                        className="px-4 py-3"
                        onPress={() => {
                          closeMenu();
                          handleRemoveAccount(account.user.id);
                        }}
                      >
                        <Text style={{ color: '#ef4444' }}>Xóa tài khoản</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }) : user && (
              <TouchableOpacity
                activeOpacity={0.8}
                className="px-4 py-3 rounded-lg flex-row items-center justify-between"
                style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.tint }}
                disabled={true}
              >
                <View className="flex-row items-center flex-1">
                  <View style={{ position: 'relative' }} className="mr-4">
                    <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surface }}>
                      {user?.avatar ? (
                        <Image
                          source={{ uri: getAvatarUrl(user.avatar) || undefined }}
                          style={{ width: 48, height: 48, borderRadius: 24 }}
                        />
                      ) : (
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{getInitials(user.fullName, user.id?.toString())}</Text>
                      )}
                    </View>
                    <View style={{ position: 'absolute', right: -6, top: -6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, borderWidth: 2, borderColor: '#fff' }}>
                      <MaterialIcons name="check" size={14} color="#fff" />
                    </View>
                  </View>

                  <View className="flex-1 flex-row items-center justify-between pr-2">
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17, flexShrink: 1 }} numberOfLines={1}>
                      {user.fullName}
                    </Text>
                    <View style={{ backgroundColor: colors.tint + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 }}>
                      <Text style={{ color: colors.tint, fontSize: 12, fontWeight: '600' }}>Đã đăng nhập</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="flex-row items-center px-4 py-4 rounded-lg"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              onPress={() => {
                closeMenu();
                router.push('/settings/add-account');
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16, backgroundColor: colors.surface }}>
                <MaterialIcons name="add" size={28} color={colors.tint} />
              </View>
              <View>
                <Text style={{ color: colors.tint, fontWeight: '600' }}>Thêm tài khoản</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={!!switchModalAccount}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSwitchModalAccount(null)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <TouchableWithoutFeedback onPress={() => setSwitchModalAccount(null)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                  <View style={{ backgroundColor: colors.card, width: '100%', borderRadius: 16, padding: 24, elevation: 5 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                      Xác nhận danh tính
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginBottom: 20, textAlign: 'center' }}>
                      Vui lòng nhập mật khẩu cho tài khoản {switchModalAccount?.user?.fullName} để tiếp tục.
                    </Text>

                    <View style={{ position: 'relative', marginBottom: 24 }}>
                      <TextInput
                        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, paddingRight: 48, backgroundColor: colors.input, color: colors.text }}
                        placeholder="Mật khẩu"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={!showPassword}
                        value={passwordInput}
                        onChangeText={setPasswordInput}
                        autoCapitalize="none"
                        autoFocus={true}
                        editable={!loadingLogin}
                      />
                      <TouchableOpacity
                        style={{ position: 'absolute', right: 16, top: 14 }}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <MaterialIcons
                          name={showPassword ? "visibility" : "visibility-off"}
                          size={20}
                          color={colors.icon}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 12, marginRight: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                        onPress={() => setSwitchModalAccount(null)}
                        disabled={loadingLogin}
                      >
                        <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>Hủy</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 12, marginLeft: 8, borderRadius: 8, backgroundColor: colors.tint, opacity: loadingLogin ? 0.7 : 1 }}
                        onPress={handleConfirmPassword}
                        disabled={loadingLogin}
                      >
                        {loadingLogin ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Xác nhận</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
