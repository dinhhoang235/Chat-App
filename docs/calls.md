## Calls — Audio/Video Calls (1-1 & Group)

1. Tên chức năng
- Calls: Tính năng Gọi thoại / Gọi video. Bao gồm 2 kiến trúc rẽ nhánh riêng biệt:
  - **1-1 Call (P2P):** Dùng trực tiếp WebRTC (Polyfill) với Signaling thông qua Socket nội bộ. Hỗ trợ nâng cấp (Upgrade) từ Gọi Thoại sang Gọi Video. Sử dụng STUN and TURN (coturn) làm relay khi cần thiết để giải quyết NAT/Firewall.
  - **Group Call (SFU (Selective Forwarding Unit)):** Tích hợp qua LiveKit Server phân phối streams.

1. Mục đích
- Thiết lập kết nối đa phương tiện (Audio/Video).
- Nhắn gửi tín hiệu mời (invite), chấp nhận, và định tuyến luồng dữ liệu truyền tải theo mô hình tối ưu nhất cho số lượng peer.

1. Actor
 - Trực tiếp (P2P): Client người gọi (Caller), Client người nhận (Callee), Socket Server (Làm trạm trung chuyển Signaling SDP/ICE), Redis. Thêm TURN server (coturn) làm ICE relay khi peer-to-peer không thể thiết lập kết nối trực tiếp.
- Nhóm (SFU): Clients, LiveKit Server (SFU Media Provider), Socket Server (Phát tín hiệu Notify ban đầu), API Server (Cấp Token LiveKit).

1. Input
 - 1-1 Call (WebRTC): Cấp quyền Camera/Mic, cấu hình STUN and TURN (coturn) trong `RTCPeerConnection` config, sự kiện WS `webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate`.
- ICE candidates có thể được trao đổi trực tiếp hoặc được relay qua TURN (coturn) nếu NAT/Firewall chặn kết nối trực tiếp.
 - Cập nhật 1-1 sang Video (Video Upgrade): WS sự kiện `request_video_upgrade`, `accept_video_upgrade`, `reject_video_upgrade`.
- Group Call (LiveKit): API `GET /livekit/token?room=[roomId]` và hàm SDK `room.connect()`.
- Global Call Events: `call_invite`, `call_reject`, `call_end`, `incoming_call`, `participant_joined`, `participant_left`.

1. Output
- Luồng âm thanh và hình ảnh theo thời gian thực.
- Giao diện Call 1-1 (CallScreen) được thay đổi sang (VideoCallScreen) ngay trong khi cuộc gọi đang tiếp diễn. Bắn record (System message) xuống Table `messages`.

1. Flow xử lý (chi tiết)
- **Luồng Gọi 1-1 (WebRTC P2P):** 
  Caller tạo `RTCPeerConnection` -> Phát `call_invite` (chỉ định loại `voice` hoặc `video`) qua Socket -> Callee ấn Accept, gửi `call_accept` -> Caller lập `Offer` (SDP) truyền qua Socket cho Callee -> Callee báo `Answer` (SDP) -> Bắn `ICE Candidates` thông qua WS Server (Hole punching). Media đi ngang qua nhau không qua máy chủ.
  - *Chuyển Voice sang Video:* Người dùng ở màn hình Voice ấn nút Video -> Emit `request_video_upgrade` -> Bên kia hiện Popup Alert (Đồng ý/Từ chối). Nếu đồng ý, trả về `accept_video_upgrade`, app update global state `callType='video'`, Replace trang sang màn hình `videoCall.tsx`, gọi hàm kích hoạt Camera SDK.
- **Luồng Gọi Nhóm (LiveKit SFU):**
  Caller phát `call_invite` (kèm `groupTargets`, `callId`) -> Server gửi `incoming_call` tới các thành viên -> Người tham gia bấm Join và gọi REST Auth `GET /livekit/token?room=callId` -> Trả về JWT AccessToken + URL -> Thực thi `room.connect(url, token)` -> Từ lúc này Camera/Mic Data quy tụ về LiveKit Server để phân phát ngược về các users (Publish & Subscribe).

