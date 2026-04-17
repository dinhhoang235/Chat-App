import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { socketService } from '@/services/socket';
import { groupCallService } from '@/services/groupCall';
import { useAuth } from './authContext';
import * as Notifications from 'expo-notifications';
import { useAudioPlayer } from 'expo-audio';
import { 
  CallStatus, 
  CallType, 
  CallTarget, 
  CallInfo 
} from '@/types/call';

export type { CallType, CallStatus, CallTarget, CallInfo };

interface CallContextType {
  incomingCall: CallInfo | null;
  activeCall: CallInfo | null;
  callStatus: CallStatus;
  startCall: (params: {
    conversationId: number | string;
    callType: CallType;
    remoteUserId?: number;
    remoteName?: string;
    remoteAvatar?: string;
    targetUsers?: CallTarget[];
  }) => Promise<void>;
  acceptCall: () => void;
  joinCall: (incoming: CallInfo) => void;
  rejectCall: () => void;
  joinExistingGroupCall: (conversationId: number | string) => Promise<boolean>;
  endCall: () => void;
  setCallStatus: React.Dispatch<React.SetStateAction<CallStatus>>;
  setIncomingCall: (info: CallInfo | null) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const generateCallId = () =>
  `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [currentAppState, setCurrentAppState] = useState(AppState.currentState);
  const [callDuration, setCallDuration] = useState(0);

  // Audio player for ringtone
  const ringtonePlayer = useAudioPlayer(require('@/assets/sounds/ringtone.mp3'));
  ringtonePlayer.loop = true;

  // Ref to avoid stale closure in socket handlers
  const activeCallRef = useRef<CallInfo | null>(null);
  activeCallRef.current = activeCall;
  const incomingCallRef = useRef<CallInfo | null>(null);
  incomingCallRef.current = incomingCall;

  // Timer for active call
  useEffect(() => {
    let interval: any;
    if (callStatus === 'active') {
      const startTime = Date.now();
      setCallDuration(0);
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Handle ringtone playback
  useEffect(() => {
    if (!ringtonePlayer) return;

    // Only play ringtone for incoming calls (receiver/callee)
    if (callStatus === 'incoming') {
      ringtonePlayer.play();
    } else {
      ringtonePlayer.pause();
      ringtonePlayer.seekTo(0);
    }
  }, [callStatus, ringtonePlayer]);

  const queryActiveCall = useCallback(
    async (conversationId: number | string) =>
      new Promise<any>((resolve) => {
        socketService.emit('query_active_call', { conversationId }, (response: any) => {
          resolve(response);
        });
      }),
    [],
  );

  useEffect(() => {
    const handleIncomingCall = (data: any) => {
      console.log('Incoming call received:', data.callId, 'from:', data.callerId);
      // Skip if already in a call
      if (activeCallRef.current) {
        console.log('Incoming call ignored: active call in progress');
        return;
      }
      const incomingGroupTargets: CallTarget[] | undefined = Array.isArray(data.groupTargets)
        ? data.groupTargets
        : Array.isArray(data.groupTargets?.groupTargets)
        ? data.groupTargets.groupTargets
        : undefined;

      const info: CallInfo = {
        callId: data.callId,
        conversationId: data.conversationId,
        callType: data.callType,
        isOutgoing: false,
        remoteUserId: data.callerId,
        remoteName: data.callerName || 'Unknown',
        remoteAvatar: data.callerAvatar,
        groupTargets: incomingGroupTargets,
        isGroupCall: Boolean(data.isGroupCall || (incomingGroupTargets && incomingGroupTargets.length > 2)),
      };
      setIncomingCall(info);
      setCallStatus('incoming');
    };

    const handleCallRejected = (data: any) => {
      if (data?.final) {
        setActiveCall(null);
        setCallStatus('ended');
      } else {
        console.log('[Call] One invite rejected, still waiting for others', data);
      }
    };

    const handleCallEnded = (data: any) => {
      if (activeCallRef.current && data?.callId && data.callId !== activeCallRef.current.callId) {
        return;
      }
      setActiveCall(null);
      setIncomingCall(null);
      setCallStatus('ended');
    };

    const handleParticipantJoined = (data: any) => {
      console.log('[Call] Participant joined:', data);
      if (activeCallRef.current && data.callId === activeCallRef.current.callId) {
        setActiveCall(prev => {
          if (!prev) return null;
          // You might want to fetch user details here if not in groupTargets
          // For now, we just ensure they are in targetUserIds
          const invitedIds = new Set(prev.targetUserIds || []);
          invitedIds.add(Number(data.userId));
          
          const groupTargets = [...(prev.groupTargets || [])];
          const existingIdx = groupTargets.findIndex(t => Number(t.userId) === Number(data.userId));
          if (existingIdx > -1) {
             groupTargets[existingIdx] = {
               ...groupTargets[existingIdx],
               fullName: data.fullName || groupTargets[existingIdx].fullName,
               avatar: data.avatar || groupTargets[existingIdx].avatar,
             };
          } else {
             groupTargets.push({
               userId: Number(data.userId),
               fullName: data.fullName,
               avatar: data.avatar,
             });
          }

          return {
            ...prev,
            targetUserIds: Array.from(invitedIds),
            groupTargets,
          };
        });
      }
    };

    const handleParticipantLeft = (data: any) => {
      console.log('[Call] Participant left:', data);
      if (activeCallRef.current && data.callId === activeCallRef.current.callId) {
        if (data.userId === Number(user?.id)) {
           // Self left
           setActiveCall(null);
           setCallStatus('ended');
        } else {
           // Someone else left
           setActiveCall(prev => {
             if (!prev) return null;
             const invitedIds = new Set(prev.targetUserIds || []);
             invitedIds.delete(Number(data.userId));
             return {
               ...prev,
               targetUserIds: Array.from(invitedIds)
             };
           });
        }
      }
    };

    socketService.on('incoming_call', handleIncomingCall);
    socketService.on('call_rejected', handleCallRejected);
    socketService.on('call_ended', handleCallEnded);
    socketService.on('participant_joined', handleParticipantJoined);
    socketService.on('participant_left', handleParticipantLeft);

    // Foreground notification behavior - show banners even when app is active for calls
    Notifications.setNotificationHandler({
      handleNotification: async (notification: any) => {
        // Mute notification sound if it's a call related notification to avoid clashing with ringtone
        const isCall = notification.request.content.data?.type === 'call' || 
                      notification.request.content.categoryIdentifier === 'call';
        
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: !isCall, // Only play sound if NOT a call
          shouldSetBadge: false,
        };
      },
    });

    const sub = AppState.addEventListener('change', nextState => {
      setCurrentAppState(nextState);
    });

    return () => {
      socketService.off('incoming_call', handleIncomingCall);
      socketService.off('call_rejected', handleCallRejected);
      socketService.off('call_ended', handleCallEnded);
      socketService.off('participant_joined', handleParticipantJoined);
      socketService.off('participant_left', handleParticipantLeft);
      sub.remove();
    };
  }, [user?.id]);

  const startCall = useCallback(
    async (params: {
      conversationId: number | string;
      callType: CallType;
      remoteUserId?: number;
      remoteName?: string;
      remoteAvatar?: string;
      targetUsers?: CallTarget[];
    }) => {
      if (!user) return;

      const initialGroupTargets = params.targetUsers?.map((target) => ({
        userId: Number(target.userId),
        fullName: target.fullName,
        avatar: target.avatar,
      }));

      let callId = generateCallId();
      let groupTargets = initialGroupTargets;
      let useExistingCall = false;
      let existingCallInfo: any = null;

      if (params.callType === 'video' && Array.isArray(initialGroupTargets) && initialGroupTargets.length > 1) {
        const response = await queryActiveCall(params.conversationId);
        if (response?.callId && response?.callInfo) {
          const activeCallInfo = response.callInfo;
          const isGroupVideoCall = activeCallInfo.callType === 'video' && (activeCallInfo.invitedUserIds?.length ?? 0) > 1;
          if (isGroupVideoCall) {
            useExistingCall = true;
            callId = response.callId;
            existingCallInfo = activeCallInfo;
            groupTargets = activeCallInfo.groupTargets ?? initialGroupTargets;
            console.log('[Call] Joining existing active group call:', callId);
          }
        }
      }

      const firstTarget = initialGroupTargets?.[0];
      const remoteUserId = params.remoteUserId ?? firstTarget?.userId;
      const remoteName = params.remoteName || firstTarget?.fullName || 'User';
      const remoteAvatar = params.remoteAvatar || firstTarget?.avatar || undefined;
      const isExplicitGroupCall = params.targetUsers !== undefined;

      const call: CallInfo = {
        callId,
        isOutgoing: true,
        conversationId: params.conversationId,
        callType: params.callType,
        remoteUserId,
        remoteName,
        remoteAvatar,
        targetUserIds: groupTargets?.map((target) => Number(target.userId)),
        groupTargets,
        isGroupCall: isExplicitGroupCall,
      };
      setActiveCall(call);
      setCallStatus(useExistingCall ? 'connecting' : 'calling');

      let inviteTargets = initialGroupTargets?.length ? initialGroupTargets : [{ userId: Number(remoteUserId), fullName: remoteName, avatar: remoteAvatar }];
      if (useExistingCall && existingCallInfo?.invitedUserIds?.length) {
        const existingIds = new Set(existingCallInfo.invitedUserIds.map((id: number) => Number(id)));
        inviteTargets = inviteTargets.filter((target) => !existingIds.has(Number(target.userId)));
      }

      if (inviteTargets.length > 0) {
        inviteTargets.forEach((target) => {
          socketService.emit('call_invite', {
            callId,
            conversationId: params.conversationId,
            targetUserId: target.userId,
            callType: params.callType,
            callerName: user.fullName,
            callerAvatar: user.avatar || '',
            groupTargets: inviteTargets,
            isGroupCall: isExplicitGroupCall,
          });
        });
      }

      if (isExplicitGroupCall) {
        router.replace('/groupCall' as any);
      } else if (params.callType === 'video') {
        router.replace('/videoCall' as any);
      } else {
        router.replace('/call' as any);
      }
    },
    [user, router, queryActiveCall],
  );

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    const call: CallInfo = { ...incomingCall };
    setActiveCall(call);
    setIncomingCall(null);
    setCallStatus('connecting');

    const isGroupCall = call.isGroupCall;
    if (isGroupCall) {
      router.replace('/groupCall' as any);
    } else if (call.callType === 'video') {
      router.replace('/videoCall' as any);
    } else {
      router.replace('/call' as any);
    }
  }, [incomingCall, router]);

  const joinCall = useCallback((incoming: CallInfo) => {
    if (!incoming) return;
    const call: CallInfo = { ...incoming };
    setActiveCall(call);
    setIncomingCall(null);
    setCallStatus('connecting');

    const isGroupCall = call.isGroupCall;
    if (isGroupCall) {
      router.replace('/groupCall' as any);
    } else if (call.callType === 'video') {
      router.replace('/videoCall' as any);
    } else {
      router.replace('/call' as any);
    }
  }, [router]);

  const joinExistingGroupCall = useCallback(
    async (conversationId: number | string) => {
      if (!conversationId) return false;

      const response = await new Promise<any>((resolve) => {
        socketService.emit('query_active_call', { conversationId }, (res: any) => {
          resolve(res);
        });
      });

      if (!response?.callId || !response?.callInfo) {
        return false;
      }

      const callInfo = response.callInfo;
      const isGroupVideoCall = callInfo.callType === 'video' && (callInfo.invitedUserIds?.length ?? 0) > 1;
      if (!isGroupVideoCall) {
        return false;
      }

      const incomingCallInfo: CallInfo = {
        callId: response.callId,
        conversationId,
        callType: 'video',
        isOutgoing: false,
        remoteUserId: callInfo.callerId,
        remoteName: callInfo.callerName || 'Cuộc gọi nhóm',
        remoteAvatar: callInfo.callerAvatar,
        groupTargets: callInfo.groupTargets,
        targetUserIds: callInfo.invitedUserIds,
        isGroupCall: Boolean(callInfo.isGroupCall || (callInfo.groupTargets && callInfo.groupTargets.length > 2)),
      };

      joinCall(incomingCallInfo);
      return true;
    },
    [joinCall],
  );

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    socketService.emit('call_reject', {
      callId: incomingCall.callId,
      callerId: incomingCall.remoteUserId,
    });
    setIncomingCall(null);
    setCallStatus('idle');
  }, [incomingCall]);

  const endCall = useCallback(() => {
    const call = activeCall || incomingCall;
    if (!call) return;
    socketService.emit('call_end', {
      callId: call.callId,
      targetUserId: call.remoteUserId,
    });
    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus('ended');
  }, [activeCall, incomingCall]);

  useEffect(() => {
    return () => {
      const call = activeCallRef.current || incomingCallRef.current;
      if (call) {
        socketService.emit('call_end', {
          callId: call.callId,
          targetUserId: call.remoteUserId,
        });
      }
      groupCallService.leave();
      socketService.disconnect();
    };
  }, []);

  // Handle persistent notification for active/incoming calls
  useEffect(() => {
    const NOTIF_ID = 'active-call-persistent';

    if (callStatus === 'idle' || callStatus === 'ended') {
      Notifications.dismissNotificationAsync(NOTIF_ID).catch(() => {});
      return;
    }

    const currentCall = activeCall || incomingCall;
    if (!currentCall) return;

    const formatTime = (secs: number) => {
      const mins = Math.floor(secs / 60);
      const s = secs % 60;
      return `${mins}:${s.toString().padStart(2, '0')}`;
    };

    const isGroupCall = currentCall.isGroupCall;
    let title = 'Cuộc gọi';
    let body = '';

    if (callStatus === 'active') {
      if (isGroupCall) {
        title = `Cuộc gọi nhóm đang diễn ra (${formatTime(callDuration)})`;
        body = '';
      } else {
        title = `Đang trong cuộc gọi với ${currentCall.remoteName} (${formatTime(callDuration)})`;
        body = '';
      }
    } else if (callStatus === 'calling') {
      if (isGroupCall) {
        title = `${currentCall.remoteName} đang bắt đầu gọi nhóm`;
        body = '';
      } else {
        title = `Cuộc gọi ${currentCall.callType === 'video' ? 'video' : 'thoại'} đi`;
        body = `Đang gọi cho ${currentCall.remoteName}...`;
      }
    } else if (callStatus === 'incoming') {
      if (isGroupCall) {
        title = `${currentCall.remoteName} đang bắt đầu gọi nhóm`;
        body = 'Nhấn để tham gia';
      } else {
        title = `Cuộc gọi ${currentCall.callType === 'video' ? 'video' : 'thoại'} đến`;
        body = `${currentCall.remoteName} đang gọi cho bạn...`;
      }
    } else if (callStatus === 'connecting') {
      if (isGroupCall) {
        title = `Cuộc gọi nhóm đang diễn ra (${formatTime(callDuration)})`;
        body = '';
      } else {
        title = `Đang kết nối cuộc gọi...`;
        body = `${currentCall.remoteName}`;
      }
    }

    Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title,
        body,
        data: {
          type: 'call',
          callId: currentCall.callId,
          conversationId: currentCall.conversationId,
          callType: currentCall.callType,
          callerName: currentCall.remoteName,
          callerAvatar: currentCall.remoteAvatar,
          callerId: currentCall.remoteUserId,
        },
        sticky: true,
        autoDismiss: false,
        sound: null, // Fully disable sound for local call notifications
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' && {
          android: {
            channelId: 'call',
            sticky: true,
            sound: null, // Null is more explicit for disabling sound
          },
        }),
      },
      trigger: null,
    }).catch((err: any) => console.error('Failed to schedule local call notification:', err));
  }, [callStatus, activeCall, incomingCall, currentAppState, callDuration]);

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        activeCall,
        callStatus,
        startCall,
        acceptCall,
        joinCall,
        joinExistingGroupCall,
        rejectCall,
        endCall,
        setCallStatus,
        setIncomingCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};
