import { useCallback } from 'react';

type CallTarget = {
  userId: number;
  fullName?: string;
  avatar?: string;
};

type StartCallFn = (payload: {
  conversationId: string;
  callType: 'voice' | 'video';
  remoteUserId?: number;
  remoteName?: string;
  remoteAvatar?: string;
  targetUsers?: CallTarget[];
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

type VideoCallTarget = {
  id: number;
  fullName?: string;
  avatar?: string;
};

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

  const startVideoCallToTarget = useCallback((target: VideoCallTarget) => {
    if (!conversationId || !target?.id) return;
    startCall({
      conversationId,
      callType: 'video',
      remoteUserId: Number(target.id),
      remoteName: target.fullName || 'User',
      remoteAvatar: target.avatar || undefined,
    });
  }, [conversationId, startCall]);

  const startGroupVideoCall = useCallback((targets: VideoCallTarget[]) => {
    if (!conversationId || targets.length === 0) return;
    startCall({
      conversationId,
      callType: 'video',
      targetUsers: targets.map((target) => ({
        userId: target.id,
        fullName: target.fullName,
        avatar: target.avatar,
      })),
    });
  }, [conversationId, startCall]);

  return {
    startVoiceCall,
    startVideoCall,
    startVideoCallToTarget,
    startGroupVideoCall,
  };
}
