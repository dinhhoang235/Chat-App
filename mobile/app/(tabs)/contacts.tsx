import React from 'react';
import { SectionList, View, Text } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { contacts } from '../../constants/mockData';
import { buildContactSections } from '../../utils/contacts';
import { ContactRow } from '../../components/ContactRow';

export default function Contacts() {
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };

  const sections = React.useMemo(() => buildContactSections(contacts), []);

  return (
    <SafeAreaView className={`${scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
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
        renderItem={({ item }) => <ContactRow contact={item} onPress={() => {}} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: scheme === 'dark' ? colors.surface : '#FFFFFF' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: scheme === 'dark' ? '#E5E7EB' : '#0F172A' }}>{title}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 8, paddingRight: insets.right + 8 }}
        stickySectionHeadersEnabled
      />
    </SafeAreaView>
  );
}
