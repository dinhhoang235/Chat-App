# Chat App

Ứng dụng chat realtime gồm 2 phần chính:

- `mobile/`: ứng dụng di động xây bằng Expo + React Native.
- `server/`: backend Node.js + Express + Prisma + MySQL + Redis.

## Tính Năng Chính

- Đăng ký, đăng nhập và xác thực bằng JWT.
- Chat realtime qua Socket.IO.
- Gửi tin nhắn văn bản, hình ảnh và tệp.
- Nhắn tin 1-1 và tạo nhóm chat.
- Gửi lời mời kết bạn, quản lý bạn bè và lịch sử tìm kiếm.
- Thông báo đẩy trên mobile bằng Expo Notifications.
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
- Expo Media Library
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
- JSON Web Token
- bcryptjs
- Multer

### Hạ Tầng và Tích Hợp

- Docker / Docker Compose cho môi trường backend
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

## Chạy Backend

```bash
cd server
npm install
docker compose up -d
npm run dev
```

Backend mặc định chạy ở `http://localhost:3000`.

### Biến Môi Trường Backend

Tạo file `server/.env` dựa trên `server/.env.example`.

Các biến quan trọng:

```env
PORT=3000
DATABASE_HOST=localhost
DATABASE_USER=chatuser
DATABASE_PASSWORD=admin123
DATABASE_NAME=chat_app
DATABASE_PORT=3306
DATABASE_URL="mysql://chatuser:admin123@localhost:3306/chat_app"
REDIS_URL=redis://redis:6379
JWT_SECRET=your_jwt_secret_here
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
3. Prisma kết nối MySQL để lưu user, cuộc trò chuyện, tin nhắn và quan hệ bạn bè.
4. Redis được dùng để cache tin nhắn và lưu trạng thái online.
5. Expo Notifications xử lý push notification trên mobile.

## Ghi Chú

- Backend có sẵn endpoint kiểm tra sức khỏe tại `/health`.
- Mobile đã cấu hình support ảnh, file, camera và thông báo đẩy.
- Nếu đổi schema Prisma, cần chạy lại migrate hoặc `prisma db push` tùy nhu cầu phát triển.

## README Riêng Của Từng Phần

- [Mobile README](mobile/README.md)
- [Server README](server/README.md)
