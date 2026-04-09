# Ứng Dụng Chat Backend - High Performance

Hệ thống Backend thời gian thực được tối ưu hóa cho hiệu năng cao và khả năng mở rộng.

## 🚀 Công Nghệ Sử Dụng

*   **Core:** Node.js (v20+) & Express JS
*   **Database:** 
    *   **MySQL:** Lưu trữ dữ liệu chính (Users, Messages, Conversations).
    *   **Redis:** Caching tin nhắn và trạng thái online/offline theo thời gian thực.
*   **ORM:** Prisma (Type-safe database client).
*   **Realtime:** Socket.io (Hỗ trợ chat thời gian thực).
*   **Storage (🔥 New 2025):** 
    *   **MinIO v2025:** Object Storage chuẩn S3 để lưu trữ ảnh, video và file đính kèm.
    *   **Presigned URLs:** Cơ chế upload trực tiếp từ Mobile lên Storage để tiết kiệm 50% băng thông Server.
*   **Push Notifications:** Expo Server SDK (gửi thông báo đẩy cho mobile).
*   **Infrastructure:** 
    *   **Docker & Docker Compose:** Container hóa toàn bộ dịch vụ.
    *   **Nginx:** Reverse Proxy chuyên dụng, được cấu hình để hỗ trợ **Signature Pass-through** cho S3 Presigned URLs.

## ✅ Chức Năng Đã Triển Khai

### 1) Auth & User

*   Đăng ký / đăng nhập bằng JWT.
*   Refresh token.
*   Cập nhật hồ sơ người dùng: avatar, cover, bio, giới tính, ngày sinh.
*   Lưu `pushToken` của thiết bị để gửi thông báo đẩy.

### 2) Friendship

*   Gửi / chấp nhận / từ chối / hủy lời mời kết bạn.
*   Lấy danh sách bạn bè, danh sách request đã gửi/chờ duyệt.
*   Kiểm tra trạng thái bạn bè theo user.
*   Tìm bạn theo số điện thoại.

### 3) Chat 1-1 & Group

*   Tạo hội thoại cá nhân, tạo nhóm, thêm/xóa thành viên, rời nhóm, giải tán nhóm.
*   Gửi tin nhắn text/file/image/video, hỗ trợ reply tin nhắn.
*   Đánh dấu đã đọc / chưa đọc.
*   Ghim cuộc trò chuyện (`pin`) theo từng user.
*   Tắt thông báo theo cuộc trò chuyện (`mute`) theo từng user.
*   Tìm kiếm tin nhắn theo từ khóa trong từng cuộc trò chuyện.
*   Truy vấn media của cuộc trò chuyện (ảnh/video/file/link) có phân trang cursor.

### 4) Realtime & Notification

*   Socket room theo user và theo conversation.
*   Sự kiện realtime: `new_message`, `conversation_updated`, `typing_start/stop`, `user_status_changed`.
*   Trạng thái online/offline lưu Redis + broadcast realtime.
*   Push notification qua Expo (bỏ qua user đang mute cuộc trò chuyện).

### 5) Storage MinIO

*   Single PUT cho file nhỏ qua presigned URL.
*   Multipart upload cho file lớn (chunk 5MB).
*   Complete multipart và trả về `finalUrl`.
*   Abort multipart để dọn dẹp khi lỗi giữa chừng.
*   Validate quyền truy cập object theo `userId` (`objectName` phải thuộc user).

### 6) Health & Observability

*   `GET /health` kiểm tra trạng thái API + kết nối database.
*   Log rõ ràng cho các bước upload multipart và push notification.

## 📦 Yêu Cầu Hệ Thống

*   Docker & Docker Compose
*   Node.js >= 20 (cho develop cục bộ)

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
    * Mobile gọi `POST /api/storage/upload-url` để lấy Presigned URL (TTL 10 phút).
    * Mobile upload trực tiếp 1 lần lên MinIO qua Nginx (`/storage/...`).

2. **Large File (Multipart/Chunked):**
    * Mobile gọi `POST /api/storage/init-multipart` để lấy `uploadId` + `objectName`.
    * Với từng chunk, Mobile gọi `POST /api/storage/get-multipart-url` để lấy URL upload part.
    * Upload từng part (chunk 5MB) trực tiếp lên MinIO.
    * Gọi `POST /api/storage/complete-multipart` với danh sách `parts` (part + etag) để finalize.
    * Nếu có lỗi trong quá trình upload, Mobile gọi `POST /api/storage/abort-multipart` để hủy phiên multipart.

