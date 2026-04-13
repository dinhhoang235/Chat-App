import { useCallback } from 'react';
import { useCall } from '@/context/callContext';

type Params = {
  conversationId: string | null;
  openGroupVideoCallModal: () => void;
};

export function useChatThreadGroupCall({ conversationId, openGroupVideoCallModal }: Params) {
  const { joinExistingGroupCall } = useCall();

  const handleGroupVideoHeaderPress = useCallback(async () => {
    if (!conversationId) {
      openGroupVideoCallModal();
      return false;
    }

    const joined = await joinExistingGroupCall(conversationId);
    if (!joined) {
      openGroupVideoCallModal();
    }
    return joined;
  }, [conversationId, joinExistingGroupCall, openGroupVideoCallModal]);

  return { handleGroupVideoHeaderPress };
}
