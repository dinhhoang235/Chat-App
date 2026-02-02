import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Contact } from '../constants/mockData';

type Props = {
  contact: Contact;
  onPress?: () => void;
  onCall?: () => void;
  onVideo?: () => void;
};

export function ContactRow({ contact, onPress, onCall, onVideo }: Props) {
  const insets = useSafeAreaInsets();
  const initials = contact.initials ?? contact.name.split(' ').map(n => n[0]).slice(0, 2).join('');

  return (
    <TouchableOpacity onPress={onPress} className="px-4 py-3 flex-row items-center" style={{ paddingRight: 0 }}>
      <View className="flex-row items-center">
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: contact.color || '#6B7280' }}
        >
          <Text className="text-white font-bold">{initials}</Text>
        </View>

        <View className="ml-4 flex-1">
          <Text className="text-base text-gray-900 dark:text-white">{contact.name}</Text>
          {contact.phone ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">{contact.phone}</Text>
          ) : null}
        </View>
      </View>

      <View className="items-center space-x-3" style={{ position: 'absolute', right: insets.right + 4, top: 0, bottom: 0, justifyContent: 'center', flexDirection: 'row', zIndex: 20 }}>
        <TouchableOpacity onPress={onCall} className="p-2 rounded-full" accessibilityLabel="Gọi" hitSlop={{ top: 14, left: 14, bottom: 14, right: 14 }}>
          <MaterialIcons name="call" size={22} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onVideo} className="p-2 rounded-full" accessibilityLabel="Gọi video" hitSlop={{ top: 14, left: 14, bottom: 14, right: 14 }}>
          <MaterialIcons name="videocam" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
