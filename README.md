# Chat App

Ứng dụng chat realtime gồm 2 phần chính:

- `mobile/`: ứng dụng di động xây bằng Expo + React Native.
- `server/`: backend Node.js + Express + Prisma + MySQL + Redis + MinIO.

## Tính Năng Chính

- Đăng ký, đăng nhập và xác thực bằng JWT.
- Chat realtime qua Socket.IO.
- Gửi tin nhắn văn bản, ảnh, video, audio/voice message và tệp.
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
- Cuộc gọi thoại (Voice call) và gọi video (Video call) thời gian thực qua WebRTC.
- Hỗ trợ hạ tầng truyền tải cuộc gọi bằng CoTurn (STUN/TURN).

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
- Expo Audio
- Expo File System
- Expo Media Library
- Expo Video
- Expo Image Manipulator
- react-native-compressor
- react-native-webrtc (WebRTC P2P)
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
- CoTurn (STUN/TURN Server)

### Hạ Tầng và Tích Hợp

- Docker / Docker Compose cho môi trường backend
- Nginx reverse proxy cho storage signature pass-through
- Google Services / FCM cho thông báo đẩy trên Android
- WebRTC Signaling qua Socket.IO

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

## Chạy Mobile

```bash
cd mobile
npm install
npx expo start
```

## Luồng Hoạt Động

1. Mobile gọi API REST để đăng nhập, lấy dữ liệu và upload file.
2. Socket.IO dùng cho realtime chat, typing và đồng bộ trạng thái.
3. File nhỏ upload trực tiếp qua presigned URL; file lớn dùng multipart upload (chunk 5MB) lên MinIO.
4. Prisma kết nối MySQL để lưu user, cuộc trò chuyện, tin nhắn và quan hệ bạn bè.
5. Redis dùng để cache tin nhắn và lưu trạng thái online/offline.
6. Backend gửi push notification qua Expo Server SDK; mobile nhận bằng Expo Notifications.
7. Cuộc gọi WebRTC: Socket.IO làm signaling truyền SDP/ICE; CoTurn hỗ trợ kết nối qua mạng phức tạp.

## Ghi Chú

- Backend có sẵn endpoint kiểm tra sức khỏe tại `/health`.
- Mobile đã cấu hình support ảnh, video, file, camera, QR scanner và thông báo đẩy.
- Nếu đổi schema Prisma, cần chạy lại migrate hoặc `prisma db push` tùy nhu cầu phát triển.

## README Riêng Của Từng Phần

- [Mobile README](mobile/README.md)
- [Server README](server/README.md)
