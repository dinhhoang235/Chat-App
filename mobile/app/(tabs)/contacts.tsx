import React from 'react';
import { SectionList, View, Text } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { contacts } from '../../constants/mockData';
import { ContactRow } from '../../components/ContactRow';

export default function Contacts() {
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };

  const sections = React.useMemo(() => {
    // Vietnamese alphabet order (includes special letters)
    const VN_ALPHABET = ['A','Ă','Â','B','C','D','Đ','E','Ê','G','H','I','K','L','M','N','O','Ô','Ơ','P','Q','R','S','T','U','Ư','V','X','Y'];

    const getLetter = (name: string) => {
      if (!name) return '#';
      const trimmed = name.trim();
      if (!trimmed) return '#';
      const first = trimmed[0];
      // Handle precomposed đ
      if (first.toLowerCase() === 'đ') return 'Đ';

      const norm = first.normalize('NFD');
      const base = norm[0].toUpperCase();

      // breve (Ă)
      if (norm.includes('\u0306') && base === 'A') return 'Ă';
      // circumflex (Â,Ê,Ô)
      if (norm.includes('\u0302')) {
        if (base === 'A') return 'Â';
        if (base === 'E') return 'Ê';
        if (base === 'O') return 'Ô';
      }
      // horn (Ơ,Ư)
      if (norm.includes('\u031B')) {
        if (base === 'O') return 'Ơ';
        if (base === 'U') return 'Ư';
      }

      // Default to base Latin letter (A-Z)
      if (/[A-Z]/.test(base)) return base;
      return '#';
    };

    const map = new Map<string, typeof contacts>();

    // Sort by VN alphabet order and then by Vietnamese locale within group
    const sorted = [...contacts].sort((a, b) => {
      const la = getLetter(a.name);
      const lb = getLetter(b.name);
      const ia = VN_ALPHABET.indexOf(la);
      const ib = VN_ALPHABET.indexOf(lb);
      if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.name.localeCompare(b.name, 'vi');
    });

    sorted.forEach((c) => {
      const letter = getLetter(c.name);
      const key = VN_ALPHABET.includes(letter) ? letter : '#';
      if (!map.has(key)) map.set(key, [] as typeof contacts);
      map.get(key)!.push(c);
    });

    const result: { title: string; data: typeof contacts }[] = [];
    VN_ALPHABET.forEach((title) => {
      if (map.has(title)) result.push({ title, data: map.get(title)! });
    });
    if (map.has('#')) result.push({ title: '#', data: map.get('#')! });

    return result;
  }, []);

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
          <View className="px-4 py-2 bg-gray-100 dark:bg-background-dark">
            <Text className="text-xs font-semibold text-gray-500">{title}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 8, paddingRight: insets.right + 8 }}
        stickySectionHeadersEnabled
      />
    </SafeAreaView>
  );
}
