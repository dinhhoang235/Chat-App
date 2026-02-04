import React from 'react';
import { SectionList, View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { useTabBar } from '../../context/tabBarContext';
import { useRouter } from 'expo-router';
import { contacts } from '../../constants/mockData';
import { buildContactSections } from '../../utils/contacts';
import { ContactRow } from '../../components/ContactRow';
import { MaterialIcons } from '@expo/vector-icons';

export default function Contacts() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { tabBarHeight } = useTabBar();
  const router = useRouter();

  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };

  const sections = React.useMemo(() => buildContactSections(contacts), []);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header 
        title="Danh bạ" 
        subtitle="Những người liên hệ của bạn"
        showSearch={true}
        onSearch={handleSearch}
        addHref="/new-contact"
        addIconName="person-add"
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => {
          const inviteCount = 17;
          return (
            <TouchableOpacity onPress={() => router.push('/friend-requests')} className="px-4 py-3 flex-row items-center" style={{ paddingRight: 0 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' }}>
                <MaterialIcons name="person-add" size={24} color="#fff" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                  Lời mời kết bạn <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>({inviteCount})</Text>
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        renderItem={({ item }) => <ContactRow contact={item} onPress={() => {}} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surface }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{title}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 8, paddingRight: insets.right + 8, paddingBottom: tabBarHeight + 8 }}
        stickySectionHeadersEnabled
      />
    </SafeAreaView>
  );
}
