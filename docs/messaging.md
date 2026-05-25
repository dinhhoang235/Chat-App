## Messaging — Gửi/Nhận tin nhắn

1. Tên chức năng
- Messaging: send/receive/store (text + media)

2. Mục đích
- Truyền tin nhắn realtime; đảm bảo lưu trữ (persist) và cơ chế xác nhận (ack, delivery, read receipts).

3. Actor
- Client người gửi (Sender), Client người nhận (Recipient), Socket server, REST API, Database, Push worker.

4. Input
- Sự kiện WS `message.send` hoặc REST `POST /conversations/:id/messages` (dự phòng). Payload bao gồm: `conversationId`, `content`, `attachments`, `clientTempId`.

5. Output
- Bản ghi message được lưu trong DB; các sự kiện WS `message.new`, `message.sent`, `message.delivered`, `message.read` được phát ra.

6. Flow xử lý (chi tiết)
- Khi gửi (tóm tắt, theo thứ tự và theo ranh giới transaction):
  1. Client gửi event WS `message.send` (kèm `clientTempId` cho optimistic UI).
  2. Server xác thực: kiểm tra membership, kiểm tra payload (size/type).
  3. Media check: nếu message có attachments theo flow presigned/multipart, đảm bảo upload đã hoàn tất hoặc chờ phần server-side complete trước khi persist attachments.
  4. Cấp `serverId` và bắt một DB transaction:
     - `INSERT` vào `messages` (chứa `serverId`, content, attachments nếu sẵn sàng).
     - `UPDATE` `conversations.updatedAt` / `conversations.last_message`.
     - `UPDATE` `participants.hiddenAt = NULL` (nếu cần).
  5. Commit transaction. Nếu transaction fail -> rollback và trả lỗi/ack lỗi cho sender.
  6. Sau khi commit (post-commit actions):
     - Emit các event realtime (`message.new`, `conversation.updated`...) tới các room/user tương ứng.
     - Cache message (Redis) để phục vụ listing/scroll nhanh.
     - Enqueue push job cho thiết bị offline (worker gửi FCM/APNs).
     - Gửi ack/`message.sent` tới sender (mapping `clientTempId` -> `serverId`).
  7. Lưu ý vận hành: đảm bảo idempotency (dup send), retry-safe, ordering khi cần (per-conversation sequence) và observability (logs/metrics).

- Delivery / Read receipts:
  - Client gửi `message.delivered` / `message.read` kèm `messageId`.
  - Server ghi nhận trạng thái per-user vào bảng `message_status` / `message_deliveries`.
  - Sau cập nhật, server emit event cập nhật tới sender/rooms (`message.delivered`, `message.read`).

- Ghi chú ngắn:
  - Tách rõ ranh giới: những thao tác cần atomic (DB transaction) và những thao tác post-commit (emit, cache, push).
  - Với media: upload phải hoàn tất trước khi persist attachments, hoặc lưu message tạm không kèm attachment và gửi update khi media available (chỉ dùng khi muốn tối ưu throughput).
  - Sử dụng `clientTempId` để hỗ trợ optimistic UI và reconcile khi server trả `serverId`.

7. Sequence Diagram
```mermaid
sequenceDiagram
  autonumber
  participant U as Client(Sender)
  participant S as Socket Server
  participant DB as Database
  participant Users as User Rooms
  participant Conv as Conversation Room
  participant R as Client(Recipient)
  participant Cache as Redis Cache

  Note over U,S: 1. Send message
  U->>+S: send_message {conversationId, content, tempId}
  S->>+DB: validate membership
  DB-->>S: ok
  S->>DB: INSERT message
  S->>DB: UPDATE conversation.updatedAt
  S->>DB: UPDATE participants.hiddenAt=null
  DB-->>-S: message record

  Note over S,Users: 2. Fan-out events
  S->>+Users: emit receive_message
  S->>Users: emit conversation_updated
  S->>+Conv: emit new_message

  alt recipient online
    Users->>R: receive_message
    Users->>R: conversation_updated
    Conv->>R: new_message
  else recipient offline
    Note over Users,R: no active socket in rooms
  end
  deactivate Users
  deactivate Conv

  Note over S,Cache: 3. Cache message
  S->>Cache: cacheMessage(conversationId, message)

  Note over U,S: 4. Ack to sender
  S-->>-U: callback { ok: true, message }
```
  
7.4 Detailed sub-flows (split for complexity)