1. Sequence Diagrams

7.1 Kiến trúc Cuộc gọi 1-1 (Voice & Nâng cấp sang Video)
```mermaid
sequenceDiagram
  autonumber
  participant Caller
  participant S as Signaling Server
  participant R as Redis
  participant DB as Database
  participant GS as Google STUN
  participant T as TURN_coturn
  participant Callee

  Note over Caller,S: 1a. Caller sends invite
  Caller->>S: call_invite {callId, callType, targetUserId, callerName, callerAvatar}
  activate S
  S->>R: setCallInfo(callId, {callerId, callType, status:'ringing'})
  activate R
  deactivate R
  S->>R: setConversationCallId(convId, callId)
  activate R
  deactivate R
  S->>DB: INSERT system message "call_started"
  activate DB
  deactivate DB
  S->>S: fetchSockets('user:{targetUserId}') → online?
  alt Target online
    S->>Callee: incoming_call {callId, callerId, callType, callerName, callerAvatar}
    activate Callee
    Note over Callee: Hiển thị màn hình incoming + ringtone
    Callee->>S: call_accept {callId, callerId, accepterName}
    deactivate Callee
  else Target offline
    S->>S: sendPushNotification(FCM/APNs, {type:'call', callId, callerName, callType})
    Note over Callee: Push → mở app → query_active_call
  end

  Note over Caller,Callee: 1b. Server confirms to caller
  S->>R: setCallInfo(callId, {acceptedUserId, status:'connected'})
  activate R
  deactivate R
  S->>Caller: call_accepted {callId, accepterId, accepterName}
  deactivate S

  Note over Caller,Callee: 2a. ICE gathering (parallel, ~100-500ms)
  par Caller gathers candidates
    activate Caller
    Caller->>Caller: host candidate (192.168.1.5:54321)
    Caller->>GS: STUN Binding Request
    activate GS
    GS->>Caller: mappedAddress = 1.2.3.4:45000 → srflx
    deactivate GS
    Caller->>T: TURN Allocate Request
    activate T
    T->>Caller: relay candidate (1.2.3.4:3478)
    deactivate T
    deactivate Caller
  and Callee gathers candidates
    activate Callee
    Callee->>Callee: host candidate (192.168.2.5:12345)
    Callee->>GS: STUN Binding Request
    activate GS
    GS->>Callee: mappedAddress = 5.6.7.8:33000 → srflx
    deactivate GS
    Callee->>T: TURN Allocate Request
    activate T
    T->>Callee: relay candidate (5.6.7.8:3478)
    deactivate T
    deactivate Callee
  end

  Note over Caller,Callee: 2b. SDP exchange via signaling
  Caller->>S: webrtc_offer {callId, sdp}
  activate S
  S->>Callee: webrtc_offer {callId, sdp}
  activate Callee
  Callee->>S: webrtc_answer {callId, sdp}
  deactivate Callee
  S->>Caller: webrtc_answer {callId, sdp}
  deactivate S

  Note over Caller,Callee: 2c. Trickle ICE candidate exchange
  loop each candidate
    Caller->>S: webrtc_ice_candidate {callId, candidate}
    activate S
    S->>Callee: webrtc_ice_candidate {callId, candidate}
    activate Callee
    deactivate Callee
    deactivate S
    Callee->>S: webrtc_ice_candidate {callId, candidate}
    activate S
    S->>Caller: webrtc_ice_candidate {callId, candidate}
    activate Caller
    deactivate Caller
    S->>Callee: (forwarded)
    deactivate S
  end

  Note over Caller,Callee: 2d. ICE connectivity checks
  Caller-->>Callee: STUN Binding Request (to srflx:45000)
  alt P2P successful
    activate Caller
    activate Callee
    Caller->>Callee: RTP/RTCP media (direct)
    deactivate Callee
    deactivate Caller
  else P2P fails (symmetric NAT / firewall)
    activate Caller
    Caller->>T: RTP/RTCP media via TURN
    activate T
    T->>Callee: Relay media
    deactivate T
    deactivate Caller
  end
  Note over Caller,Callee: Voice Call Connected (duplex)

  Note over Caller,S: 3a. Upgrade voice → video
  Caller->>S: request_video_upgrade {callId}
  activate S
  S->>Callee: request_video_upgrade {callId}
  Note over Callee: Prompt "Nâng cấp lên Video?"
  alt Callee accepts
    activate Callee
    Callee->>S: accept_video_upgrade {callId}
    deactivate Callee
    S->>R: setCallInfo(callId, {callType:'video'})
    activate R
    deactivate R
    S->>Caller: accept_video_upgrade {callId}
  else Callee rejects
    activate Callee
    Callee->>S: reject_video_upgrade {callId}
    deactivate Callee
    S->>Caller: reject_video_upgrade {callId}
    Note over Caller: Alert "Từ chối nâng cấp"
  end
  deactivate S

  Note over Caller,Callee: 3b. Call end
  Caller->>S: call_end {callId}
  activate S
  S->>R: getCallInfo(callId) → {startedAt, acceptedUserId}
  activate R
  deactivate R
  S->>S: duration = Date.now() - startedAt
  alt no acceptedUserId (missed)
    S->>DB: INSERT system message "call_missed"
    activate DB
    deactivate DB
  else completed
    S->>DB: INSERT system message "call_completed" {duration}
    activate DB
    deactivate DB
  end
  S->>R: deleteCallInfo(callId)
  activate R
  deactivate R
  S->>R: deleteConversationCallId(convId)
  activate R
  deactivate R
  S->>Callee: call_ended {callId}
  activate Callee
  deactivate Callee
  S->>Caller: call_ended {callId}
  deactivate S
  Note over Caller,Callee: Release PeerConnection, reset state
```
7.2 Kiến trúc Cuộc gọi Nhóm (LiveKit SFU)
```mermaid
sequenceDiagram
  autonumber
  participant Caller
  participant S as Backend API/Socket
  participant R as Redis
  participant DB as Database
  participant LK as LiveKit Server
  participant GS as Google STUN
  participant T as TURN_coturn
  participant Callee1
  participant Callee2

  Note over Caller,S: 1. Caller sends group invite
  Caller->>S: call_invite {callId, callType, groupTargets:[userId1, userId2], isGroupCall:true}
  activate S
  S->>R: setCallInfo(callId, {callerId, callType, groupTargets, status:'ringing'})
  activate R
  deactivate R
  S->>R: setConversationCallId(convId, callId)
  activate R
  deactivate R
  S->>DB: INSERT system message "group_call_started"
  activate DB
  deactivate DB
  S->>S: socket.join('group_call:{callId}')
  S->>Callee1: incoming_call {callId, callType, callerName, groupTargets, isGroupCall:true}
  activate Callee1
  deactivate Callee1
  S->>Callee2: incoming_call {callId, callType, callerName, groupTargets, isGroupCall:true}
  activate Callee2
  deactivate Callee2
  deactivate S

  Note over Caller,Callee2: 2. Participants fetch token + connect
  par Caller connects
    Caller->>S: GET /livekit/token?room={callId}
    activate S
    S->>Caller: {token, url: ws://livekit:7880}
    deactivate S
    activate Caller
    Caller->>GS: STUN Binding Request
    activate GS
    GS->>Caller: srflx candidate
    deactivate GS
    Caller->>T: TURN Allocate
    activate T
    T->>Caller: relay candidate
    deactivate T
    Caller->>LK: room.connect(url, token, iceServers:[GS,T])
    activate LK
    LK->>Caller: connected
    deactivate LK
    Caller->>LK: Publish tracks (audio+video)
    deactivate Caller
  and Callee1 connects
    Callee1->>S: GET /livekit/token?room={callId}
    activate S
    S->>Callee1: {token, url}
    deactivate S
    activate Callee1
    Callee1->>GS: STUN Binding Request
    activate GS
    GS->>Callee1: srflx candidate
    deactivate GS
    Callee1->>T: TURN Allocate
    activate T
    T->>Callee1: relay candidate
    deactivate T
    Callee1->>LK: room.connect(url, token)
    activate LK
    LK->>Callee1: connected
    deactivate LK
    Callee1->>LK: Publish tracks (audio)
    deactivate Callee1
  and Callee2 connects
    Callee2->>S: GET /livekit/token?room={callId}
    activate S
    S->>Callee2: {token, url}
    deactivate S
    activate Callee2
    Callee2->>GS: STUN Binding Request
    activate GS
    GS->>Callee2: srflx candidate
    deactivate GS
    Callee2->>T: TURN Allocate
    activate T
    T->>Callee2: relay candidate
    deactivate T
    Callee2->>LK: room.connect(url, token)
    activate LK
    LK->>Callee2: connected
    deactivate LK
    Callee2->>LK: Publish tracks (audio)
    deactivate Callee2
  end

  Note over LK,Caller: 3. Server emits participant events
  activate S
  S->>R: setCallInfo(callId, {activeUserIds:[caller, callee1, callee2], status:'connected'})
  activate R
  deactivate R
  S->>Caller: participant_joined {userId:callee1}
  activate Caller
  deactivate Caller
  S->>Callee1: participant_joined {userId:caller}
  activate Callee1
  deactivate Callee1
  S->>Callee2: participant_joined {userId:caller}
  activate Callee2
  deactivate Callee2
  deactivate S

  Note over LK,Caller: 4. LiveKit subscribes tracks
  activate LK
  LK->>Caller: Subscribe: callee1.audio, callee2.audio
  LK->>Callee1: Subscribe: caller.audio+video, callee2.audio
  LK->>Callee2: Subscribe: caller.audio+video, callee1.audio
  deactivate LK

  Note over LK,Caller: 5. ICE connectivity (participant ↔ LiveKit via GS+T)
  alt P2P to LiveKit
    activate Caller
    Caller->>LK: RTP/RTCP (direct)
    deactivate Caller
    activate Callee1
    Callee1->>LK: RTP/RTCP (direct)
    deactivate Callee1
    activate Callee2
    Callee2->>LK: RTP/RTCP (direct)
    deactivate Callee2
  else Relay via TURN_coturn
    activate Caller
    Caller->>T: RTP/RTCP to TURN
    activate T
    T->>LK: Relay to LiveKit
    deactivate T
    deactivate Caller
    LK->>T: RTP/RTCP to Callee1
    activate T
    T->>Callee1: Relay
    deactivate T
    LK->>T: RTP/RTCP to Callee2
    activate T
    T->>Callee2: Relay
    deactivate T
  end

  Note over Caller,Callee2: 6. Participant leaves
  Callee1->>S: call_end {callId}
  alt has active participants
    activate S
    S->>R: getCallInfo(callId)
    activate R
    deactivate R
    S->>S: Remove Callee1 from activeUserIds
    S->>S: socket.leave('group_call:{callId}')
    S->>Caller: participant_left {userId:callee1}
    activate Caller
    deactivate Caller
    S->>Callee2: participant_left {userId:callee1}
    activate Callee2
    deactivate Callee2
    Note over S: Keep call alive
    deactivate S
  else no participants left
    activate S
    S->>R: getCallInfo(callId)
    activate R
    deactivate R
    S->>S: Remove Callee1 from activeUserIds
    S->>S: socket.leave('group_call:{callId}')
    S->>Caller: participant_left {userId:callee1}
    activate Caller
    deactivate Caller
    S->>Callee2: participant_left {userId:callee1}
    activate Callee2
    deactivate Callee2
    S->>DB: INSERT system message "group_call_completed"
    activate DB
    deactivate DB
    S->>R: deleteCallInfo(callId)
    activate R
    deactivate R
    S->>R: deleteConversationCallId(convId)
    activate R
    deactivate R
    S->>Caller: call_ended {callId}
    activate Caller
    deactivate Caller
    S->>Callee2: call_ended {callId}
    activate Callee2
    deactivate Callee2
    deactivate S
  end
```

