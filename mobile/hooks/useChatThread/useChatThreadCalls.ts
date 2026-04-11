import { useCallback } from 'react';

type StartCallFn = (payload: {
  conversationId: string;
  callType: 'voice' | 'video';
  remoteUserId: number;
  remoteName: string;
  remoteAvatar?: string;
}) => void;

interface UseChatThreadCallsParams {
  isGroupParam?: string;
  targetUserIdState: string | null;
  conversationId: string | null;
  paramName?: string;
  targetUser: any;
  paramAvatar?: string;
  startCall: StartCallFn;
}

export function useChatThreadCalls({
  isGroupParam,
  targetUserIdState,
  conversationId,
  paramName,
  targetUser,
  paramAvatar,
  startCall,
}: UseChatThreadCallsParams) {
  const startVoiceCall = useCallback(() => {
    if (isGroupParam === 'true' || !targetUserIdState || !conversationId) return;
    startCall({
      conversationId,
      callType: 'voice',
      remoteUserId: Number(targetUserIdState),
      remoteName: paramName || targetUser?.fullName || 'User',
      remoteAvatar: targetUser?.avatar || paramAvatar || undefined,
    });
  }, [
    isGroupParam,
    targetUserIdState,
    conversationId,
    paramName,
    targetUser,
    paramAvatar,
    startCall,
  ]);

  const startVideoCall = useCallback(() => {
    if (isGroupParam === 'true' || !targetUserIdState || !conversationId) return;
    startCall({
      conversationId,
      callType: 'video',
      remoteUserId: Number(targetUserIdState),
      remoteName: paramName || targetUser?.fullName || 'User',
      remoteAvatar: targetUser?.avatar || paramAvatar || undefined,
    });
  }, [
    isGroupParam,
    targetUserIdState,
    conversationId,
    paramName,
    targetUser,
    paramAvatar,
    startCall,
  ]);

  return {
    startVoiceCall,
    startVideoCall,
  };
}
