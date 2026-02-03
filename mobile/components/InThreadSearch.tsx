import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';

export type ChatMessage = {
  id: string;
  text?: string;
  time?: string;
  fromMe?: boolean;
  type?: 'text' | 'sticker' | 'contact' | 'separator';
};

type Props = {
  messages?: ChatMessage[];
  // external controlled state
  query: string;
  onQueryChange: (q: string) => void;
  resultIndices: number[];
  currentResultIndex: number;
  onSetCurrentResultIndex: (i: number) => void;
  onClose?: () => void;
  onScrollToMessage?: (messageIndex: number) => void; // index in messages array
  renderMode?: 'both' | 'header' | 'bottom';
};

export default function InThreadSearch({
  messages = [],
  query,
  onQueryChange,
  resultIndices,
  currentResultIndex,
  onSetCurrentResultIndex,
  onClose,
  onScrollToMessage,
  renderMode = 'both',
}: Props) {
  const { colors } = useTheme();

  const hasResults = query.trim().length > 0 && resultIndices.length > 0;

  const scrollToResult = (resultIdx: number) => {
    if (!resultIndices.length) return;
    const clamped = Math.max(0, Math.min(resultIdx, resultIndices.length - 1));
    onSetCurrentResultIndex(clamped);
    const msgIndex = resultIndices[clamped];
    if (typeof msgIndex === 'number' && onScrollToMessage) onScrollToMessage(msgIndex);
  };

  const goPrev = () => scrollToResult(currentResultIndex - 1);
  const goNext = () => scrollToResult(currentResultIndex + 1);

  return (
    <View>
      {/* Header search bar */}
      {renderMode !== 'bottom' && (
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { onQueryChange(''); onSetCurrentResultIndex(0); onClose?.(); }} style={{ paddingRight: 8 }}>
              <MaterialIcons name="arrow-back" color={colors.text} size={24} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12, height: 40 }}>
                <MaterialIcons name="search" color={colors.textSecondary} size={20} />

                <TextInput
                  placeholder="Tìm tin nhắn văn bản..."
                  placeholderTextColor={colors.textSecondary}
                  value={query}
                  onChangeText={onQueryChange}
                  style={{ flex: 1, color: colors.text, fontSize: 14, marginLeft: 10 }}
                  autoFocus={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Bottom result bar (fixed place where parent should render it) */}
      {renderMode !== 'header' && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <Text style={{ color: colors.text }}>{hasResults ? `Kết quả thứ ${currentResultIndex + 1}/${resultIndices.length}` : ''}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={goPrev} disabled={!hasResults} style={{ padding: 8 }}>
              <MaterialIcons name="expand-less" color={!hasResults ? colors.textSecondary : colors.text} size={20} />
            </TouchableOpacity>

            <TouchableOpacity onPress={goNext} disabled={!hasResults} style={{ padding: 8 }}>
              <MaterialIcons name="expand-more" color={!hasResults ? colors.textSecondary : colors.text} size={20} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