7.3 STUN/TURN (coturn) & client config

- Mô tả: Khi peer-to-peer không thể thiết lập kết nối do NAT/Firewall, media sẽ được relay qua TURN server (ví dụ: coturn). TURN/ STUN URLs và credentials nên được cung cấp cho client qua signaling REST/WS (`GET /webrtc/ice-config` hoặc kèm trong `call_invite`).

- Ví dụ cấu hình client (JavaScript) cho `RTCPeerConnection`:
```javascript
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    {
      urls: ['turn:turn.example.com:3478?transport=udp','turn:turn.example.com:3478?transport=tcp'],
      username: 'turn-username',
      credential: 'turn-secret'
    }
  ]
});
```

- Cách cấp credentials cho TURN:
  - Ngắn hạn (recommended): Server tạo credential tạm thời (TTL) và trả cho client khi vào phòng/call (ví dụ JWT hoặc TURN REST API style).
  - Long-term: Sử dụng long-term credentials (coturn `lt-cred-mech`) và quản lý user trên server.

- Coturn deployment notes:
  - Chạy coturn với TLS, bật `lt-cred-mech` hoặc REST API nếu cần cấp token ngắn hạn.
  - Mở port 3478 (UDP/TCP) và TLS port nếu dùng `turns:`. Giữ logs và monitoring cho relay bandwidth.

