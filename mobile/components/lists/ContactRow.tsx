import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';
import { getInitials } from '@/utils/initials';
import { getAvatarUrl } from '@/utils/avatar';

export interface ContactItem {
  id: number | string;
  fullName: string;
  phone: string;
  avatar?: string;
  bio?: string;
  status?: string;
}

type Props = {
  contact: ContactItem;
  onPress?: () => void;
  onCall?: () => void;
  onVideo?: () => void;
};

export default function ContactRow({ contact, onPress, onCall, onVideo }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const iconColor = colors.icon;
  const initials = getInitials(contact.fullName);

  return (
    <TouchableOpacity onPress={onPress} className="px-4 py-3 flex-row items-center" style={{ paddingRight: 0 }}>
      <View className="flex-row items-center">
        <View>
          {contact.avatar ? (
            <Image
              source={{ uri: getAvatarUrl(contact.avatar) || undefined }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
          ) : (
            <View
              style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{initials.toUpperCase()}</Text>
            </View>
          )}
          {contact.status === 'online' && (
            <View 
              style={{ 
                position: 'absolute', 
                bottom: 0, 
                right: 0, 
                width: 14, 
                height: 14, 
                borderRadius: 7, 
                backgroundColor: '#4CAF50', 
                borderWidth: 2, 
                borderColor: colors.header 
              }} 
            />
          )}
        </View>

        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{contact.fullName}</Text>
          {contact.phone ? (
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{contact.phone}</Text>
          ) : null}
        </View>
      </View>

      <View className="items-center space-x-3" style={{ position: 'absolute', right: insets.right + 4, top: 0, bottom: 0, justifyContent: 'center', flexDirection: 'row', zIndex: 20 }}>
        <TouchableOpacity onPress={onCall} className="p-2 rounded-full" accessibilityLabel="Gọi" hitSlop={{ top: 14, left: 14, bottom: 14, right: 14 }}>
          <MaterialIcons name="call" size={22} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onVideo} className="p-2 rounded-full" accessibilityLabel="Gọi video" hitSlop={{ top: 14, left: 14, bottom: 14, right: 14 }}>
          <MaterialIcons name="videocam" size={22} color={iconColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
