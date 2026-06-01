import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getDefaultAvatarUrl } from '@/utils/avatar';
import { useTheme } from '@/context/themeContext';

interface AvatarInfo {
  url?: string | null;
  name?: string;
  initials?: string;
}

interface GroupAvatarProps {
  avatars?: (string | AvatarInfo)[];
  size?: number;
  membersCount?: number;
  borderColor?: string;
}

const GroupAvatar = ({ 
  avatars = [], 
  size = 48, 
  membersCount,
  borderColor = '#fff'
}: GroupAvatarProps) => {
  const countToDisplay = membersCount || avatars.length;
  const { colors } = useTheme();

  if (avatars.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }]}>
        <MaterialIcons name="groups" size={size * 0.6} color={colors.textSecondary} />
      </View>
    );
  }

  const renderAvatarItem = (item: string | AvatarInfo | undefined, itemSize: number) => {
    if (!item) {
      return <Image source={{ uri: getDefaultAvatarUrl() }} style={{ width: itemSize, height: itemSize }} />;
    }

    const url = typeof item === 'string' ? item : item.url;

    if (url) {
      return <Image source={{ uri: url }} style={styles.image} onError={(e) => console.log('[DEBUG GroupAvatar] Image load error:', e.nativeEvent.error)} />;
    }

    // Placeholder: render default avatar full-size (no colored background)
    return <Image source={{ uri: getDefaultAvatarUrl() }} style={{ width: itemSize, height: itemSize }} />;
  };

  if (avatars.length === 1 && countToDisplay <= 1) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        {renderAvatarItem(avatars[0], size)}
      </View>
    );
  }

  // Determine how many to show based on available avatars
  const showCount = countToDisplay > 4;

  // New design: Overlapping circles for a more premium look
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: 'transparent' }]}>
      <View style={styles.grid}>
        {/* Bottom left - Avatar 3 or Placeholder */}
        {countToDisplay === 3 && (
          <View style={[styles.item, { 
            width: size * 0.55, 
            height: size * 0.55, 
            bottom: 0, 
            left: size * 0.225, 
            zIndex: 1,
            backgroundColor: 'transparent'
          }]}>
            {renderAvatarItem(avatars[2], size * 0.55)}
          </View>
        )}

        {/* Regular Bottom Left and Bottom Right for 4+ members */}
        {countToDisplay >= 4 && (
          <View style={[styles.item, { 
            width: size * 0.55, 
            height: size * 0.55, 
            bottom: 0, 
            left: 0, 
            zIndex: 1,
            backgroundColor: 'transparent'
          }]}>
            {renderAvatarItem(avatars[2], size * 0.55)}
          </View>
        )}

        {/* Bottom right - Count box or Avatar 4 or Placeholder */}
        {countToDisplay >= 4 && (
          <View style={[styles.item, {
            width: size * 0.55,
            height: size * 0.55,
            bottom: 0,
            right: 0,
            zIndex: 2,
            backgroundColor: showCount ? '#E5E7EB' : 'transparent'
          }]}> 
            {showCount ? (
              <Text style={[styles.countText, { fontSize: size * 0.22, color: '#4B5563' }]}>+{countToDisplay - 3 > 99 ? '99' : countToDisplay - 3}</Text>
            ) : (
              renderAvatarItem(avatars[3], size * 0.55)
            )}
          </View>
        )}

        {/* Top left - Avatar 1 or Placeholder */}
        <View style={[styles.item, { 
          width: size * 0.55, 
          height: size * 0.55, 
          top: 0, 
          left: 0, 
          zIndex: 3,
          backgroundColor: 'transparent'
        }]}>
          {renderAvatarItem(avatars[0], size * 0.55)}
        </View>

        {/* Top right - Avatar 2 or Placeholder */}
        {countToDisplay >= 2 && (
          <View style={[styles.item, { 
            width: size * 0.55, 
            height: size * 0.55, 
            top: 0, 
            right: 0, 
            zIndex: 4,
            backgroundColor: 'transparent'
          }]}> 
            {renderAvatarItem(avatars[1], size * 0.55)}
          </View>
        )}
      </View>
    </View>
  );
};

export default GroupAvatar;

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  grid: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  item: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  countText: {
    color: '#4B5563',
    fontWeight: '700',
  },
});
