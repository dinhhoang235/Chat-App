import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCall } from '@/context/callContext';
import { useAuth } from '@/context/authContext';
import { groupCallService } from '@/services/groupCall';
import GroupVideoCall, { GroupParticipant } from '@/components/call/GroupVideoCall';

export default function GroupCallScreen() {
  const router = useRouter();
  const { activeCall, callStatus, endCall, setCallStatus } = useCall();
  const { user } = useAuth();

  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, string>>({});
  const [remoteVideoTracks, setRemoteVideoTracks] = useState<Record<number, any>>({});
  const [connectedIds, setConnectedIds] = useState<number[]>([]);
  const [cameraStatuses, setCameraStatuses] = useState<Record<number, boolean>>({});
  const [micStatuses, setMicStatuses] = useState<Record<number, boolean>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [duration, setDuration] = useState(0);

  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;

  const activeCallId = activeCall?.callId;
  const activeCallType = activeCall?.callType;
  const activeCallGroupSize = activeCall?.groupTargets?.length ?? 0;
  const userId = Number(user?.id ?? -1);

  useEffect(() => {
    if (!activeCallId || activeCallGroupSize === 0) {
      return;
    }

    let mounted = true;
    
    // Reset state when starting
    setLocalStreamURL(null);
    setLocalVideoTrack(null);
    setRemoteStreams({});
    setRemoteVideoTracks({});
    setConnectedIds([]);

    groupCallService.onParticipantsChanged = (streams, tracks) => {
      if (!mounted) return;
      
      const newRemoteStreams: Record<number, string> = {};
      const newRemoteTracks: Record<number, any> = {};

      streams.forEach((stream, sid) => {
        const identity = groupCallService.participantIdentities.get(sid);
        if (identity && identity.startsWith('user-')) {
          const uId = Number(identity.replace('user-', ''));
          newRemoteStreams[uId] = (stream as any).toURL();
          
          const vTrack = tracks.get(sid);
          if (vTrack) newRemoteTracks[uId] = vTrack;
        }
      });

      setRemoteStreams(newRemoteStreams);
      setRemoteVideoTracks(newRemoteTracks);

      const ids: number[] = [];
      groupCallService.participantIdentities.forEach((identity) => {
        if (identity.startsWith('user-')) {
          ids.push(Number(identity.replace('user-', '')));
        }
      });
      setConnectedIds(ids);

      setCameraStatuses(prev => {
        const next = { ...prev };
        streams.forEach((stream, sid) => {
          const identity = groupCallService.participantIdentities.get(sid);
          if (identity && identity.startsWith('user-')) {
            const uId = Number(identity.replace('user-', ''));
            const videoTrack = stream.getVideoTracks()[0];
            next[uId] = !!videoTrack && videoTrack.enabled !== false && videoTrack.readyState === 'live';
          }
        });
        return next;
      });

      setMicStatuses(prev => {
        const next = { ...prev };
        streams.forEach((stream, sid) => {
          const identity = groupCallService.participantIdentities.get(sid);
          if (identity && identity.startsWith('user-')) {
            const uId = Number(identity.replace('user-', ''));
            const audioTrack = stream.getAudioTracks()[0];
            next[uId] = !!audioTrack && audioTrack.enabled !== false && audioTrack.readyState === 'live';
          }
        });
        return next;
      });
      
      if (streams.size > 0 && mounted) {
        setCallStatus('active');
      }
    };

    groupCallService.onRemoteTrackMuted = (muted, identity, kind) => {
      if (!mounted || !identity) return;
      if (identity.startsWith('user-')) {
        const uId = Number(identity.replace('user-', ''));
        if (kind === 'video') {
          setCameraStatuses(prev => ({ ...prev, [uId]: !muted }));
        } else if (kind === 'audio') {
          setMicStatuses(prev => ({ ...prev, [uId]: !muted }));
        }
      }
    };

    groupCallService.onConnectionStateChange = (state) => {
      if (!mounted) return;
      console.log('[GroupCall] connection state:', state);
      if (state === 'connected') {
        setCallStatus('active');
      }
      if (state === 'failed' || state === 'closed') {
        setCallStatus('ended');
      }
    };

    groupCallService.onLocalStreamChanged = (stream) => {
      if (!mounted) return;
      const url = (stream as any).toURL();
      setLocalStreamURL(url);
      
      const vTrack = groupCallService.localTracks.find(t => t.kind === 'video');
      if (vTrack) setLocalVideoTrack(vTrack);
    };

    const init = async () => {
      // Small delay to ensure React has finished its initial layout/mount
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!mounted) return;

      try {
        await groupCallService.init(activeCallId!, activeCallType!, userId);
        
        if (mounted) {
          setCallStatus('active');
        }
        
        let localStream = await groupCallService.getLocalStream();
        if (!localStream && mounted) {
          await new Promise(resolve => setTimeout(resolve, 800));
          if (!mounted) return;
          localStream = await groupCallService.getLocalStream();
        }

        if (mounted && localStream) {
          const url = (localStream as any).toURL();
          setLocalStreamURL(url);
          
          const vTrack = groupCallService.localTracks.find(t => t.kind === 'video');
          if (vTrack) setLocalVideoTrack(vTrack);
        }
      } catch (error) {
        console.error('[GroupCall] init failed:', error);
        if (mounted) {
          Alert.alert('Lỗi', 'Không thể khởi động cuộc gọi nhóm.');
          setCallStatus('ended');
        }
      }
    };

    init();

    return () => {
      mounted = false;
      // Use fire-and-forget for leave to avoid blocking unmount
      groupCallService.leave().catch((err: any) => console.warn('[GroupCall] Error during cleanup leave:', err));
    };
  }, [activeCallId, activeCallType, activeCallGroupSize, setCallStatus, userId]);

  useEffect(() => {
    if (callStatus !== 'active') return;
    const interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    if (callStatus === 'ended') {
      groupCallService.leave();
      setTimeout(() => {
        if (router.canGoBack()) {
          try {
            router.back();
          } catch {
            router.replace('/(tabs)');
          }
        } else {
          router.replace('/(tabs)');
        }
      }, 300);
    }
  }, [callStatus, router]);

  const handleHangup = async () => {
    console.log('[GroupCall] User initiated hangup');
    try {
      // 1. Notify signaling server
      endCall();
      // 2. Disconnect from LiveKit
      await groupCallService.leave();
      // 3. Navigate away
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.warn('[GroupCall] Error during hangup:', error);
      router.replace('/(tabs)');
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      groupCallService.setMuted(!prev);
      return !prev;
    });
  };

  const toggleCamera = () => {
    setIsCameraOn((prev) => {
      const next = !prev;
      groupCallService.setCameraEnabled(next);
      return next;
    });
  };

  const flipCamera = () => {
    groupCallService.flipCamera();
  };

  const fmt = (seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const participants: GroupParticipant[] = useMemo(() => {
    const selfId = Number(user?.id ?? -1);
    const self: GroupParticipant = {
      userId: selfId,
      fullName: 'Bạn',
      avatar: user?.avatar,
      isLocal: true,
    };

    const othersMap = new Map<number, GroupParticipant>();

    connectedIds.forEach(uId => {
      if (uId === selfId) return;
      
      const target = activeCall?.groupTargets?.find(t => Number(t.userId) === uId);
      othersMap.set(uId, {
        userId: uId,
        fullName: target?.fullName || 'Người tham gia',
        avatar: target?.avatar,
        isLocal: false,
      });
    });

    const result = [self, ...Array.from(othersMap.values())].slice(0, 8);
    return result;
  }, [activeCall?.groupTargets, user?.avatar, user?.id, connectedIds]);

  if (!activeCall) return null;

  return (
    <GroupVideoCall
      participants={participants}
      localStreamURL={localStreamURL}
      localVideoTrack={localVideoTrack}
      remoteStreams={remoteStreams}
      remoteVideoTracks={remoteVideoTracks}
      isCameraOn={isCameraOn}
      cameraStatuses={cameraStatuses}
      micStatuses={micStatuses}
      callStatus={callStatus}
      formattedDuration={fmt(duration)}
      remoteName={activeCall.remoteName || 'Cuộc gọi nhóm'}
      userId={Number(user?.id ?? -1)}
      onHangup={handleHangup}
      onFlipCamera={flipCamera}
      onToggleMute={toggleMute}
      onToggleCamera={toggleCamera}
      isMuted={isMuted}
    />
  );
}
