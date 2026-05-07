import AsyncStorage from "@react-native-async-storage/async-storage";

const CONVERSATION_LIST_CACHE_PREFIX = "conversation_list_cache:";

const getConversationListCacheKey = (userId: number | string) =>
  `${CONVERSATION_LIST_CACHE_PREFIX}${userId}`;

const normalizeCachedConversations = (conversations: any[], colors: any) => {
  return conversations.map((conversation) => ({
    ...conversation,
    color: conversation.isGroup
      ? colors.tint
      : conversation.avatar
        ? undefined
        : colors.tint,
  }));
};

export const loadConversationListCache = async (
  userId: number | string,
  colors: any,
) => {
  try {
    const cached = await AsyncStorage.getItem(
      getConversationListCacheKey(userId),
    );
    if (!cached) return [] as any[];

    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed)) return [] as any[];

    return normalizeCachedConversations(parsed, colors);
  } catch {
    return [] as any[];
  }
};

export const saveConversationListCache = async (
  userId: number | string,
  conversations: any[],
) => {
  try {
    await AsyncStorage.setItem(
      getConversationListCacheKey(userId),
      JSON.stringify(conversations),
    );
  } catch {
    // ignore cache failures
  }
};
