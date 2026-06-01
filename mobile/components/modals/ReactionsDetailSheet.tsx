import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTheme } from '@/context/themeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAvatarUrl, getDefaultAvatarUrl } from '@/utils/avatar';

type ReactionsDetailSheetProps = {
  visible: boolean;
  onClose: () => void;
  message: any;
  userId?: number;
  onRemoveReaction: (emoji: string) => void;
};

export default function ReactionsDetailSheet({
  visible,
  onClose,
  message,
  userId,
  onRemoveReaction,
}: ReactionsDetailSheetProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | string>('all');

  const snapPoints = useMemo(() => {
    return [Math.round(Dimensions.get('window').height * 0.50)];
  }, []);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
      setSelectedFilter('all');
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const reactionsList = useMemo(() => {
    if (!message || !message.reactions) return [];
    return [...message.reactions].sort((a: any, b: any) => {
      const isAMe = a.userId === userId;
      const isBMe = b.userId === userId;
      if (isAMe && !isBMe) return -1;
      if (!isAMe && isBMe) return 1;
      return 0;
    });
  }, [message, userId]);

  // Aggregate emoji counts
  const emojiCounts = useMemo(() => {
    const counts: { [emoji: string]: number } = {};
    reactionsList.forEach((r: any) => {
      counts[r.reaction] = (counts[r.reaction] || 0) + 1;
    });
    return Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
  }, [reactionsList]);

  // Filtered reactions list
  const filteredReactions = useMemo(() => {
    if (selectedFilter === 'all') return reactionsList;
    return reactionsList.filter((r: any) => r.reaction === selectedFilter);
  }, [reactionsList, selectedFilter]);

  const handleRemove = (emoji: string) => {
    onRemoveReaction(emoji);
    onClose();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      enableDynamicSizing={false}
      containerStyle={{ zIndex: 10000, pointerEvents: 'box-none' }}
      handleIndicatorStyle={{ backgroundColor: colors.textSecondary, width: 40 }}
      backdropComponent={renderBackdrop}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
    >
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          position: 'relative',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
            Cảm xúc
          </Text>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={{
              position: 'absolute',
              right: 16,
              top: 12,
            }}
          >
            <MaterialCommunityIcons 
              name="close-circle" 
              size={24} 
              color={colors.textSecondary} 
              style={{ opacity: 0.6 }}
            />
          </TouchableOpacity>
        </View>

        {/* User list */}
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 80 }}
        >
          {filteredReactions.map((r: any, idx: number) => {
            const isMe = r.userId === userId;
            const userName = r.user?.fullName || 'Người dùng';
            const userAvatar = r.user?.avatar;

            return (
              <TouchableOpacity
                key={`reactor-${idx}`}
                activeOpacity={isMe ? 0.7 : 1}
                disabled={!isMe}
                onPress={() => isMe && handleRemove(r.reaction)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                }}
              >
                {(() => {
                  const avatarUri = getAvatarUrl(userAvatar);
                  return userAvatar && avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                    />
                    ) : (
                      <Image
                        source={{ uri: getDefaultAvatarUrl() }}
                        style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                      />
                    );
                })()}

                {/* Name & Subtext */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                    {userName}
                  </Text>
                  {isMe && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                      Nhấn để gỡ
                    </Text>
                  )}
                </View>

                {/* Reaction Emoji */}
                <Text style={{ fontSize: 24, marginLeft: 12 }}>
                  {r.reaction}
                </Text>
              </TouchableOpacity>
            );
          })}
        </BottomSheetScrollView>

        {/* Horizontal filter bar */}
        <View style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingVertical: 10,
          paddingBottom: Math.max(insets.bottom, 10),
        }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {/* TẤT CẢ Tab */}
            <TouchableOpacity
              onPress={() => setSelectedFilter('all')}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selectedFilter === 'all' 
                  ? (scheme === 'dark' ? 'rgba(255,255,255,0.15)' : '#F0F2F5')
                  : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: selectedFilter === 'all' ? colors.text : colors.textSecondary,
              }}>
                TẤT CẢ {reactionsList.length}
              </Text>
            </TouchableOpacity>

            {/* Individual Emoji Tabs */}
            {emojiCounts.map(({ emoji, count }) => (
              <TouchableOpacity
                key={`filter-${emoji}`}
                onPress={() => setSelectedFilter(emoji)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedFilter === emoji
                    ? (scheme === 'dark' ? 'rgba(255,255,255,0.15)' : '#F0F2F5')
                    : 'transparent',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 16 }}>{emoji}</Text>
                <Text style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: selectedFilter === emoji ? colors.text : colors.textSecondary,
                }}>
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </BottomSheet>
  );
}