### Vai trò của STUN — tại sao không thấy trong kiến trúc hệ thống?

STUN (Session Traversal Utilities for NAT) có một nhiệm vụ duy nhất: **giúp client khám phá địa chỉ IP public và port public của chính nó** sau khi qua NAT. Cụ thể:

1. Client gửi một gói tin UDP nhỏ đến `stun:stun.l.google.com:19302`.
2. Google STUN server nhìn thấy gói tin đến từ IP:port public nào → trả về địa chỉ đó cho client.
3. Client dùng địa chỉ public đó làm một **ICE candidate** (gọi là `srflx` candidate) để gửi cho peer kia qua signaling.

**Tại sao không xuất hiện trong kiến trúc hệ thống?**
- STUN **không relay media** — nó chỉ là một cú "hỏi đáp" UDP 1 lần, kéo dài vài mili-giây.
- Sau khi client có được public IP, STUN không tham gia gì thêm vào cuộc gọi.
- Các sơ đồ kiến trúc chỉ vẽ **đường media** (luồng RTP/RTCP), vì đó là phần quan trọng và tốn băng thông. STUN là bước chuẩn bị, không phải đường truyền media.
- Tóm lại: STUN nằm trong **pha gathering ICE candidates**, diễn ra ngay khi `RTCPeerConnection` được tạo, trước khi media flow bắt đầu.

