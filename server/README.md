# Ứng Dụng Chat Backend - High Performance

Hệ thống Backend thời gian thực được tối ưu hóa cho hiệu năng cao và khả năng mở rộng.

## 🚀 Công Nghệ Sử Dụng

*   **Core:** Node.js (v20+) & Express JS
*   **Database:** 
    *   **MySQL:** Lưu trữ dữ liệu chính (Users, Messages, Conversations).
    *   **Redis:** Caching tin nhắn và phiên đăng nhập để tăng tốc độ truy xuất.
*   **ORM:** Prisma (Type-safe database client).
*   **Realtime:** Socket.io (Hỗ trợ chat thời gian thực).
*   **Storage (🔥 New 2025):** 
    *   **MinIO v2025:** Object Storage chuẩn S3 để lưu trữ ảnh, video và file đính kèm.
    *   **Presigned URLs:** Cơ chế upload trực tiếp từ Mobile lên Storage để tiết kiệm 50% băng thông Server.
*   **Infrastructure:** 
    *   **Docker & Docker Compose:** Container hóa toàn bộ dịch vụ.
    *   **Nginx:** Reverse Proxy chuyên dụng, được cấu hình để hỗ trợ **Signature Pass-through** cho S3 Presigned URLs.

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

3. **Notify Message:**
    * Sau khi upload thành công, Mobile gửi metadata (url, name, size, type) vào luồng tạo/gửi tin nhắn.

## 🧩 Storage API

Tất cả endpoint storage đều yêu cầu JWT (`authMiddleware`):

* `POST /api/storage/upload-url`: Presigned URL cho Single PUT.
* `POST /api/storage/init-multipart`: Khởi tạo multipart upload cho file lớn.
* `POST /api/storage/get-multipart-url`: Lấy presigned URL cho từng part.
* `POST /api/storage/complete-multipart`: Hoàn tất multipart và trả về `finalUrl`.

## 🚀 Các Tối Ưu Đã Thực Hiện (Optimizations)

1. **Client-side Compression cho ảnh:**
    * Mobile nén ảnh trước khi upload để giảm đáng kể băng thông.
    * Có cơ chế fallback dùng file gốc nếu nén lỗi.

2. **Binary Upload ổn định:**
    * Luồng Single PUT dùng `fetch` để giữ đúng dữ liệu nhị phân.

3. **Multipart Upload cho file lớn:**
    * Chia file thành các phần 5MB để upload ổn định trên mobile/network yếu.
    * Cho phép nâng ngưỡng file gửi lên cao hơn đáng kể (hiện app mobile giới hạn 100MB).

4. **Chuẩn hóa parts trước khi complete:**
    * Backend normalize dữ liệu `parts` về định dạng MinIO SDK yêu cầu (`{ part, etag }`) để tránh lỗi `InvalidPart`.

5. **Host-aware Presigned URL + Nginx Signature Pass-through:**
    * URL upload được rewrite theo host mà client truy cập (LAN IP/domain).
    * Nginx bỏ `proxy_set_header Host $http_host` tại `/storage/` để tránh `403 Signature Mismatch`.


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

