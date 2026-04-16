import "./webrtc-setup"; 
import { MediaStream, MediaStreamTrack as RNMediaStreamTrack } from "@livekit/react-native-webrtc";
import apiClient from "./api";
import { CallType } from "@/types/call";
import { 
  Room, 
  RoomEvent,
  ConnectionState,
  Track,
  RemoteParticipant,
  Participant,
  TrackPublication,
  RemoteTrackPublication,
  RemoteTrack,
  createLocalAudioTrack,
  createLocalVideoTrack,
  LocalTrack,
} from "livekit-client";

type LiveKitConnectResponse = {
  url: string;
  token: string;
  room: string;
};

class GroupCallService {
  currentCallId: string | null = null;
  callType: CallType | null = null;
  room: Room | null = null;
  localStream: MediaStream | null = null;
  localTracks: LocalTrack[] = [];
  private isReady: boolean = false;
  private isClosing: boolean = false;
  private initPromise: Promise<void> | null = null;
  listenersStarted: boolean = false;
  private userId: number | null = null;
  private isSwitchingCamera: boolean = false;
  private currentFacingMode: 'user' | 'environment' = 'user';
  private localParticipantSid: string | null = null;
  localParticipantIdentity: string | null = null;
  participantStreams: Map<string, MediaStream> = new Map();
  participantTracks: Map<string, Track> = new Map(); // sid -> Track
  participantIdentities: Map<string, string> = new Map(); // sid -> identity

  onParticipantsChanged: ((participantStreams: Map<string, MediaStream>, participantTracks: Map<string, Track>) => void) | null = null;
  onLocalStreamChanged: ((stream: MediaStream) => void) | null = null;
  onRemoteTrackMuted: ((muted: boolean, userId?: string, kind?: Track.Kind) => void) | null = null;
  onConnectionStateChange: ((state: string) => void) | null = null;

  async init(callId: string, callType: CallType, userId: number) {
    if (this.initPromise && this.currentCallId === callId) {
      console.log('[GroupCallService] Initialization already in progress for callId:', callId);
      return this.initPromise;
    }

    if (this.currentCallId === callId && this.isReady) {
      console.log('[GroupCallService] Already initialized for callId:', callId);
      return;
    }

    this.initPromise = (async () => {
      if (this.currentCallId && this.room) {
        console.log('[GroupCallService] Disconnecting existing room before new init');
        await this.leave();
      }

      console.log('[GroupCallService] Initializing for callId:', callId, 'userId:', userId);
      this.currentCallId = callId;
      this.callType = callType;
      this.userId = userId;
      this.isReady = false;
      this.isClosing = false;

      try {
        console.log('[GroupCallService] Connecting to LiveKit...');
        await this.connectLiveKit(callId);
        
        console.log('[GroupCallService] Acquiring local stream...');
        await this.acquireLocalStream(callType);
        
        console.log('[GroupCallService] Publishing tracks...');
        await this.publishLocalTracks();
        
        this.isReady = true;
        console.log('[GroupCallService] Initialization complete');
      } catch (error) {
        console.error('[GroupCallService] Initialization failed:', error);
        this.cleanup();
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async requestLiveKitToken(
    callId: string,
  ): Promise<LiveKitConnectResponse> {
    const response = await apiClient.get("/livekit/token", {
      params: { room: callId },
    });
    return response.data;
  }

  private async connectLiveKit(callId: string) {
    const liveKitData = await this.requestLiveKitToken(callId);
    
    const turnHost = process.env.EXPO_PUBLIC_TURN_HOST;
    const turnUsername = process.env.EXPO_PUBLIC_TURN_USERNAME;
    const turnPassword = process.env.EXPO_PUBLIC_TURN_PASSWORD;
    
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];

    if (turnHost) {
      iceServers.push({
        urls: [
          `turn:${turnHost}:3478`,
          `turn:${turnHost}:3478?transport=tcp`,
        ],
        username: turnUsername,
        credential: turnPassword,
      } as any);
    }

    const maxRetries = 2;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        if (this.room) {
          try { this.room.removeAllListeners(); } catch {}
          try { await this.room.disconnect(); } catch {}
        }

        this.room = new Room({
          adaptiveStream: false,
          dynacast: false,
        });

        if (this.isClosing) return;

        this.listenersStarted = false; 
        this.startRoomListeners();

        console.log(`[GroupCallService] Connection attempt ${retryCount + 1}...`);
        await this.room.connect(liveKitData.url, liveKitData.token, {
          autoSubscribe: true,
          rtcConfig: {
            iceServers,
          },
        });
        console.log('[GroupCallService] Successfully connected to LiveKit room');
        break;
      } catch (error) {
        retryCount++;
        console.warn(`[GroupCallService] LiveKit connection attempt ${retryCount} failed:`, error);
        if (retryCount > maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1500 * retryCount));
      }
    }

    if (this.room && this.room.remoteParticipants) {
      this.room.remoteParticipants.forEach((p: RemoteParticipant) => {
        if (p.sid && p.identity) {
          this.participantIdentities.set(p.sid, p.identity);
        }
      });
    }

    const localParticipant = this.room?.localParticipant;
    if (localParticipant) {
      this.localParticipantSid = localParticipant.sid;
      this.localParticipantIdentity = localParticipant.identity || null;
      console.log('[GroupCall] connected localParticipant', {
        sid: this.localParticipantSid,
        identity: this.localParticipantIdentity,
      });
    }
  }

