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
import { useAuth } from './authContext';
import * as Notifications from 'expo-notifications';
import { useAudioPlayer } from 'expo-audio';

export type CallType = 'voice' | 'video';

export type CallStatus =
  | 'idle'
  | 'incoming'
  | 'calling'    // outgoing, waiting for accept
  | 'connecting' // accepted, WebRTC negotiating
  | 'active'
  | 'ended';

export interface CallInfo {
  callId: string;
  conversationId: number | string;
  callType: CallType;
  isOutgoing: boolean;
  remoteUserId: number;
  remoteName: string;
  remoteAvatar?: string;
}

interface CallContextType {
  incomingCall: CallInfo | null;
  activeCall: CallInfo | null;
  callStatus: CallStatus;
  startCall: (params: {
    conversationId: number | string;
    callType: CallType;
    remoteUserId: number;
    remoteName: string;
    remoteAvatar?: string;
  }) => void;
  acceptCall: () => void;
  rejectCall: () => void;
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

    if (callStatus === 'incoming' || callStatus === 'calling') {
      ringtonePlayer.play();
    } else {
      ringtonePlayer.pause();
      ringtonePlayer.seekTo(0);
    }
  }, [callStatus, ringtonePlayer]);

  useEffect(() => {
    const handleIncomingCall = (data: any) => {
      console.log('Incoming call received:', data.callId, 'from:', data.callerId);
      // Skip if already in a call
      if (activeCallRef.current) {
        console.log('Incoming call ignored: active call in progress');
        return;
      }
      const info: CallInfo = {
        callId: data.callId,
        conversationId: data.conversationId,
        callType: data.callType,
        isOutgoing: false,
        remoteUserId: data.callerId,
        remoteName: data.callerName || 'Unknown',
        remoteAvatar: data.callerAvatar,
      };
      setIncomingCall(info);
      setCallStatus('incoming');
    };

    const handleCallRejected = () => {
      setActiveCall(null);
      setCallStatus('ended');
    };

    const handleCallEnded = () => {
      setActiveCall(null);
      setIncomingCall(null);
      setCallStatus('ended');
    };

    socketService.on('incoming_call', handleIncomingCall);
    socketService.on('call_rejected', handleCallRejected);
    socketService.on('call_ended', handleCallEnded);

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
      sub.remove();
    };
  }, []);

  const startCall = useCallback(
    (params: {
      conversationId: number | string;
      callType: CallType;
      remoteUserId: number;
      remoteName: string;
      remoteAvatar?: string;
    }) => {
      if (!user) return;
      const callId = generateCallId();
      const call: CallInfo = {
        callId,
        isOutgoing: true,
        ...params,
      };
      setActiveCall(call);
      setCallStatus('calling');

      socketService.emit('call_invite', {
        callId,
        conversationId: params.conversationId,
        targetUserId: params.remoteUserId,
        callType: params.callType,
        callerName: user.fullName,
        callerAvatar: user.avatar || '',
      });

      if (params.callType === 'video') {
        router.replace('/videoCall' as any);
      } else {
        router.replace('/call' as any);
      }
    },
    [user, router],
  );

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    const call: CallInfo = { ...incomingCall };
    setActiveCall(call);
    setIncomingCall(null);
    setCallStatus('connecting');

    // Notify server that we accepted
    socketService.emit('call_accept', {
      callId: call.callId,
      callerId: call.remoteUserId,
    });

    if (call.callType === 'video') {
      router.replace('/videoCall' as any);
    } else {
      router.replace('/call' as any);
    }
  }, [incomingCall, router]);

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

    let title = 'Cuộc gọi';
    let body = `${currentCall.remoteName} đang gọi...`;

    if (callStatus === 'active') {
      title = `Đang trong cuộc gọi với ${currentCall.remoteName} (${formatTime(callDuration)})`;
      body = ''; 
    } else if (callStatus === 'calling' || callStatus === 'incoming') {
      title = `Cuộc gọi ${currentCall.callType === 'video' ? 'video' : 'thoại'} đến`;
      body = `${currentCall.remoteName} đang gọi cho bạn...`;
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
