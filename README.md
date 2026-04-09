# Chat App

Ứng dụng chat realtime gồm 2 phần chính:

- `mobile/`: ứng dụng di động xây bằng Expo + React Native.
- `server/`: backend Node.js + Express + Prisma + MySQL + Redis + MinIO.

## Tính Năng Chính

- Đăng ký, đăng nhập và xác thực bằng JWT.
- Chat realtime qua Socket.IO.
- Gửi tin nhắn văn bản, ảnh, video và tệp.
- Reply tin nhắn trong hội thoại.
- Nhắn tin 1-1 và tạo nhóm chat.
- Quản lý nhóm: thêm/xóa thành viên, rời nhóm, giải tán nhóm.
- Gửi lời mời kết bạn, quản lý bạn bè và lịch sử tìm kiếm.
- Tìm kiếm tin nhắn trong từng cuộc trò chuyện.
- Thư viện media theo hội thoại (Ảnh, File, Link).
- Tùy chọn hội thoại: ghim chat, tắt thông báo, đánh dấu chưa đọc.
- Kết bạn nhanh bằng QR profile (generate + scan).
- Upload file lớn (đến 100MB phía mobile) bằng MinIO Multipart Upload.
- Thông báo đẩy trên mobile bằng Expo Notifications + Expo Server SDK.
- Trạng thái online/offline và typing indicator.

## Công Nghệ Đã Dùng

### Mobile

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind + Tailwind CSS
- Socket.IO Client
- Expo Notifications
- Expo Camera
- Expo File System
- Expo Media Library
- Expo Video
- Expo Image Manipulator
- react-native-compressor
- React Native Reanimated
- Axios

### Backend

- Node.js
- Express
- TypeScript
- Socket.IO
- Prisma ORM
- MySQL
- Redis
- MinIO (S3-compatible object storage)
- JSON Web Token
- bcryptjs
- Multer
- Expo Server SDK

### Hạ Tầng và Tích Hợp

- Docker / Docker Compose cho môi trường backend
- Nginx reverse proxy cho storage signature pass-through
- Google Services / FCM cho thông báo đẩy trên Android

## Cấu Trúc Thư Mục

```text
chatApp/
├── mobile/   # Ứng dụng Expo React Native
├── server/   # Backend Express + Prisma
└── README.md
```

## Yêu Cầu Cài Đặt

- Node.js 20 trở lên
- npm
- Docker và Docker Compose cho backend
- Android Studio hoặc thiết bị thật nếu muốn chạy mobile

## Chạy Nhanh Toàn Bộ

```bash
# Terminal 1
cd server
npm install
docker compose up -d
npx prisma db push
npm run dev

# Terminal 2
cd mobile
npm install
npx expo start
```

## Chạy Backend

```bash
cd server
npm install
docker compose up -d
npx prisma db push
npm run dev
```

Backend mặc định chạy ở `http://localhost:3000`.

### Biến Môi Trường Backend

Tạo file `server/.env` dựa trên `server/.env.example`.

Các biến quan trọng:

```env
PORT=3000
JWT_SECRET=your_secret

DATABASE_URL="mysql://chatuser:admin123@localhost:3306/chat_app"

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=admin123
MINIO_BUCKET=chatapp
MINIO_REGION=us-east-1

MYSQL_ROOT_PASSWORD=admin123
MYSQL_DATABASE=chat_app
MYSQL_USER=chatuser
MYSQL_PASSWORD=admin123
MYSQL_PORT=3306
REDIS_PORT=6379
```

## Chạy Mobile

```bash
cd mobile
npm install
npx expo start
```

### Biến Môi Trường Mobile

Tạo file `mobile/.env` hoặc sửa theo IP máy của bạn:

```env
EXPO_PUBLIC_API_URL=http://<your-ip>:3000
EXPO_PUBLIC_SOCKET_URL=http://<your-ip>:3000
```

Nếu chạy trên máy thật, hãy dùng IP LAN của máy đang chạy backend thay vì `localhost`.

## Luồng Hoạt Động

1. Mobile gọi API REST để đăng nhập, lấy dữ liệu và upload file.
2. Socket.IO dùng cho realtime chat, typing và đồng bộ trạng thái.
3. File nhỏ upload trực tiếp qua presigned URL; file lớn dùng multipart upload (chunk 5MB) lên MinIO.
4. Prisma kết nối MySQL để lưu user, cuộc trò chuyện, tin nhắn và quan hệ bạn bè.
5. Redis dùng để cache tin nhắn và lưu trạng thái online/offline.
6. Backend gửi push notification qua Expo Server SDK; mobile nhận bằng Expo Notifications.

## Ghi Chú

- Backend có sẵn endpoint kiểm tra sức khỏe tại `/health`.
- Mobile đã cấu hình support ảnh, video, file, camera, QR scanner và thông báo đẩy.
- Nếu đổi schema Prisma, cần chạy lại migrate hoặc `prisma db push` tùy nhu cầu phát triển.

## README Riêng Của Từng Phần

- [Mobile README](mobile/README.md)
- [Server README](server/README.md)
