# Ứng Dụng Chat Backend - High Performance

Hệ thống Backend thời gian thực được thiết kế để phục vụ ứng dụng chat di động với hiệu năng cao, khả năng mở rộng và độ ổn định khi xử lý lượng lớn sự kiện.

## 🚀 Công Nghệ Sử Dụng

- **Core:** Node.js (v22+) & Express JS
  - Kiến trúc nhẹ, route API rõ ràng, middleware xác thực và xử lý lỗi tập trung.
  - Tối ưu hiệu năng với async/await, streaming và bộ nhớ thấp.
- **Database:**
  - **MySQL:** Lưu trữ dữ liệu chính như Users, Conversations, Messages, Friendships và Notifications.
  - **Redis:** Caching tin nhắn, trạng thái online/offline, token, rate limit và queue realtime.
- **ORM:** Prisma
  - Type-safe schema, migration dễ quản lý, query builder trực quan.
  - Hỗ trợ transaction, pagination, preload quan hệ và truy vấn hiệu suất cao.
- **Realtime & Calling:**
  - **Socket.io:** Quản lý realtime events, room-based messaging, typing indicator, read receipts và trạng thái người dùng.
  - **WebRTC Signaling qua Socket.io:** Trao đổi `offer` / `answer` / `ICE candidate` để khởi tạo cuộc gọi 1-1.
  - **CoTurn:** STUN/TURN server giúp kết nối WebRTC hoạt động ổn định qua NAT / firewall.
  - **LiveKit:** Quản lý phòng đa người cho cuộc gọi nhóm, tạo token, publish/subscribe audio/video track.
- **Storage (🔥 New 2025):**
  - **MinIO v2025:** Object Storage tương thích S3 để lưu trữ ảnh, video, file, audio và voice message.
  - **Presigned URLs:** Mobile upload trực tiếp lên MinIO qua Nginx, giảm tải backend và tiết kiệm băng thông.
  - **Multipart upload:** Upload file lớn theo chunk 5MB, tăng độ ổn định trên mạng yếu.
- **Push Notifications:** Expo Server SDK
  - Gửi thông báo đẩy đến thiết bị mobile khi có tin nhắn, cuộc gọi hoặc cập nhật quan trọng.
  - Bỏ qua người dùng mute và chỉ gửi cho người cần nhận thông báo.
- **Infrastructure:**
  - **Docker & Docker Compose:** Container hóa backend, MySQL, Redis, MinIO, Nginx và CoTurn.
  - **Nginx:** Reverse proxy chính, định tuyến API và hỗ trợ Signature Pass-through cho S3 Presigned URLs.

## ✅ Chức Năng Đã Triển Khai

### 1) Auth & User

- Đăng ký / đăng nhập bằng JWT.
- Refresh token.
- Cập nhật hồ sơ người dùng: avatar, cover, bio, giới tính, ngày sinh.
- Lưu `pushToken` của thiết bị để gửi thông báo đẩy.

### 2) Friendship

- Gửi / chấp nhận / từ chối / hủy lời mời kết bạn.
- Lấy danh sách bạn bè, danh sách request đã gửi/chờ duyệt.
- Kiểm tra trạng thái bạn bè theo user.
- Tìm bạn theo số điện thoại.

### 3) Chat 1-1 & Group

- Tạo hội thoại cá nhân, tạo nhóm, thêm/xóa thành viên, rời nhóm, giải tán nhóm.
- Gửi tin nhắn text/file/image/video/audio, hỗ trợ reply tin nhắn.
- Hỗ trợ gửi và lưu trữ voice message (audio) trực tiếp từ mobile.
- Đánh dấu đã đọc / chưa đọc.
- Ghim cuộc trò chuyện (`pin`) theo từng user.
- Tắt thông báo theo cuộc trò chuyện (`mute`) theo từng user.
- Tìm kiếm tin nhắn theo từ khóa trong từng cuộc trò chuyện.
- Truy vấn media của cuộc trò chuyện (ảnh/video/file/link) có phân trang cursor.

### 4) Realtime & Notification

- Socket room theo user và theo conversation.
- Sự kiện realtime: `new_message`, `conversation_updated`, `typing_start/stop`, `user_status_changed`.
- Trạng thái online/offline lưu Redis + broadcast realtime.
- Push notification qua Expo (bỏ qua user đang mute cuộc trò chuyện).

### 5) Storage MinIO

- Single PUT cho file nhỏ qua presigned URL.
- Multipart upload cho file lớn (chunk 5MB).
- Complete multipart và trả về `finalUrl`.
- Abort multipart để dọn dẹp khi lỗi giữa chừng.
- Validate quyền truy cập object theo `userId` (`objectName` phải thuộc user).
- Hỗ trợ lưu trữ đối tượng audio/voice message trong media conversation.

### 7) Cuộc gọi Voice & Video (WebRTC)

- **Signaling Server:** Xử lý luồng báo hiệu (Signaling) cho cuộc gọi qua Socket.io.
- **Sự kiện hỗ trợ:** `call_invite`, `call_accept`, `call_reject`, `call_end`.
- **WebRTC P2P:** Hỗ trợ trao đổi `webrtc_offer`, `webrtc_answer` và `webrtc_ice_candidate`.
- **Trạng thái Camera:** Đồng bộ trạng thái bật/tắt camera (`camera_toggle`) giữa các bên trong cuộc gọi video.
- **LiveKit Group Call:** Sử dụng room LiveKit cho cuộc gọi nhóm, sinh token qua `/api/livekit/token`, và điều phối media track đa người.
- **Group Call Lifecycle:** Quản lý `groupTargets`, sử dụng phòng `group_call:${callId}` để phát thông tin `participant_joined`/`participant_left` và giữ cuộc gọi nhóm khi vẫn còn nhiều hơn một người tham gia.
- **Join/Leave linh hoạt:** `call_end` cho phép thành viên rời cuộc gọi nhóm mà không kết thúc phiên cho toàn bộ người khác; chỉ khi số người còn lại <=1 thì cuộc gọi thực sự kết thúc.
- **Cuộc gọi 1-1 so với nhóm:** 1-1 call dùng signaling Socket.io + P2P, còn nhóm call dùng cùng metadata nhưng mở rộng thành phòng nhóm với LiveKit để xử lý nhiều luồng media và participant events.

