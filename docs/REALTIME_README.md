# Real-time Architecture for Chat App

Đây là mô tả chi tiết cách hoạt động realtime trong project Chat App. Nội dung tập trung vào luồng socket, event, rooms và logic call, để người đọc có thể hiểu rõ và giải thích khi được hỏi.

## 1. Kiến trúc realtime tổng quan

Realtime được xử lý bằng Socket.IO ở cả `mobile/` và `server/`.

- Mobile app sử dụng `socket.io-client` để kết nối backend.
- Backend sử dụng `socket.io` để nhận event, xử lý, lưu trữ trạng thái và phát lại event tới client.
- Redis được dùng cho cache tin nhắn, trạng thái online/offline, và thông tin cuộc gọi tạm thời.
- LiveKit được dùng cho cuộc gọi nhóm voice/video.

## 2. Client-side socket service

File chính: `mobile/services/socket.ts`

### 2.1. Kết nối và xác thực

Mobile gọi `socketService.connect()` sau khi đăng nhập thành công.

- URL: `process.env.EXPO_PUBLIC_SOCKET_URL`
- Auth token: gửi JWT trong phần `auth: { token }`
- Transport: bắt buộc `websocket`
- Reconnection: bật tự động, với khoảng delay 1–5 giây và số lần thử vô hạn

### 2.2. Queue emit và listener

`SocketService` có hai cơ chế quan trọng:

- `emitQueue`: khi socket chưa kết nối, sự kiện được ghi vào queue rồi phát lại khi socket connect.
- `listenerQueue`: khi thêm listener trước khi socket đã tạo xong thì vẫn lưu và đăng ký sau khi connect thành công.

### 2.3. Trạng thái connection

`SocketService` lắng nghe:

- `connect` → thông báo `Connected to socket server`
- `disconnect` → thông báo `Disconnected from socket server`
- `connect_error` → log lỗi
- `reconnect_attempt` → log cố gắng kết nối lại

### 2.4. API chính của `SocketService`

- `emit(event, data, callback?)`
- `on(event, callback)`
- `off(event, callback?)`
- `isConnected()`
- `disconnect()`
- `onStatusChange(callback)`

## 3. Server-side socket và xác thực

File chính: `server/src/socket/index.ts`

### 3.1. Middleware xác thực

Server dùng `io.use(...)` để kiểm tra JWT trước khi chấp nhận kết nối.

- Token có thể đến từ `socket.handshake.auth.token`
- Hoặc từ header `authorization: Bearer ...`
- Nếu hợp lệ, payload được gán vào `socket.user`

### 3.2. Room mặc định khi connect

Khi người dùng kết nối:

- Thêm socket vào room `user:${userId}`
- Gọi `setUserStatus(userId, 'online')`
- Emit toàn bộ server event `user_status_changed` với payload `{ userId, status: 'online' }`

Khi disconnect:

- Gọi `setUserStatus(userId, 'offline')`
- Emit event `user_status_changed` với payload `{ userId, status: 'offline', lastSeen }`

### 3.3. Join / leave conversation

Server xử lý:

- `join_conversation` → join room `conversation:${conversationId}`
- `leave_conversation` → leave room `conversation:${conversationId}`

Đây là cách để server gửi tin nhắn và typing indicator chỉ tới các user đang mở conversation.

## 4. Room model và phân luồng event

### 4.1. Room type

- `user:${userId}`
  - Room cá nhân cho mỗi user
  - Dùng để gửi event trực tiếp như `incoming_call`, `call_ended`, `conversation_updated`

- `conversation:${conversationId}`
  - Room nhóm cho mỗi cuộc hội thoại chat
  - Dùng để emit `new_message`, `message_seen`, `user_typing_start`, `user_typing_stop`

- `group_call:${callId}`
  - Room cho cuộc gọi nhóm
  - Dùng để thông báo `participant_joined`, `participant_left`, `call_ended`

### 4.2. Khi nào join?

Client join room conversation khi:

- mở thread chat
- conversation có focus

Client leave room khi:

- rời thread chat
- component unmount

## 5. Event realtime chính

