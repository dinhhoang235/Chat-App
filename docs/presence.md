## Presence & Typing — Trạng thái & Gõ

1. Tên chức năng
- Presence (online/offline/status) và Typing Indicator

2. Mục đích
- Cập nhật trạng thái online/offline và thông báo người dùng đang gõ trong conversation.

3. Actor
- Client kết nối, Socket server, Redis (kho lưu presence kiểu ephemeral thông qua TTL), các participants liên quan.

4. Input
- Nhận event WS: `presence.update`, `presence.heartbeat`, `typing.start`, `typing.stop`.

5. Output
- Server broadcast emit events các tín hiệu: `user_status_changed`, `user_typing_start`, `user_typing_stop`.

6. Flow xử lý (chi tiết)
- Khi connect: authenticate -> set `presence:user:<id>` trong Redis với TTL -> broadcast tới followers/participants.
- Heartbeat: client refresh TTL để giữ online.
- Disconnect: TTL hết hạn hoặc client gửi offline -> broadcast offline.
- Typing: throttle/suppress sự kiện `typing.start` lặp -> broadcast `user_typing_start`/`user_typing_stop`.

7. Sequence Diagram
```mermaid
sequenceDiagram
  participant C as Client
  participant WS as Socket Server
  participant R as Redis

  C->>WS: presence.update {status:online}
  WS->>R: SET presence:user:<id> EX 60
  WS->>others: user_status_changed

  C->>WS: typing.start {conversationId}
  WS->>others: user_typing_start
  C->>WS: typing.stop
  WS->>others: user_typing_stop
```

7.1 Chi tiết luồng Heartbeat & TTL expiration
```mermaid
sequenceDiagram
  participant C as Client
  participant WS as Socket Server
  participant R as Redis
  
  loop Every 30s
    C->>WS: presence.heartbeat
    WS->>R: EXPIRE presence:user:<id> 60
  end
  
  Note over C, WS: Client loses connection
  loop Redis Background
    R-->>R: Key expires after 60s
  end
  Note over WS, R: (Tuỳ chọn: Redis Keyspace Notification<br/>kích hoạt event offline nếu dùng Pub/Sub)
```

7.2 Chi tiết luồng Typing throttle (Chống spam)
```mermaid
sequenceDiagram
  participant C as Client
  participant WS as Socket Server
  participant O as Others
  
  C->>WS: typing.start
  WS->>O: user_typing_start
  Note over WS: Set typing_lock (1s) trong Redis/Memory
  C->>WS: typing.start (0.5s later)
  Note over WS: Blocked by lock (Drop request)
  C->>WS: typing.start (1.5s later)
  WS->>O: user_typing_start
```

8. API Design / Events
- WS only (preferred): `presence.update`, `presence.heartbeat`, `typing.start`, `typing.stop`.
- Optional REST: `GET /users/:id/presence`.

9. Database liên quan
- Ephemeral presence stored in Redis; long-term analytics stored separately if needed.

10. Validation / Business Rules
- Status có tính TTL lưu trữ trực tiếp; thực hiện chặn lặp sự kiện typing (throttle) chống quá tải (ví dụ: dedupe = 1 giây); bảo vệ private bằng việc emit typing event chỉ cho participant.

11. Error Handling
- Bỏ qua các sự kiện ko đúng chuẩn; log ra lại các trường hợp lạm dụng hệ thống; rate-limit với các loại heartbeat/update quá dồn dập.