## 📦 Yêu Cầu Hệ Thống

- Docker & Docker Compose
- Node.js >= 20 (cho develop cục bộ)

## 🛠️ Cài Đặt & Khởi Chạy

1. **Cài đặt thư viện:**

   ```bash
   npm install
   ```

2. **Khởi chạy hạ tầng (MySQL, Redis, MinIO, Nginx):**

   ```bash
   docker compose up -d
   ```

3. **Cấu hình Database:**

   ```bash
   npx prisma db push
   ```

4. **Chạy Server:**
   ```bash
   npm run dev
   ```

## 🖼️ Luồng Lưu Trữ Tối Ưu (Storage Flow)

Hệ thống hiện hỗ trợ **2 chế độ upload** tùy kích thước file:

1. **Small File (Single PUT):**
   - Mobile gọi `POST /api/storage/upload-url` để lấy Presigned URL (TTL 10 phút).
   - Mobile upload trực tiếp 1 lần lên MinIO qua Nginx (`/storage/...`).

2. **Large File (Multipart/Chunked):**
   - Mobile gọi `POST /api/storage/init-multipart` để lấy `uploadId` + `objectName`.
   - Với từng chunk, Mobile gọi `POST /api/storage/get-multipart-url` để lấy URL upload part.
   - Upload từng part (chunk 5MB) trực tiếp lên MinIO.
   - Gọi `POST /api/storage/complete-multipart` với danh sách `parts` (part + etag) để finalize.
   - Nếu có lỗi trong quá trình upload, Mobile gọi `POST /api/storage/abort-multipart` để hủy phiên multipart.

3. **Notify Message:**
   - Sau khi upload thành công, Mobile gửi metadata (url, name, size, type) vào luồng tạo/gửi tin nhắn.

## 🧩 Storage API

Tất cả endpoint storage đều yêu cầu JWT (`authMiddleware`):

- `POST /api/storage/upload-url`: Presigned URL cho Single PUT.
- `POST /api/storage/init-multipart`: Khởi tạo multipart upload cho file lớn.
- `POST /api/storage/get-multipart-url`: Lấy presigned URL cho từng part.
- `POST /api/storage/complete-multipart`: Hoàn tất multipart và trả về `finalUrl`.
- `POST /api/storage/abort-multipart`: Hủy multipart upload khi upload lỗi.

## 🧩 API Chính Khác

- `POST /api/users/login`, `POST /api/users/signup`, `POST /api/users/refresh`
- `GET /api/users/search`, `PATCH /api/users/:id`
- `POST /api/users/friends/request/send`, `POST /api/users/friends/request/accept`, ...
- `GET /api/chats/conversations`
- `POST /api/chats/start`, `POST /api/chats/group`
- `GET /api/chats/:conversationId/messages`, `POST /api/chats/:conversationId/messages`
- `POST /api/chats/:conversationId/read`, `POST /api/chats/:conversationId/unread`
- `POST /api/chats/:conversationId/pin`, `POST /api/chats/:conversationId/mute`
- `GET /api/chats/:conversationId/search`, `GET /api/chats/:conversationId/media`

## 🚀 Các Tối Ưu Đã Thực Hiện (Optimizations)

1. **Client-side Compression cho ảnh:**
   - Mobile nén ảnh trước khi upload để giảm đáng kể băng thông.
   - Có cơ chế fallback dùng file gốc nếu nén lỗi.

2. **Binary Upload ổn định:**
   - Luồng Single PUT được giữ ở dạng upload nhị phân trực tiếp để tránh sai lệch dữ liệu tệp.

3. **Multipart Upload cho file lớn:**
   - Chia file thành các phần 5MB để upload ổn định trên mobile/network yếu.
   - Cho phép nâng ngưỡng file gửi lên cao hơn đáng kể (hiện app mobile giới hạn 100MB).

4. **Chuẩn hóa parts trước khi complete:**
   - Backend normalize dữ liệu `parts` về định dạng MinIO SDK yêu cầu (`{ part, etag }`) để tránh lỗi `InvalidPart`.

5. **Host-aware Presigned URL + Nginx Signature Pass-through:**
   - URL upload được rewrite theo host mà client truy cập (LAN IP/domain).
   - Nginx bỏ `proxy_set_header Host $http_host` tại `/storage/` để tránh `403 Signature Mismatch`.

6. **Push notification theo ngữ cảnh hội thoại:**
   - Bỏ qua gửi push cho người gửi và các thành viên đã mute cuộc trò chuyện.

7. **Sắp xếp conversations thông minh:**
   - Hỗ trợ ghim chat (`isPinned`) và tính unread theo mốc `lastReadAt/deletedAt`.

## 🛠️ Quản Trị Hệ Thống

- **MinIO Console:** `http://localhost:9001` (Quản lý file, bucket)
- **Prisma Studio:** `npx prisma studio` (Quản lý dữ liệu DB)
- **Nginx Proxy:** Chạy tại cổng `80` (Mọi traffic từ Mobile nên đi qua cổng này)