3. **Notify Message:**
    * Sau khi upload thành công, Mobile gửi metadata (url, name, size, type) vào luồng tạo/gửi tin nhắn.

## 🧩 Storage API

Tất cả endpoint storage đều yêu cầu JWT (`authMiddleware`):

* `POST /api/storage/upload-url`: Presigned URL cho Single PUT.
* `POST /api/storage/init-multipart`: Khởi tạo multipart upload cho file lớn.
* `POST /api/storage/get-multipart-url`: Lấy presigned URL cho từng part.
* `POST /api/storage/complete-multipart`: Hoàn tất multipart và trả về `finalUrl`.
* `POST /api/storage/abort-multipart`: Hủy multipart upload khi upload lỗi.

## 🧩 API Chính Khác

* `POST /api/users/login`, `POST /api/users/signup`, `POST /api/users/refresh`
* `GET /api/users/search`, `PATCH /api/users/:id`
* `POST /api/users/friends/request/send`, `POST /api/users/friends/request/accept`, ...
* `GET /api/chats/conversations`
* `POST /api/chats/start`, `POST /api/chats/group`
* `GET /api/chats/:conversationId/messages`, `POST /api/chats/:conversationId/messages`
* `POST /api/chats/:conversationId/read`, `POST /api/chats/:conversationId/unread`
* `POST /api/chats/:conversationId/pin`, `POST /api/chats/:conversationId/mute`
* `GET /api/chats/:conversationId/search`, `GET /api/chats/:conversationId/media`

## 🚀 Các Tối Ưu Đã Thực Hiện (Optimizations)

1. **Client-side Compression cho ảnh:**
    * Mobile nén ảnh trước khi upload để giảm đáng kể băng thông.
    * Có cơ chế fallback dùng file gốc nếu nén lỗi.

2. **Binary Upload ổn định:**
    * Luồng Single PUT được giữ ở dạng upload nhị phân trực tiếp để tránh sai lệch dữ liệu tệp.

3. **Multipart Upload cho file lớn:**
    * Chia file thành các phần 5MB để upload ổn định trên mobile/network yếu.
    * Cho phép nâng ngưỡng file gửi lên cao hơn đáng kể (hiện app mobile giới hạn 100MB).

4. **Chuẩn hóa parts trước khi complete:**
    * Backend normalize dữ liệu `parts` về định dạng MinIO SDK yêu cầu (`{ part, etag }`) để tránh lỗi `InvalidPart`.

5. **Host-aware Presigned URL + Nginx Signature Pass-through:**
    * URL upload được rewrite theo host mà client truy cập (LAN IP/domain).
    * Nginx bỏ `proxy_set_header Host $http_host` tại `/storage/` để tránh `403 Signature Mismatch`.

6. **Push notification theo ngữ cảnh hội thoại:**
    * Bỏ qua gửi push cho người gửi và các thành viên đã mute cuộc trò chuyện.

7. **Sắp xếp conversations thông minh:**
    * Hỗ trợ ghim chat (`isPinned`) và tính unread theo mốc `lastReadAt/deletedAt`.


## 🔑 Biến Môi Trường (.env)

```env
# Server
PORT=3000
JWT_SECRET=your_secret

# Database
DATABASE_URL="mysql://chatuser:admin123@localhost:3306/chat_app"

# MinIO (Object Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=admin123
MINIO_BUCKET=chatapp
MINIO_REGION=us-east-1

# Docker Compose (MySQL/Redis)
MYSQL_ROOT_PASSWORD=admin123
MYSQL_DATABASE=chat_app
MYSQL_USER=chatuser
MYSQL_PASSWORD=admin123
MYSQL_PORT=3306
REDIS_PORT=6379
```

## 🛠️ Quản Trị Hệ Thống

*   **MinIO Console:** `http://localhost:9001` (Quản lý file, bucket)
*   **Prisma Studio:** `npx prisma studio` (Quản lý dữ liệu DB)
*   **Nginx Proxy:** Chạy tại cổng `80` (Mọi traffic từ Mobile nên đi qua cổng này)