8. API Design / Events
 - Socket Events P2P: `call_invite`, `incoming_call`, `call_accept`, `call_accepted`, `call_reject`, `call_end`, `webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate`.
 - Infrastructure: STUN/TURN servers (coturn) are required for reliable ICE traversal. TURN credentials/URLs are provided to clients as part of signaling or via config.

7.4 ICE flow (Direct vs TURN relay)

Trình bày luồng cố gắng thiết lập media giữa hai peer: ưu tiên kết nối trực tiếp, fallback sang TURN (coturn) khi thất bại.

```mermaid
flowchart LR
  Caller[Caller] -->|"Signaling (SDP/ICE)"| S[Signaling Server]
  S -->|Notify| Callee[Callee]

  %% Direct path (preferred)
  subgraph Direct_Path[Direct P2P]
    direction LR
    Caller -->|"RTP/RTCP (direct)"| Callee
  end

  %% Relay path via TURN
  subgraph Turn_Relay[TURN Relay]
    direction LR
    Caller -->|Send media to TURN| T[TURN_coturn]
    T -->|Relay media to| Callee
  end

  %% Decision note
  Caller -.->|ICE checks| Callee
  %% ICE checks attempt direct
  %% If direct fails, media is relayed via TURN
```

Ghi chú: biểu đồ trên minh họa hai khả năng — client luôn cố gắng thiết lập kết nối trực tiếp trước; nếu ICE connectivity checks không thành công (do symmetric NAT, firewall, v.v.), client sẽ sử dụng TURN relay để truyền media.
- Socket Events Group Call: `call_invite`, `incoming_call`, `participant_joined`, `participant_left`, `call_end`.
- Socket Events Nâng cấp UI Video: `request_video_upgrade`, `accept_video_upgrade`, `reject_video_upgrade`.
- REST GET `/livekit/token`: Validate user Auth -> Render JWT Token mapping LiveKit Server.

