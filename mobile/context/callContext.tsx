import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'expo-router';
import { socketService } from '@/services/socket';
import { useAuth } from './authContext';

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

  // Ref to avoid stale closure in socket handlers
  const activeCallRef = useRef<CallInfo | null>(null);
  activeCallRef.current = activeCall;

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

    return () => {
      socketService.off('incoming_call', handleIncomingCall);
      socketService.off('call_rejected', handleCallRejected);
      socketService.off('call_ended', handleCallEnded);
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
