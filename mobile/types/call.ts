export type CallType = 'voice' | 'video';

export type CallStatus =
  | 'idle'
  | 'incoming'
  | 'calling'    // outgoing, waiting for accept
  | 'connecting' // accepted, WebRTC negotiating
  | 'active'
  | 'ended';

export type CallTarget = {
  userId: number;
  fullName?: string;
  avatar?: string;
};

export type CallInfo = {
  callId: string;
  conversationId: number | string;
  callType: CallType;
  isOutgoing: boolean;
  remoteUserId?: number;
  remoteName: string;
  remoteAvatar?: string;
  groupTargets?: CallTarget[];
  targetUserIds?: number[];
};
