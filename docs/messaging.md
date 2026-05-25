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
- Khi gửi: xác thực membership và nội dung -> cấp server id -> trong transaction: chèn message, cập nhật `conversation.last_message` -> emit `new_message` tới room và các room theo từng user -> cache message -> enqueue job push cho thiết bị offline -> ack tới sender.
- Delivery/read receipts: client gửi sự kiện `delivered`/`read` -> server ghi nhận trạng thái theo user và phát cập nhật tới sender/room.

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
    Users-->>R: receive_message
    Conv-->>R: new_message
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