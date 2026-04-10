import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';

export type CallType = 'voice' | 'video';

const TURN_HOST = process.env.EXPO_PUBLIC_TURN_HOST;
const TURN_USERNAME = process.env.EXPO_PUBLIC_TURN_USERNAME;
const TURN_PASSWORD = process.env.EXPO_PUBLIC_TURN_PASSWORD;

const buildIceServers = () => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  if (TURN_HOST) {
    servers.push(
      {
        urls: `turn:${TURN_HOST}:3478`,
        username: TURN_USERNAME,
        credential: TURN_PASSWORD,
      },
      {
        urls: `turn:${TURN_HOST}:3478?transport=tcp`,
        username: TURN_USERNAME,
        credential: TURN_PASSWORD,
      },
    );
  }
  return servers;
};

interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  /** ICE candidates received before remote description was set */
  private pendingCandidates: any[] = [];
  private remoteDescSet = false;
  public currentCallId: string | null = null;
  public isInitializing = false;

  // Callbacks set by the call screen
  onRemoteStream: ((stream: MediaStream) => void) | null = null;
  onIceCandidate: ((candidate: any) => void) | null = null;
  onConnectionStateChange: ((state: string) => void) | null = null;

  /** Acquire camera/mic. Must be called before createPeerConnection(). */
  async acquireLocalStream(callId: string, callType: CallType): Promise<MediaStream> {
    if (this.currentCallId === callId && this.localStream) {
      return this.localStream;
    }
    this.isInitializing = true;
    this.currentCallId = callId;
    
    const constraints: any = {
      audio: true,
      video:
        callType === 'video'
          ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
    };
    try {
      this.localStream = await mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } finally {
      this.isInitializing = false;
    }
  }

  /** Create RTCPeerConnection and wire up event handlers. */
  createPeerConnection(callId: string): RTCPeerConnection {
    if (this.pc && this.currentCallId === callId) {
      console.log('[WebRTC] PC already exists for this call, skipping ctor');
      return this.pc;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.currentCallId = callId;
    const config: any = { iceServers: buildIceServers() };
    this.pc = new RTCPeerConnection(config);
    this.pendingCandidates = [];
    this.remoteStream = null;
    this.remoteDescSet = false;

    (this.pc as any).onicecandidate = (event: any) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate.toJSON());
      }
    };

    (this.pc as any).ontrack = (event: any) => {
      if (event.streams?.[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream?.(event.streams[0]);
      }
    };

    (this.pc as any).onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.pc?.connectionState || 'closed');
    };

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    return this.pc;
  }

  async createOffer(): Promise<{ type: string; sdp: string }> {
    if (!this.pc) throw new Error('No peer connection');
    const offer = await this.pc.createOffer({} as any);
    await this.pc.setLocalDescription(offer as RTCSessionDescription);
    return { type: (offer as any).type, sdp: (offer as any).sdp };
  }

  async createAnswer(): Promise<{ type: string; sdp: string }> {
    if (!this.pc) throw new Error('No peer connection');
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer as RTCSessionDescription);
    return { type: (answer as any).type, sdp: (answer as any).sdp };
  }

  async addIceCandidate(candidate: any): Promise<void> {
    if (!this.pc || !this.remoteDescSet) {
      // Queue until PC is created and remote description is set
      console.log('[WebRTC] Queueing ICE candidate');
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('[WebRTC] addIceCandidate error:', e);
    }
  }

  async setRemoteDescription(sdp: { type: string; sdp: string }): Promise<void> {
    if (!this.pc) throw new Error('No peer connection');
    console.log('[WebRTC] setRemoteDescription:', sdp.type);
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp as any));
    this.remoteDescSet = true;
    console.log('[WebRTC] setRemoteDescription OK');
    // Drain any ICE candidates that arrived before remote description was set
    console.log(`[WebRTC] Draining ${this.pendingCandidates.length} pending candidates`);
    for (const c of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.error('[WebRTC] addIceCandidate (pending) error:', e);
      }
    }
    this.pendingCandidates = [];
  }

  setMuted(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((track: any) => {
      track.enabled = !muted;
    });
  }

  setCameraEnabled(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach((track: any) => {
      track.enabled = enabled;
    });
  }

  async flipCamera(): Promise<void> {
    const videoTrack = this.localStream?.getVideoTracks()[0] as any;
    videoTrack?._switchCamera?.();
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  cleanup(): void {
    this.localStream?.getTracks().forEach((track: any) => track.stop());
    this.pc?.close();
    this.pc = null;
    this.currentCallId = null;
    this.isInitializing = false;
    this.localStream = null;
    this.remoteStream = null;
    this.pendingCandidates = [];
    this.remoteDescSet = false;
    this.onRemoteStream = null;
    this.onIceCandidate = null;
    this.onConnectionStateChange = null;
  }
}

export const webrtcService = new WebRTCService();