1. Database liên quan
- Sử dụng tính năng "System Message" (`type=call`) lưu records lúc call xong. Cả Audio và Video đều xử lý thành một cuộc gọi thống nhất (cùng chung unique Call ID).

1.  Validation / Business Rules
- Ở Group Call: Tự động ngắt băng thông nếu chập chờn. Giới hạn số người trong room.
- Nâng cấp Video: Cả 2 bên (Caller và Callee) phải đều bấm đồng ý. Nếu Client B chọn Reject, luồng trả về `reject_video_upgrade`, State vẫn giữ nguyên ở cuộc gọi Voice.

1.  Error Handling
- `400` Thiếu Room ID lúc lấy Token LiveKit.
- Client từ chối biến đổi loại Video: Hiện Alert thông báo cho Client yêu cầu sự từ chối ("Chuyển đổi bị từ chối").

1.  Giải thích kiến trúc — FAQ

### Làm thế nào người nhận biết được có cuộc gọi đến?

Quy trình thông báo cuộc gọi đến trải qua 3 bước:

```
Caller App ──call_invite──▶ Socket Server ──incoming_call──▶ Callee App
                                                                  │
                                                            [callContext.tsx]
                                                                  │
                                                         setIncomingCall(info)
                                                                  │
                                                    Hiển thị màn hình Call Incoming
                                                         + đổ chuông (ringtone)
```

**Chi tiết từng bước:**

1. **Client Caller gửi `call_invite`:**
   - `mobile/context/callContext.tsx` — hàm `startCall()` gọi:
     ```typescript
     socketService.emit('call_invite', {
       callId, conversationId, targetUserId,
       callType, callerName, callerAvatar, ...
     });
     ```

2. **Server nhận và chuyển tiếp:**
   - `server/src/socket/callHandlers.ts` — handler `call_invite` (khoảng dòng 222-235):
     ```typescript
     const targetRoom = `user:${targetUserId}`;
     io.to(targetRoom).emit("incoming_call", {
       callId, conversationId, callerId, callerName,
       callerAvatar, callType, groupTargets, isGroupCall,
     });
     ```
   - Server cũng lưu thông tin call vào Redis (`setCallInfo`) và tạo system message trong DB.
   - Nếu target user **offline** (không có socket nào trong room `user:{id}`), server gửi **push notification** qua FCM/APNs.

3. **Client Callee nhận `incoming_call`:**
   - `mobile/context/callContext.tsx` — listener (khoảng dòng 116-142):
     ```typescript
     socketService.on('incoming_call', (data) => {
       // Kiểm tra không có active call khác
       setIncomingCall({ callId, conversationId, callType,
         remoteUserId: data.callerId, remoteName: data.callerName, ... });
       setCallStatus('incoming'); // → hiển thị UI + ringtone
     });
     ```
   - Call status `'incoming'` kích hoạt màn hình đổ chuông (ringing screen) ở `call.tsx` hoặc `videoCall.tsx`.

**Kiến trúc room Socket.IO cho phép điều này:**
- Khi user đăng nhập, socket của họ tự động join room `user:{userId}` (xem `server/src/socket/index.ts`).
- Server emit `incoming_call` đến room đó → **tất cả devices của cùng user** (phone, tablet, web) đều nhận được thông báo.
- Đây là cơ chế **server → client push notification realtime**, không phải polling.

### Tóm tắt luồng emit cho incoming_call

| Component | Hành động | File |
|-----------|-----------|------|
| Caller | `emit('call_invite', {...})` | `mobile/context/callContext.tsx` |
| Server | `io.to('user:{id}').emit('incoming_call', {...})` | `server/src/socket/callHandlers.ts:226` |
| Callee | `on('incoming_call', handler)` | `mobile/context/callContext.tsx` |