  private async acquireLocalStream(callType: CallType): Promise<MediaStream> {
    if (this.localStream && this.currentCallId) {
      return this.localStream;
    }

    const tracks: any[] = [];

    try {
      const audioTrack = await createLocalAudioTrack();
      this.localTracks.push(audioTrack);
      tracks.push(audioTrack.mediaStreamTrack);
    } catch (error) {
      console.warn("[GroupCall] Unable to capture audio track:", error);
    }

    if (callType === "video") {
      try {
        const videoTrack = await createLocalVideoTrack({
          facingMode: "user",
        });
        console.log('[GroupCallService] Local video track created:', videoTrack.sid);
        this.localTracks.push(videoTrack);
        tracks.push(videoTrack.mediaStreamTrack);
      } catch (error) {
        console.warn("[GroupCall] Unable to capture video track:", error);
      }
    }

    this.localStream = new MediaStream(tracks);
    return this.localStream;
  }

   private async publishLocalTracks() {
    if (!this.room || this.isClosing) return;
    
    const state = this.room.state;
    if (state !== ConnectionState.Connected) {
       console.warn(`[GroupCallService] Cannot publish tracks, room state is: ${state}`);
       return;
    }

    const localParticipant = this.room.localParticipant;
    for (const track of this.localTracks) {
      try {
        const isAlreadyPublished = Array.from(localParticipant.trackPublications.values()).some(
          (pub: TrackPublication) => pub.track === track
        );
        
        if (isAlreadyPublished) continue;

        console.log(`[GroupCallService] Publishing ${track.kind} track...`);
        await localParticipant.publishTrack(track);
      } catch (error) {
        console.error(`[GroupCallService] Error publishing track:`, error);
      }
    }
  }

