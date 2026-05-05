const chatThreadMessagesCache = new Map<string, any[]>();

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
};
