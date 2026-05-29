const chatThreadMessagesCache = new Map<string, any[]>();
const groupDetailsCache = new Map<string, any>();

const normalizeConversationId = (conversationId: string | number) => {
  return conversationId.toString();
};

export const chatThreadCache = {
  setMessages(conversationId: string | number, messages: any[]) {
    chatThreadMessagesCache.set(
      normalizeConversationId(conversationId),
      messages,
    );
  },

  getMessages(conversationId: string | number) {
    return (
      chatThreadMessagesCache.get(normalizeConversationId(conversationId)) || []
    );
  },

  hasMessages(conversationId: string | number) {
    return chatThreadMessagesCache.has(normalizeConversationId(conversationId));
  },

  clearMessages(conversationId?: string | number) {
    if (conversationId == null) {
      chatThreadMessagesCache.clear();
      return;
    }

    chatThreadMessagesCache.delete(normalizeConversationId(conversationId));
  },

  setGroupDetails(conversationId: string | number, details: any) {
    groupDetailsCache.set(normalizeConversationId(conversationId), details);
  },

  getGroupDetails(conversationId: string | number) {
    return groupDetailsCache.get(normalizeConversationId(conversationId)) || null;
  },

  hasGroupDetails(conversationId: string | number) {
    return groupDetailsCache.has(normalizeConversationId(conversationId));
  },

  clearGroupDetails(conversationId?: string | number) {
    if (conversationId == null) {
      groupDetailsCache.clear();
      return;
    }
    groupDetailsCache.delete(normalizeConversationId(conversationId));
  },
};
