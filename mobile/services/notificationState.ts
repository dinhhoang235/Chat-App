// A simple module to keep track of which conversation the user is currently viewing.
// This allows our notification handler to avoid showing a notification when the user
// is already looking at the conversation that just received a message.

export let activeConversationId: string | null = null;

export function setActiveConversationId(id: string | null) {
  activeConversationId = id;
}
