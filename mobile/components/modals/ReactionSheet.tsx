import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTheme } from '@/context/themeContext';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EMOJI_CATEGORIES, EMOJI_SEARCH_MAP, removeAccents } from '@/utils/emojiData';

const RECENT_REACTIONS_KEY = '@recent_reactions';

export default function ReactionSheet({
  visible,
  onClose,
  onReact,
  message,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  message: any;
  userId?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [recentReactions, setRecentReactions] = useState<string[]>([]);
  const sectionLayouts = useRef<{ [key: string]: number }>({});

  // Numeric snap points for safety (65% of screen height)
  const snapPoints = useMemo(() => {
    return [Math.round(Dimensions.get('window').height * 0.65)];
  }, []);

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

  // Load recent reactions from storage on mount
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_REACTIONS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentReactions(parsed);
            return;
          }
        }
      } catch {}
      // Default fallback
      setRecentReactions(['👍', '❤️', '😂', '😮', '😢', '🙏']);
    };
    loadRecent();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
      // Reset scroll position to top on open
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      sheetRef.current?.close();
      setSearchQuery('');
    }
  }, [visible]);

  // Find if current user has an active reaction on this message
  const userReaction = useMemo(() => {
    if (!message || !message.reactions || !userId) return null;
    return message.reactions.find((r: any) => r.userId === userId)?.reaction || null;
  }, [message, userId]);

  const handleReact = async (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReact(emoji);

    // Save/update recent reactions
    try {
      const updated = [emoji, ...recentReactions.filter((r) => r !== emoji)].slice(0, 12);
      setRecentReactions(updated);
      await AsyncStorage.setItem(RECENT_REACTIONS_KEY, JSON.stringify(updated));
    } catch {}

    onClose();
  };

  const handleSearchFocus = () => {
    sheetRef.current?.snapToIndex(0);
  };

  const handleScrollToSection = (sectionId: string) => {
    if (sectionId === 'facebook') {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const y = sectionLayouts.current[sectionId];
    if (y !== undefined) {
      scrollViewRef.current?.scrollTo({ y: y - 10, animated: true });
    }
  };

  // Accent-insensitive search matching
  const filteredEmojis = useMemo(() => {
    if (!searchQuery) return [];
    const normalizedQuery = removeAccents(searchQuery.trim());
    const matchedChars = new Set<string>();

    // 1. Match against search map tags
    EMOJI_SEARCH_MAP.forEach((item) => {
      const matchTag = item.tags.some((tag) => removeAccents(tag).includes(normalizedQuery));
      if (matchTag || item.char === searchQuery) {
        matchedChars.add(item.char);
      }
    });

    // 2. Also look up simple string matches in standard categories
    EMOJI_CATEGORIES.forEach((cat) => {
      cat.emojis.forEach((emoji) => {
        if (emoji.includes(searchQuery)) {
          matchedChars.add(emoji);
        }
      });
    });

    return Array.from(matchedChars);
  }, [searchQuery]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      enableDynamicSizing={false}
      containerStyle={{ zIndex: 9999, pointerEvents: 'box-none' }}
      handleIndicatorStyle={{ backgroundColor: colors.textSecondary, width: 40 }}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
    >
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {/* Search bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceVariant,
          borderRadius: 10,
          paddingHorizontal: 12,
          marginHorizontal: 16,
          marginBottom: 10,
          height: 38,
        }}>
          <MaterialIcons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <BottomSheetTextInput
            placeholder="Tìm kiếm biểu tượng cảm xúc"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            style={{
              flex: 1,
              fontSize: 14,
              color: colors.text,
              padding: 0,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery ? (
          /* Search results view */
          <BottomSheetScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>
              Kết quả tìm kiếm
            </Text>
            {filteredEmojis.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {filteredEmojis.map((emoji) => {
                  const isSelected = userReaction === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleReact(emoji)}
                      activeOpacity={0.7}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: 4,
                        backgroundColor: isSelected ? colors.tint + '15' : 'transparent',
                        borderWidth: isSelected ? 1.5 : 0,
                        borderColor: colors.tint,
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 24 }}>
                Không tìm thấy biểu tượng nào
              </Text>
            )}
          </BottomSheetScrollView>
        ) : (
          /* Main categorized list */
          <BottomSheetScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Cảm xúc của bạn section */}
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                  Cảm xúc của bạn
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                {['❤️', '😆', '😮', '😢', '😡', '👍'].map((emoji) => {
                  const isSelected = userReaction === emoji;
                  return (
                    <TouchableOpacity
                      key={`my-reaction-${emoji}`}
                      onPress={() => handleReact(emoji)}
                      activeOpacity={0.7}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? colors.tint + '15' : 'transparent',
                        borderWidth: isSelected ? 1.5 : 0,
                        borderColor: colors.tint,
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Quick/My Reactions row */}
            <View 
              onLayout={(e) => { sectionLayouts.current['recent'] = e.nativeEvent.layout.y; }}
              style={{ paddingHorizontal: 16, marginBottom: 16 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10 }}>
                Mới đây
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {recentReactions.slice(0, 7).map((emoji) => {
                  const isSelected = userReaction === emoji;
                  return (
                    <TouchableOpacity
                      key={`recent-${emoji}`}
                      onPress={() => handleReact(emoji)}
                      activeOpacity={0.7}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                        marginBottom: 8,
                        backgroundColor: isSelected ? colors.tint + '15' : colors.surfaceVariant,
                        borderWidth: isSelected ? 1.5 : 0,
                        borderColor: colors.tint,
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Categories */}
            {EMOJI_CATEGORIES.map((category) => (
              <View
                key={category.id}
                onLayout={(e) => { sectionLayouts.current[category.id] = e.nativeEvent.layout.y; }}
                style={{ paddingHorizontal: 16, marginBottom: 20 }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10 }}>
                  {category.title}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {category.emojis.map((emoji) => {
                    const isSelected = userReaction === emoji;
                    return (
                      <TouchableOpacity
                        key={`${category.id}-${emoji}`}
                        onPress={() => handleReact(emoji)}
                        activeOpacity={0.7}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 8,
                          marginBottom: 8,
                          backgroundColor: isSelected ? colors.tint + '15' : 'transparent',
                          borderWidth: isSelected ? 1.5 : 0,
                          borderColor: colors.tint,
                        }}
                      >
                        <Text style={{ fontSize: 26 }}>{emoji}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </BottomSheetScrollView>
        )}

        {/* Category Navigation Bar (Sticky at bottom, as flex sibling) */}
        {!searchQuery && (
          <View style={{
            height: 52,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            paddingBottom: Math.max(insets.bottom, 6),
            paddingHorizontal: 8,
          }}>
            {[
              { id: 'facebook', icon: 'heart-outline' },
              { id: 'recent', icon: 'clock-outline' },
              { id: 'smileys', icon: 'emoticon-outline' },
              { id: 'animals', icon: 'cat' },
              { id: 'food', icon: 'silverware-fork-knife' },
              { id: 'activities', icon: 'soccer' },
              { id: 'travel', icon: 'car-outline' },
              { id: 'objects', icon: 'lightbulb-outline' },
              { id: 'symbols', icon: 'shape-outline' }
            ].map((tab) => (
              <TouchableOpacity
                key={`tab-${tab.id}`}
                onPress={() => handleScrollToSection(tab.id)}
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons 
                  name={tab.icon as any} 
                  size={22} 
                  color={colors.textSecondary} 
                  style={{ opacity: 0.8 }}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}
