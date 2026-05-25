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
  participant T as TURN_coturn
  participant Callee

  Note over Caller,S: 1. Invite
  Caller->>+S: call_invite {callId, callType='voice'}
  S->>Callee: incoming_call
  activate Callee
  Callee-->>S: call_accept {callId}
  deactivate Callee
  S-->>Caller: call_accepted {callId, accepterId}
  deactivate S

  Note over Caller,Callee: 2. WebRTC signaling
  Caller->>+S: webrtc_offer {offer}
  S->>Callee: webrtc_offer {offer}
  activate Callee
  Callee-->>S: webrtc_answer {answer}
  deactivate Callee
  S-->>Caller: webrtc_answer {answer}
  deactivate S

  Note over Caller,Callee: ICE Candidates Exchanged (webrtc_ice_candidate)
  Note over Caller,Callee: ICE Candidates Exchanged (direct or via TURN_coturn) (webrtc_ice_candidate)
  Caller --> Callee: ICE connectivity checks
  alt Direct connectivity
    activate Caller
    activate Callee
    Caller->>Callee: "RTP/RTCP (direct media)"
    deactivate Callee
    deactivate Caller
  else Relay via TURN_coturn
    activate Caller
    Caller->>T: Send media to TURN_coturn
    activate T
    T-->>Callee: Relay media to Callee
    deactivate T
    deactivate Caller
  end
  Note over Caller,Callee: Voice Call Connected

  Note over Caller,S: 3. Upgrade to video
  Caller->>+S: request_video_upgrade
  S->>Callee: request_video_upgrade
  activate Callee
  Note over Callee: Hộp thoại (Prompt) hỏi nâng cấp Video
  alt callee accepts
    Callee-->>S: accept_video_upgrade
    S-->>Caller: accept_video_upgrade
  else callee rejects
    Callee-->>S: reject_video_upgrade
    S-->>Caller: reject_video_upgrade
  end
  deactivate Callee
  deactivate S

  Note over Caller,Callee: Chuyển màn hình VideoCallScreen & Update local tracks
```

7.2 Kiến trúc Cuộc gọi Nhóm (LiveKit SFU(Selective Forwarding Unit))
```mermaid
sequenceDiagram
  autonumber
  participant Caller
  participant S as Backend API/Socket
  participant LK as LiveKit Server 
  participant T as TURN_coturn
  participant Callee

  Note over Caller,S: 1. Invite group
  Caller->>+S: WS Emit: call_invite {room: 'ABC'}
  S->>Callee: incoming_call
  deactivate S

  par caller connects
    Note over Caller,S: 2. Caller gets LiveKit token
    Caller->>+S: "GET /livekit/token?room=ABC"
    S-->>Caller: Returns JWT Token + URL
    deactivate S
    Note over Caller,LK: 3. Caller connects
    Caller->>LK: room.connect(token, URL)
    activate LK
    LK-->>Caller: connected
    deactivate LK
  and callee connects
    Note over Callee: User taps Join
    Note over Callee,S: 4. Callee gets LiveKit token
    Callee->>+S: "GET /livekit/token?room=ABC"
    S-->>Callee: Returns JWT Token + URL
    deactivate S
    Note over Callee,LK: 5. Callee connects
    Callee->>LK: room.connect(token, URL)
    activate LK
    LK-->>Callee: connected
    deactivate LK
  end

  Note over LK,Callee: 6. Media publish/subscribe
  Caller->>LK: "Publish Audio/Video Tracks"
  activate LK
  LK->>Callee: Subscribe to Tracks
  activate Callee
  deactivate Callee
  deactivate LK

  alt Direct to LiveKit
    activate Caller
    Caller->>LK: "Publish Audio/Video Tracks (direct)"
    deactivate Caller
  else Relay to LiveKit via TURN
    activate Caller
    Caller->>T: Send media to TURN_coturn
    activate T
    T-->>LK: Relay media to LiveKit
    deactivate T
    deactivate Caller
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
