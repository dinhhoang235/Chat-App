import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomSheet, { BottomSheetTextInput, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/themeContext";
import { giphyApi, type GiphyGif } from "@/services/giphy";

const GRID_GAP = 6;

type GiphySearchSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gif: GiphyGif) => void | Promise<void>;
  sending?: boolean;
};

export default function GiphySearchSheet({
  visible,
  onClose,
  onSelectGif,
  sending,
}: GiphySearchSheetProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const searchInputRef = useRef<any>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextQueryLoad = useRef(false);
  const wasVisible = useRef(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadedIds, setLoadedIds] = useState<Record<string, boolean>>({});

  const snapPoints = useMemo(() => {
    return [Math.round(Dimensions.get("window").height * 0.90)];
  }, []);

  const gridWidth = Dimensions.get("window").width - 24;
  const itemWidth = Math.floor((gridWidth - GRID_GAP * 2) / 3);

  const loadGifs = useCallback(async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    setLoading(true);
    setErrorText(null);

    try {
      const result = trimmed
        ? await giphyApi.search(trimmed)
        : await giphyApi.trending();
      setGifs(result);
      setLoadedIds({});
    } catch (error) {
      console.error("GIPHY load error:", error);
      setErrorText("Khong tai duoc GIF");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      wasVisible.current = true;
      setQuery("");
      sheetRef.current?.snapToIndex(0);
      skipNextQueryLoad.current = true;
      void loadGifs("");
      setTimeout(() => {
        searchInputRef.current?.focus?.();
      }, 400);
    } else if (!visible) {
      wasVisible.current = false;
      sheetRef.current?.close();
    }
  }, [loadGifs, query, visible]);

  useEffect(() => {
    if (!visible) return;
    if (skipNextQueryLoad.current) {
      skipNextQueryLoad.current = false;
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void loadGifs(query);
    }, 350);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [loadGifs, query, visible]);

  useEffect(() => {
    if (!visible || gifs.length === 0) return;
    const previewUris = gifs
      .slice(0, 12)
      .flatMap((gif) => [gif.stillPreviewUrl, gif.previewUrl])
      .filter((uri): uri is string => Boolean(uri));
    void Image.prefetch(previewUris, "memory-disk");
  }, [gifs, visible]);

  const handleSelect = useCallback(
    async (gif: GiphyGif) => {
      if (sending) return;
      setSelectedId(gif.id);
      try {
        await onSelectGif(gif);
      } finally {
        setSelectedId(null);
      }
    },
    [onSelectGif, sending],
  );

  const renderGifItem = useCallback(
    ({ item }: { item: GiphyGif }) => {
      const isSelected = selectedId === item.id;
      return (
        <TouchableOpacity
          onPress={() => void handleSelect(item)}
          activeOpacity={0.85}
          disabled={sending}
          style={{
            width: itemWidth,
            height: itemWidth,
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: colors.surfaceVariant,
          }}
        >
          {!loadedIds[item.id] && (
            <Image
              source={{ uri: item.stillPreviewUrl || item.previewUrl }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          )}
          <Image
            source={{ uri: item.previewUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.id}
            transition={80}
            onLoadEnd={() =>
              setLoadedIds((prev) =>
                prev[item.id] ? prev : { ...prev, [item.id]: true },
              )
            }
          />
          {!loadedIds[item.id] && !isSelected && (
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            />
          )}
          {isSelected && (
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.25)",
              }}
            >
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [itemWidth, selectedId, sending, colors, loadedIds, handleSelect],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      enableDynamicSizing={false}
      containerStyle={{ pointerEvents: "box-none" }}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={{ backgroundColor: colors.textSecondary, width: 40 }}
    >
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.border || colors.surfaceVariant,
          }}
        >
          <MaterialIcons name="gif" size={28} color={colors.tint} />
          <BottomSheetTextInput
            ref={searchInputRef}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            blurOnSubmit={false}
            returnKeyType="search"
            placeholder="Tim GIF tu GIPHY"
            placeholderTextColor={colors.textSecondary}
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 18,
              marginLeft: 8,
              paddingVertical: 4,
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
              <MaterialIcons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {loading && gifs.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.tint} />
          </View>
        ) : errorText ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.textSecondary }}>{errorText}</Text>
          </View>
        ) : (
          <BottomSheetFlatList<GiphyGif>
            data={gifs}
            keyExtractor={(item: GiphyGif) => item.id}
            numColumns={3}
            keyboardShouldPersistTaps="never"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingBottom: 120,
            }}
            columnWrapperStyle={{ gap: GRID_GAP, marginBottom: GRID_GAP }}
            renderItem={renderGifItem}
          />
        )}
      </View>
    </BottomSheet>
  );
}