| Event                  | Direction                | Payload                              | Mục đích                           |
| ---------------------- | ------------------------ | ------------------------------------ | ---------------------------------- |
| `join_conversation`    | client → server          | `conversationId`                     | Tham gia room chat                 |
| `leave_conversation`   | client → server          | `conversationId`                     | Rời room chat                      |
| `typing_start`         | client → server          | `conversationId`                     | Bắt đầu gõ                         |
| `typing_stop`          | client → server          | `conversationId`                     | Dừng gõ                            |
| `user_typing_start`    | server → client          | `{ userId, conversationId, avatar }` | Hiện typing indicator              |
| `user_typing_stop`     | server → client          | `{ userId, conversationId }`         | Ẩn typing indicator                |
| `new_message`          | server → client          | `message` object                     | Tin nhắn mới trong conversation    |
| `conversation_updated` | server → client          | `{ conversationId, lastMessage }`    | Cập nhật danh sách cuộc trò chuyện |
| `message_seen`         | server → client          | `{ userId, seenAt, user }`           | Đánh dấu đã xem                    |
| `incoming_call`        | server → client          | call metadata                        | Thông báo cuộc gọi đến             |
| `call_accepted`        | server → client          | `{ callId, accepterId }`             | Thông báo người nhận đã chấp nhận  |
| `call_rejected`        | server → client          | `{ callId, rejecterId, final? }`     | Thông báo từ chối                  |
| `call_ended`           | server → client          | `{ callId }`                         | Kết thúc cuộc gọi                  |
| `participant_joined`   | server → client          | participant info                     | Thành viên vào cuộc gọi nhóm       |
| `participant_left`     | server → client          | participant info                     | Thành viên rời cuộc gọi nhóm       |
| `webrtc_offer`         | client → server → client | `{ callId, from, offer }`            | Signaling WebRTC offer             |
| `webrtc_answer`        | client → server → client | `{ callId, from, answer }`           | Signaling WebRTC answer            |
| `webrtc_ice_candidate` | client → server → client | `{ callId, from, candidate }`        | Signaling ICE candidate            |
| `camera_toggle`        | client → server → client | `{ callId, userId, enabled }`        | Đồng bộ trạng thái camera          |

## 6. Typing indicator chi tiết

File client: `mobile/hooks/useTyping.ts`

- Khi user gõ, hàm `handleType()` sẽ emit `typing_start` tối đa mỗi 2 giây.
- Nếu 3 giây không còn gõ, nó emit `typing_stop`.
- Client khác chỉ xử lý event khi `conversationId` trùng và dữ liệu không do chính họ tạo.

Server: `server/src/socket/typingHandlers.ts`

- `typing_start` → emit `user_typing_start` tới `conversation:${conversationId}`
- `typing_stop` → emit `user_typing_stop` tới `conversation:${conversationId}`

## 7. Tin nhắn realtime và trạng thái conversation

### 7.1. Join conversation trên client

File: `mobile/hooks/useChatThread/useChatThreadRuntime.ts`

- Khi thread chat focus, client gọi `socketService.emit('join_conversation', conversationId)`
- Khi unmount hoặc rời thread, client gọi `leave_conversation`

### 7.2. Xử lý `new_message`

Trong `useChatThreadRuntime`, mobile lắng nghe `new_message`:

- Nếu message cùng conversation hiện tại và user không phải sender thì tự động gọi `chatApi.markAsRead`
- Duyệt tránh duplicate message dựa vào `id` hoặc `tempId`
- Nối message vào danh sách hiển thị và cuộn lên đầu

### 7.3. Xử lý `conversation_updated`

Client cập nhật metadata conversation khi có event này.

Một số trường hợp ví dụ:

- `lastMessage` thay đổi
- thành viên nhóm được thêm hoặc rời
- cuộc gọi mới xuất hiện trong conversation

## 8. Trạng thái online / offline và Redis

File: `server/src/utils/redis.ts`

### 8.1. Status user

- Khi online: `setUserStatus(userId, 'online')`
- Khi offline: `setUserStatus(userId, Date.now().toString())`
- Key sử dụng: `user:status:${userId}`

### 8.2. Cache tin nhắn

- Key: `chat:messages:${conversationId}`
- Cập nhật cache với `lPush` và `lTrim` giữ tối đa `CACHE_LIMIT` (50 tin nhắn)

Redis giúp:

- lưu nhanh trạng thái online/offline
- giảm truy vấn DB khi cần load lại tin nhắn

## 9. Gọi thoại và gọi video chi tiết

Backend thao tác trong `server/src/socket/callHandlers.ts`.

### 9.1. `query_active_call`

- Client gửi `conversationId`
- Server lấy `conversation_call:${conversationId}`
- Nếu có active call, trả về `{ active: true, callId, callInfo }`
- Nếu không, trả về `{ active: false }`

### 9.2. `call_invite`

Client gửi payload gồm:

- `callId`
- `conversationId`
- `targetUserId`
- `callType`
- `callerName`, `callerAvatar`
- `groupTargets`
- `isGroupCall`

Server xử lý:

- Kiểm tra call đang active bằng `conversationId`
- Lưu trạng thái cuộc gọi tạm thời vào Redis bằng `setCallInfo`
- Nếu cuộc gọi mới, tạo message call ban đầu trong DB và emit `new_message` đến `conversation:${conversationId}`
- Emit `incoming_call` đến `user:${targetUserId}`
- Nếu device không online, gửi push notification

### 9.3. `call_accept`

- Server cập nhật `callInfo`, thêm `acceptedUserId`, `activeUserIds`, `groupTargets`
- Nếu call nhóm, socket join room `group_call:${callId}`
- Emit `participant_joined` tới room `group_call:${callId}`
- Emit `call_accepted` tới caller

### 9.4. `call_reject`

- Server thêm `rejectedUserIds`
- Nếu tất cả invitees từ chối và chưa có `acceptedUserId`:
  - tạo message call `rejected` trong DB
  - emit `new_message` và `conversation_updated`
  - xóa call cache và conversation_call
  - emit `call_rejected` với `final: true`