7.4.1. WS send with attachment via presigned flow (client uploads media first):
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as App Server
  participant Min as MinIO
  participant WS as Socket
  participant DB as Database
  participant Conv as Conversation Room

  Note over C,API: 1. Request presigned upload
  C->>+API: POST /api/storage/upload-url {fileName}
  API->>+Min: getPresignedUrl
  Min-->>-API: { uploadUrl, finalUrl }
  API-->>-C: { uploadUrl, finalUrl }

  Note over C,Min: 2. Upload file to storage
  C->>Min: PUT uploadUrl (file)

  Note over C,WS: 3. Send message with media reference
  C->>+WS: message.send { conversationId, content: { mediaRef: finalUrl }, tempId }
  WS->>+DB: INSERT message { attachments: [finalUrl] }
  DB-->>-WS: message record
  WS->>+Conv: emit new_message
  Conv-->>-WS: emitted
  WS-->>-C: message.sent {serverId}
```

7.4.2. Server-side multipart complete -> notify:
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as App Server
  participant Min as MinIO
  participant DB as Database
  participant WS as Socket

  Note over C,API: 1. Complete multipart upload
  C->>+API: POST /api/storage/complete-multipart {objectName, uploadId, parts}
  API->>+Min: completeMultipartUpload
  Min-->>-API: success

  Note over API,DB: 2. Persist media
  API->>+DB: INSERT media record
  DB-->>-API: ok

  Note over API,WS: 3. Notify via socket
  API->>+WS: io.to(conversation).emit('new_message', message)
  WS-->>-API: emitted
  API-->>-C: 200 {finalUrl}
```

7.4.3. Offline delivery -> push flow (worker details):
```mermaid
sequenceDiagram
  autonumber
  participant WS as Socket
  participant P as PushWorker
  participant F as FCM/APNs
  participant DB as Database

  Note over WS,P: 1. Enqueue push
  WS->>+P: enqueue push job { targets, payload }

  Note over P,F: 2. Send push
  P->>+F: send push
  F-->>-P: result (ok/invalid)

  alt invalid token
    P->>DB: mark device_token stale
  end
  deactivate P
```

8. API Design / Events
- WS: `message.send`, `message.new`, `message.sent`, `message.delivered`, `message.read`.
- REST: `POST /conversations/:id/messages` (multipart for direct upload).

9. Database liên quan
- `messages`, `message_attachments`, `message_status/message_deliveries`.

10. Validation / Business Rules
- Chỉ thành viên (member) mới được gửi tin nhắn; giới hạn dung lượng/định dạng attachment; rate-limit gửi tin nhắn để chống spam.

11. Error Handling
- `400` payload không hợp lệ; `403` không phải participant; `413` payload quá lớn; `500` lỗi storage/database.
  
12.  Tính năng mở rộng: Advanced Message Actions
- **Chỉnh sửa / Xoá / Thu hồi (Edit/Delete Message):**
  Client gọi API `PUT` hoặc `DELETE` -> DB cập nhật flag `isEdited` hoặc `isDeleted` -> Socket emit `message.edited` / `message.deleted` đến phòng (room).
- **Chuyển tiếp (Forward):**
  Lấy dữ liệu tin nhắn nguồn -> Tạo bản message copy mới kèm metadata `forwardedFrom` -> emit thông thường.
- **Chia sẻ Vị trí / GIF (Location / Giphy):**
  Vị trí và GIF được lưu dưới dạng `message_attachments` mang kiểu dữ liệu chuyên biệt (type=`location` với toạ độ lat/lng; type=`gif` lưu external URL). Luồng xử lý tương tự Media upload trực tiếp.

13. Cơ chế clientTempId (Optimistic UI & Reconciliation)
- **Mục đích:** 
  Giúp ứng dụng hiển thị tin nhắn ngay lập tức trên giao diện của người gửi ngay sau khi bấm nút "Gửi" (trạng thái "đang gửi"), thay vì phải chờ phản hồi phản hồi từ server, tạo trải nghiệm mượt mà không có độ trễ.
- **Quy trình hoạt động (Reconciliation):**
  1. **Tạo tempId:** Client tự sinh một ID tạm thời duy nhất (ví dụ: UUID hoặc timestamp) gọi là `tempId` và vẽ tin nhắn này lên màn hình chat ngay lập tức với trạng thái "Đang gửi".
  2. **Gửi lên Server:** Client gửi payload tin nhắn kèm theo `tempId` này lên Socket Server.
  3. **Xử lý và phản hồi:** Server nhận tin nhắn, lưu vào Database để lấy `id` chính thức của hệ thống (`serverId`), sau đó trả về Callback/Ack kèm theo cả `serverId` mới và `tempId` cũ.
  4. **Đồng bộ UI (Reconcile):** Client nhận được phản hồi, tìm tin nhắn đang hiển thị có `tempId` khớp trên màn hình để:
     - Cập nhật ID tạm thời thành ID thật từ hệ thống (`serverId`).
     - Chuyển trạng thái từ "Đang gửi" sang "Đã gửi".