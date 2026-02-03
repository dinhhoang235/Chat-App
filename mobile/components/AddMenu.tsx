import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { useTheme } from '../context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  addLayout?: { x: number; y: number; width: number; height: number } | null;
  headerLayout?: { x: number; y: number; width: number; height: number } | null;
  onClose: () => void;
  onAddContact: () => void;
  onCreateGroup: () => void;
};

export const AddMenu: React.FC<Props> = ({ visible, addLayout, headerLayout, onClose, onAddContact, onCreateGroup }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const headerOffset = headerLayout ? (headerLayout.y + headerLayout.height - 2) : (insets.top + 56 - 2); // -2 so menu sits flush

  const menuItems: MenuItem[] = [
    { id: '1', label: 'Thêm bạn', icon: 'person-add', onPress: () => { onAddContact(); onClose(); } },
    { id: '2', label: 'Tạo nhóm', icon: 'groups', onPress: () => { onCreateGroup(); onClose(); } },
  ];

  // decide separator color so it contrasts with surface
  const isHex = (s: string) => typeof s === 'string' && s[0] === '#';
  const hexToLuminance = (hex: string) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  const sepColor = isHex(colors.surface) && hexToLuminance(colors.surface) < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    // overlay that starts below header and dims the rest — blocks interaction
    <View style={{ position: 'absolute', top: headerOffset, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 999 }}>
      {/* touch outside will close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      </TouchableWithoutFeedback>

      {/* menu box floating from top-right, under the header and aligned to + icon */}
      <View style={{ position: 'absolute', right: 12, top: 15, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 16, elevation: 12, minWidth: 220, maxHeight: '70%', overflow: 'visible' }}>
        {/* small pointer (triangle) pointing to + icon (overlaps the menu border) */}
        {addLayout ? (
          (() => {
            const screenW = Dimensions.get('window').width;
            const menuWidth = 220;
            const menuRight = 12;
            const menuLeft = screenW - menuRight - menuWidth;
            const centerX = addLayout.x + addLayout.width / 2;
            let pointerLeft = centerX - menuLeft - 8 + 20; // Shift right by 6px to align with + icon
            // clamp to keep inside menu padding
            pointerLeft = Math.max(6, Math.min(pointerLeft, menuWidth - 8 - 20));

            return <View style={{ position: 'absolute', left: pointerLeft, top: -9, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.surface, zIndex: 10 }} />;
          })()
        ) : (
          <View style={{ position: 'absolute', right: 18, top: -9, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: colors.surface, zIndex: 10 }} />
        )}

        <View style={{ overflow: 'hidden', borderRadius: 10 }}>
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity onPress={item.onPress} style={{ paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name={item.icon as any} size={20} color={colors.icon} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 12, flex: 1 }}>{item.label}</Text>
              </TouchableOpacity>
              {idx < menuItems.length - 1 && <View style={{ height: 1, backgroundColor: sepColor, marginHorizontal: 0 }} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
};
