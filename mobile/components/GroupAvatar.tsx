import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface GroupAvatarProps {
  avatars?: string[];
  size?: number;
  membersCount?: number;
}

export const GroupAvatar: React.FC<GroupAvatarProps> = ({ 
  avatars = [], 
  size = 48, 
  membersCount 
}) => {
  const countToDisplay = membersCount || avatars.length;
  
  // If no avatars and it's a group, we still want the grid but with initials maybe?
  // Let's stick to showing the grid if avatars exist or just the default group icon if everything is empty.
  if (avatars.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
        <MaterialIcons name="groups" size={size * 0.6} color="#9CA3AF" />
      </View>
    );
  }

  // If only 1 avatar, show it full size
  if (avatars.length === 1 && countToDisplay <= 1) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image source={{ uri: avatars[0] }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      </View>
    );
  }

  const itemSize = size * 0.58; // Increase size to 58% to create more overlap

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={styles.grid}>
        {/* Bottom left - Avatar 3 (z-index thấp nhất) */}
        <View style={[styles.item, { width: itemSize, height: itemSize, bottom: -2, left: -2, zIndex: 1 }]}>
          {avatars[2] ? (
            <Image source={{ uri: avatars[2] }} style={styles.image} />
          ) : (
            <MaterialIcons name="person" size={itemSize * 0.7} color="#9CA3AF" />
          )}
        </View>
        
        {/* Bottom right - Count box or Avatar 4 (z-index thấp thứ 2) */}
        <View style={[styles.item, { 
          width: itemSize, 
          height: itemSize, 
          bottom: -2, 
          right: -2,
          zIndex: 2,
          backgroundColor: countToDisplay > 4 ? '#E5E7EB' : (avatars[3] ? 'transparent' : '#F3F4F6'),
          borderWidth: countToDisplay > 4 ? 0.5 : 1,
          borderColor: countToDisplay > 4 ? '#D1D5DB' : '#fff'
        }]}>
          {countToDisplay > 4 ? (
            <Text style={styles.countText}>{countToDisplay - 3 > 99 ? '99+' : countToDisplay - 3}</Text>
          ) : avatars[3] ? (
            <Image source={{ uri: avatars[3] }} style={styles.image} />
          ) : (
            <MaterialIcons name="person" size={itemSize * 0.7} color="#9CA3AF" />
          )}
        </View>

        {/* Top left - Avatar 1 (z-index cao) */}
        <View style={[styles.item, { width: itemSize, height: itemSize, top: -2, left: -2, zIndex: 3 }]}>
          {avatars[0] ? (
            <Image source={{ uri: avatars[0] }} style={styles.image} />
          ) : (
            <MaterialIcons name="person" size={itemSize * 0.7} color="#9CA3AF" />
          )}
        </View>
        
        {/* Top right - Avatar 2 (z-index cao nhất) */}
        <View style={[styles.item, { width: itemSize, height: itemSize, top: -2, right: -2, zIndex: 4 }]}>
          {avatars[1] ? (
             <Image source={{ uri: avatars[1] }} style={styles.image} />
          ) : (
            <MaterialIcons name="person" size={itemSize * 0.7} color="#9CA3AF" />
          )}
        </View>
      </View>
    </View>
  );
};

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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  countText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
  },
});