  private startRoomListeners() {
    if (!this.room || this.listenersStarted) return;

    console.log('[GroupCall] Registering LiveKit room listeners');
    this.room.on(RoomEvent.TrackSubscribed, this.handleRemoteTrackSubscribed);
    this.room.on(RoomEvent.TrackUnsubscribed, this.handleRemoteTrackUnsubscribed);
    this.room.on(RoomEvent.TrackMuted, this.handleRemoteTrackMuted);
    this.room.on(RoomEvent.TrackUnmuted, this.handleRemoteTrackUnmuted);
    
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      if (participant.sid && participant.identity) {
        this.participantIdentities.set(participant.sid, participant.identity);
      }
      this.onParticipantsChanged?.(new Map(this.participantStreams), new Map(this.participantTracks));
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      const sid = participant.sid;
      this.participantStreams.delete(sid);
      this.participantTracks.delete(sid);
      this.participantIdentities.delete(sid);
      this.onParticipantsChanged?.(new Map(this.participantStreams), new Map(this.participantTracks));
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log('[GroupCallService] Room connection state:', state);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state.toLowerCase());
      }
    });

    this.listenersStarted = true;
  }

  private handleRemoteTrackSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    const sid = participant.sid;
    if (!sid) return;

    if (participant.identity) {
      this.participantIdentities.set(sid, participant.identity);
    }

    console.log(`[GroupCall] Subscribed to ${track.kind} track from ${participant.identity}`);

    if (track.kind === Track.Kind.Video) {
      this.participantTracks.set(sid, track);
      
      // Get the stream from the track's internal mediaStream if possible, 
      // or create one and add the track
      const mediaTrack = track.mediaStreamTrack as unknown as RNMediaStreamTrack;
      if (mediaTrack) {
        const stream = new MediaStream([mediaTrack]);
        this.participantStreams.set(sid, stream);
      }
    } else if (track.kind === Track.Kind.Audio) {
      // For audio, we still need to manage it so it plays through the device speaker
      // LiveKit handles this automatically usually, but we keep it in participantStreams for completeness if needed
    }

    this.onParticipantsChanged?.(new Map(this.participantStreams), new Map(this.participantTracks));
  };

  private handleRemoteTrackUnsubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    const sid = participant.sid;
    const stream = this.participantStreams.get(sid);
    if (stream && track.mediaStreamTrack) {
      stream.removeTrack(track.mediaStreamTrack as unknown as RNMediaStreamTrack);
      if (stream.getTracks().length === 0) {
        this.participantStreams.delete(sid);
      }
    }

    if (track.kind === Track.Kind.Video) {
      this.participantTracks.delete(sid);
    }
    this.onParticipantsChanged?.(new Map(this.participantStreams), new Map(this.participantTracks));
  };

  private handleRemoteTrackMuted = (publication: TrackPublication, participant: Participant) => {
    if (participant.sid === this.localParticipantSid) return;
    this.onRemoteTrackMuted?.(true, participant.identity, publication.kind);
  };

  private handleRemoteTrackUnmuted = (publication: TrackPublication, participant: Participant) => {
    if (participant.sid === this.localParticipantSid) return;
    this.onRemoteTrackMuted?.(false, participant.identity, publication.kind);
  };

  async getLocalStream(): Promise<MediaStream | null> {
    if (this.initPromise) await this.initPromise;
    return this.localStream;
  }

  async setMuted(muted: boolean) {
    const audioTrack = this.localTracks.find(t => t.kind === Track.Kind.Audio);
    if (audioTrack) {
      if (muted) {
        await audioTrack.mute();
      } else {
        await audioTrack.unmute();
      }
    }
  }

  async setCameraEnabled(enabled: boolean) {
    const videoTrack = this.localTracks.find(t => t.kind === Track.Kind.Video);
    if (videoTrack) {
      try {
        console.log(`[GroupCallService] Setting camera enabled: ${enabled}`);
        if (enabled) {
          await videoTrack.unmute();
          // Force active preview refresh
          const mediaTrack = videoTrack.mediaStreamTrack as any;
          if (mediaTrack && typeof mediaTrack.start === 'function') {
            mediaTrack.start();
          }
          
          // Refresh local preview URL
          const tracks = this.localTracks.map(t => t.mediaStreamTrack);
          this.localStream = new MediaStream(tracks as any);
          this.onLocalStreamChanged?.(this.localStream);
        } else {
          await videoTrack.mute();
        }
      } catch (error) {
        console.error('[GroupCallService] Failed to toggle camera:', error);
      }
    }
  }

  async flipCamera() {
    if (this.isSwitchingCamera || !this.isReady) return;
    
    const videoTrack = this.localTracks.find(t => t.kind === Track.Kind.Video) as any;
    if (!videoTrack) return;

    try {
      this.isSwitchingCamera = true;
      const newMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
      console.log(`[GroupCallService] Restarting track with facingMode: ${newMode}`);
      
      // The most reliable way in LiveKit: Restart the track with new constraints
      if (typeof videoTrack.restartTrack === 'function') {
        await videoTrack.restartTrack({
          facingMode: newMode,
        });
        this.currentFacingMode = newMode;
        
        // Re-create localStream with the new track
        const tracks = this.localTracks.map(t => t.mediaStreamTrack);
        this.localStream = new MediaStream(tracks as any);
        this.onLocalStreamChanged?.(this.localStream);
        
        console.log('[GroupCallService] Track restarted with new facingMode');
      } else {
        // Fallback to switchCamera if restartTrack is missing
        await videoTrack.switchCamera();
        this.currentFacingMode = newMode;
      }
    } catch (error) {
      console.error('[GroupCallService] Failed to flip camera:', error);
    } finally {
      this.isSwitchingCamera = false;
    }
  }

   async leave() {
    this.isClosing = true;
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch (e) {
        console.warn('[GroupCallService] Error during disconnect:', e);
      }
    }
    this.cleanup();
  }

   cleanup() {
    this.isClosing = true;
    this.localTracks.forEach(t => t.stop());
    this.localTracks = [];
    this.localStream = null;
    this.participantStreams.clear();
    this.participantTracks.clear();
    this.participantIdentities.clear();
    if (this.room) {
      this.room.removeAllListeners();
    }
    this.room = null;
    this.isReady = false;
    this.listenersStarted = false;
    this.currentCallId = null;
    this.localParticipantSid = null;
    this.localParticipantIdentity = null;
  }
}

export const groupCallService = new GroupCallService();