- Nếu chưa phải từ chối cuối cùng, emit `call_rejected` thông thường

### 9.5. `call_end`

- Server lấy `callInfo` từ Redis
- Nếu call nhóm và còn nhiều user thì emit `participant_left` và giữ cuộc gọi tiếp tục
- Nếu không còn hoặc call cá nhân:
  - tính `duration`
  - tạo message call `missed` hoặc `completed`
  - emit `new_message` và `conversation_updated`
  - xóa call cache / conversation_call
  - emit `call_ended` tới user liên quan

## 10. Signaling WebRTC

File: `server/src/socket/signalingHandlers.ts`

### Luồng signaling

Client thực hiện:

- `webrtc_offer` với `offer` SDP → server forward tới `user:${targetUserId}`
- `webrtc_answer` với `answer` SDP → server forward tới `user:${targetUserId}`
- `webrtc_ice_candidate` với `candidate` → server forward tới `user:${targetUserId}`
- `camera_toggle` với `enabled` → server forward tới `user:${targetUserId}`

Mục đích:

- Thiết lập và duy trì PeerConnection giữa hai client
- Trao đổi SDP và ICE candidate để kết nối media
- Đồng bộ trạng thái camera giữa các bên

## 11. LiveKit cho cuộc gọi nhóm

- Mobile gọi API LiveKit token từ server để nhận token
- LiveKit client trong `mobile/services/groupCall.ts` dùng token để join room
- LiveKit xử lý media routing, track management, đa người tham gia

## 12. Mobile integration và hooks realtime

### 12.1. `mobile/context/authContext.tsx`

- Gọi `socketService.connect()` khi user login
- Gọi `socketService.disconnect()` khi user logout

### 12.2. `mobile/hooks/useChatThread/useChatThreadRuntime.ts`

- Join conversation khi chat focus
- Off khi rời thread
- Lắng nghe: `new_message`, `message_seen`, `conversation_updated`
- Gọi `chatApi.markAsRead` khi tin nhắn mới đến trong thread đang mở

### 12.3. `mobile/hooks/useTyping.ts`

- Emit typing mỗi 2 giây
- Auto stop typing sau 3 giây không gõ
- Thực thi local indicator bằng `user_typing_start` và `user_typing_stop`

### 12.4. `mobile/context/callContext.tsx`

- Quản lý trạng thái `incomingCall`, `activeCall`, `callStatus`
- Lắng nghe event: `incoming_call`, `call_rejected`, `call_ended`, `participant_joined`, `participant_left`
- Khi accept hoặc start call: chuyển route đến `/call`, `/videoCall`, `/groupCall`
- Gửi `call_invite`, `call_reject`, `call_end`, `call_accept`

### 12.5. `mobile/components/notifications/NotificationHandler.tsx`

- Lắng nghe `new_message` để hiển thị thông báo nội bộ khi app background
- Compose title/body dựa vào loại message
- Ưu tiên hiển thị tin nhắn group bằng tên nhóm + sender

## 13. Debug và câu trả lời thường gặp

### Câu hỏi: "Realtime socket kết nối ở đâu?"

- `mobile/services/socket.ts`
- `authContext.tsx` gọi `socketService.connect()` sau login

### Câu hỏi: "Token JWT được dùng thế nào?"

- client đưa token vào handshake auth
- server xác thực trong `server/src/socket/index.ts`
- payload gán vào `socket.user`

### Câu hỏi: "Room `user:` và `conversation:` khác nhau gì?"

- `user:` dùng để gửi sự kiện cá nhân, cuộc gọi, trạng thái
- `conversation:` dùng để phát tin nhắn và typing indicator cho các user trong thread

### Câu hỏi: "Làm sao biết ai đang gõ?"

- client emit `typing_start`
- server broadcast `user_typing_start` đến room conversation
- client khác hiển thị indicator khi payload chứa `conversationId` và `userId` khác mình

### Câu hỏi: "Cuộc gọi nhóm được xử lý ra sao?"

- `call_invite` lưu trạng thái trong Redis
- `group_call:${callId}` được tạo khi ai đó tham gia
- event `participant_joined`, `participant_left`, `call_ended` phát tới room này
- LiveKit dùng để xử lý media cho nhiều user

### Câu hỏi: "Tại sao có cả Socket.IO và LiveKit?"

- Socket.IO xử lý signaling, event điều khiển, quản lý call state
- LiveKit xử lý media routing, truyền audio/video cho call nhóm

## 14. File liên quan

- `mobile/services/socket.ts`
- `mobile/context/authContext.tsx`
- `mobile/hooks/useTyping.ts`
- `mobile/hooks/useChatThread/useChatThreadRuntime.ts`
- `mobile/context/callContext.tsx`
- `mobile/components/notifications/NotificationHandler.tsx`
- `server/src/socket/index.ts`
- `server/src/socket/typingHandlers.ts`
- `server/src/socket/callHandlers.ts`
- `server/src/socket/signalingHandlers.ts`
- `server/src/utils/redis.ts`
