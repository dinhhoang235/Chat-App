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

Hệ thống sử dụng cơ chế **Presigned Uploads** để tối ưu hóa tài nguyên server:

1. **Get Token:** Mobile gọi `POST /api/storage/upload-url` để lấy "vé upload" (Presigned URL) có hiệu lực trong 10 phút.
2. **Direct Upload:** Mobile sử dụng `fetch` (Binary Stream) để upload file trực tiếp lên **MinIO** thông qua **Nginx Proxy** (prefix `/storage/`).
3. **Notify:** Sau khi upload thành công, Mobile gửi tin nhắn kèm metadata (URL, name, size) cho Backend để lưu vào DB.
## 🚀 Các Tối Ưu Đã Thực Hiện (Optimizations)

Hệ thống đã được tinh chỉnh để giải quyết vấn đề gửi file tốn băng thông:

1.  **Nén ảnh tại Client (Client-side Compression):** 
    *   Sử dụng `expo-image-manipulator` để nén ảnh (giảm độ phân giải & chất lượng ~80%) ngay trên Mobile trước khi gửi.
    *   Tiết kiệm tời **70-90% dung lượng** tải lên so với file gốc.
    *   Cơ chế **Graceful Fallback**: Nếu module nén bị lỗi native, app sẽ tự động gửi file gốc để đảm bảo tin nhắn không bị gián đoạn.

2.  **Upload Nhị Phân (Binary Stream):** 
    *   Chuyển từ `Axios` sang `fetch` cho luồng upload để tránh việc Blob bị chuyển đổi thành JSON string, đảm bảo tính toàn vẹn của dữ liệu nhị phân.

3.  **Hỗ trợ Host-aware Presigned URL:**
    *   Backend tự động nhận diện Host của client (LAN IP hoặc Domain) để tạo link upload phù hợp, tránh lỗi kết nối chéo mạng.

4.  **Nginx proxy_set_header Optimization:**
    *   Cấu hình Nginx đặc thù để xử lý header `Host`, tránh lỗi **403 Forbidden (Signature Mismatch)** khi làm việc với chữ ký bảo mật của S3/MinIO.


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
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=admin123
MINIO_BUCKET=chatapp
MINIO_REGION=us-east-1
```

## 🛠️ Quản Trị Hệ Thống

*   **MinIO Console:** `http://localhost:9001` (Quản lý file, bucket)
*   **Prisma Studio:** `npx prisma studio` (Quản lý dữ liệu DB)
*   **Nginx Proxy:** Chạy tại cổng `80` (Mọi traffic từ Mobile nên đi qua cổng này)

