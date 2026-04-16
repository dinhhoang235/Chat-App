# Chat App

Ứng dụng chat realtime gồm hai phần chính:

- `mobile/`: ứng dụng di động xây dựng bằng Expo + React Native.
- `server/`: backend Node.js + Express + Prisma + MySQL + Redis + MinIO + LiveKit.

## Tổng Quan

Hệ thống hỗ trợ chat 1-1 và nhóm, gửi tin nhắn văn bản, hình ảnh, video, audio/voice message, tệp lớn, đồng bộ trạng thái online/offline,
typing indicator, push notification và cuộc gọi thoại/video.

Root README này tổng hợp đầy đủ thông tin từ cả hai phần `mobile/README.md` và `server/README.md`.

## Tính Năng Chính

- Đăng ký / đăng nhập và xác thực bằng JWT.
- Quản lý hồ sơ người dùng: avatar, cover, bio, giới tính, ngày sinh.
- Kết bạn, gửi/chấp nhận/từ chối/hủy lời mời kết bạn.
- Chat 1-1 và nhóm: text, hình ảnh, video, audio, file và reply message.
- Tạo nhóm, thêm/xóa thành viên, rời nhóm, giải tán nhóm.
- Ghim cuộc trò chuyện, mute thông báo, đánh dấu đã đọc/ chưa đọc.
- Tìm kiếm tin nhắn theo từ khóa trong từng cuộc trò chuyện.
- Xem media conversation theo tab: ảnh, video, file, link với phân trang cursor.
- Gửi voice message trực tiếp trong chat.
- Upload file lớn lên đến ~100MB bằng MinIO Multipart Upload.
- Gọi thoại (Voice Call) và gọi video (Video Call) qua WebRTC.
- Hỗ trợ cuộc gọi nhóm voice/video nhiều người bằng LiveKit.
- Giao diện gọi chuyên nghiệp: thời gian gọi, mic/camera toggle, PIP và chạy nền.
- Kết nối nhanh bằng QR profile để share/scan user.
- Dark Mode/Light Mode, hiệu ứng mượt với Reanimated.

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
- react-native-webrtc
- @livekit/react-native-webrtc
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
- livekit-server-sdk
- CoTurn (STUN/TURN Server)

### Hạ Tầng và Tích Hợp

- Docker / Docker Compose cho backend, LiveKit, MySQL, Redis, MinIO, Nginx và CoTurn.
- Nginx reverse proxy để hỗ trợ signature pass-through cho MinIO.
- Google Services / FCM cho thông báo đẩy Android.
- WebRTC signaling qua Socket.IO.
- LiveKit token endpoint `/api/livekit/token` cho group call.

## Kiến trúc chính

- `mobile/` cung cấp UI, logic upload media, xử lý socket realtime và WebRTC cho voice/video calls.
- `server/` cung cấp API REST, socket signaling, lưu trữ dữ liệu, xác thực JWT, upload MinIO và tạo token LiveKit.
- `Nginx` định tuyến request và hỗ trợ signature pass-through để upload S3/MinIO ổn định.

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
- Docker và Docker Compose
- Android Studio hoặc thiết bị thật nếu chạy mobile

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

### 1. Đăng nhập và dữ liệu

- Mobile gọi API REST để đăng nhập, lấy thông tin người dùng và danh sách cuộc trò chuyện.
- Server xác thực JWT và trả về metadata cần thiết.

### 2. Chat realtime

- Socket.IO đồng bộ tin nhắn, trạng thái online/offline, typing indicator và thông báo chat.
- Tin nhắn mới được phát đến room `conversation:{conversationId}` và room socket user.

### 3. Upload file

- File nhỏ upload trực tiếp qua presigned URL tới MinIO.
- File lớn dùng multipart upload (chunk 5MB) với API: `init-multipart`, `get-multipart-url`, `complete-multipart`, `abort-multipart`.
- Sau khi upload xong, mobile gửi metadata file vào tin nhắn.

### 4. Cuộc gọi 1-1

- A gửi `call_invite` qua Socket.IO tới server với `targetUserId`, `callId`, `callType`.
- Server phát `incoming_call` tới B, gửi push nếu B offline.
- B chấp nhận bằng `call_accept`; server phát `call_accepted` cho A.
- A và B trao đổi `webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate` qua signaling Socket.IO.
- Kết nối P2P được thiết lập và audio/video bắt đầu chạy.

### 5. Cuộc gọi nhóm

- Người dùng khởi tạo/tham gia cuộc gọi nhóm bằng `call_invite` với `groupTargets` và `callId`.
- Server cập nhật `groupTargets`, `activeUserIds`, phát `incoming_call` đến mọi thành viên.
- Client gọi `/api/livekit/token` để lấy token LiveKit rồi vào room `callId`.
- LiveKit xử lý publish/subcribe nhiều luồng audio/video, participant events, và track subscription.
- Server quản lý `participant_joined`, `participant_left`, kết thúc cuộc gọi khi còn <=1 người.

### 6. Push notification

- Backend gửi notification qua Expo Server SDK.
- Mobile nhận notification qua Expo Notifications và điều hướng vào đúng chat hoặc cuộc gọi.

## Điểm nổi bật của hệ thống

- **Realtime message + presence**: chat và trạng thái online/offline đồng bộ tức thì.
- **Multimedia chat**: hình ảnh, video, file, audio và voice message.
- **Large file upload**: multipart upload 5MB/chunk, giới hạn ~100MB.
- **Group call mạnh mẽ**: LiveKit quản lý room, publish/subscribe media tốt cho nhiều người.
- **System optimization**: nén ảnh/video client-side, host-aware presigned URL, abort multipart khi lỗi.
- **Smart notifications**: skip notification cho người gửi và người mute, chỉ gửi đến người cần.

## API chính

### Backend Storage

- `POST /api/storage/upload-url`
- `POST /api/storage/init-multipart`
- `POST /api/storage/get-multipart-url`
- `POST /api/storage/complete-multipart`
- `POST /api/storage/abort-multipart`

### Backend Auth & User

- `POST /api/users/login`
- `POST /api/users/signup`
- `POST /api/users/refresh`
- `GET /api/users/search`
- `PATCH /api/users/:id`
- `POST /api/users/friends/request/send`
- `POST /api/users/friends/request/accept`

### Backend Chat

- `GET /api/chats/conversations`
- `POST /api/chats/start`
- `POST /api/chats/group`
- `GET /api/chats/:conversationId/messages`
- `POST /api/chats/:conversationId/messages`
- `POST /api/chats/:conversationId/read`
- `POST /api/chats/:conversationId/unread`
- `POST /api/chats/:conversationId/pin`
- `POST /api/chats/:conversationId/mute`
- `GET /api/chats/:conversationId/search`
- `GET /api/chats/:conversationId/media`

## P2P, WebRTC, CoTurn. Gửi file, ảnh như nào. Gửi file tổn băng thông xử lý như nào

### 1. P2P và WebRTC

- Cuộc gọi 1-1 dùng mô hình peer-to-peer (P2P). Backend chỉ xử lý signaling, media audio/video được truyền trực tiếp giữa hai client.
- Quy trình chính:
  1. A gửi `call_invite` qua Socket.IO lên server.
  2. Server phát `incoming_call` tới B.
  3. B chấp nhận bằng `call_accept`.
  4. A tạo `webrtc_offer`, gửi qua server đến B.
  5. B trả về `webrtc_answer`.
  6. Cả hai trao đổi `webrtc_ice_candidate` để tìm đường kết nối tốt nhất.
- Khi signaling xong, WebRTC thiết lập kết nối P2P bằng `RTCPeerConnection` và bắt đầu truyền audio/video.

### 2. WebRTC

- WebRTC chứa hai giai đoạn chính: signaling và media transport.
- Signaling: trao đổi metadata (`offer`, `answer`, `ICE candidate`) qua Socket.IO.
- Media transport: khi kết nối thành công, audio/video, data channel đi trực tiếp giữa hai client.
- WebRTC dùng DTLS/SRTP để mã hóa media, đảm bảo an toàn cho cuộc gọi.

### 3. CoTurn (STUN/TURN)

- **NAT** (Network Address Translation) là kỹ thuật dùng trên router/modem để nhiều thiết bị nội bộ chia sẻ một địa chỉ IP công cộng. Khi thiết bị di động nằm sau NAT, địa chỉ IP cục bộ không thể truy cập trực tiếp từ bên ngoài.
- **Firewall** là cơ chế chặn và lọc traffic, có thể chặn các kết nối P2P hoặc UDP mà WebRTC dùng.
- **STUN** giúp client phát hiện địa chỉ IP public và port thật khi ở sau NAT.
- **TURN** là fallback khi NAT/firewall chặn kết nối P2P trực tiếp. Khi đó, media được relay qua server CoTurn.
- CoTurn giúp tăng tỷ lệ kết nối thành công trên mạng phức tạp, đặc biệt với mobile sau carrier NAT hoặc firewall.
- Trong hệ thống này: nếu P2P trực tiếp không thể thiết lập, WebRTC tự động sử dụng TURN qua CoTurn.

### 4. SFU (Selective Forwarding Unit) dùng Livekit

- Khi gọi nhóm, hệ thống không dùng P2P trực tiếp giữa tất cả các client. Thay vào đó, LiveKit hoạt động như một **SFU**.
- SFU nhận media track từ mỗi client và chuyển tiếp (forward) tới các client khác mà không giải mã lại toàn bộ luồng.
- Ưu điểm của SFU: giảm độ trễ, tiết kiệm băng thông client và cho phép nhiều người tham gia mà vẫn giữ chất lượng ổn định.
- Trong cuộc gọi nhóm, client gửi audio/video lên LiveKit và nhận lại các track của những người còn lại qua room `callId`.
- SFU phù hợp cho group call lớn hơn 2 người vì không cần mỗi client phải tạo kết nối trực tiếp tới mọi người khác.

### 5. Gửi file / ảnh như nào

- File và ảnh không gửi thẳng qua Socket.IO. Backend chỉ truyền metadata, còn file upload/download thực tế đi thẳng tới MinIO.
- Với file nhỏ: mobile gọi `POST /api/storage/upload-url`, nhận presigned URL và upload trực tiếp lên MinIO bằng HTTP PUT.
- Với file lớn: mobile gọi `POST /api/storage/init-multipart` để lấy `uploadId` và `objectName`, sau đó upload từng chunk 5MB.
- Mỗi chunk upload lên MinIO bằng URL từ `POST /api/storage/get-multipart-url`.
- Khi hoàn tất, mobile gọi `POST /api/storage/complete-multipart` với danh sách `parts` (part + etag) để MinIO hợp nhất.
- Nếu upload bị lỗi, mobile có thể gọi `POST /api/storage/abort-multipart` để hủy và dọn dẹp.
- Sau khi upload thành công, mobile gửi metadata message chứa `finalUrl`, `fileName`, `fileSize`, `mimeType` vào API chat.

### 6. Gửi file tổn băng thông xử lý như nào

- Backend không stream file lớn qua server nên tiết kiệm rất nhiều băng thông và CPU cho server.
- File upload/download đi trực tiếp giữa client và MinIO/Nginx, chỉ có metadata file đi qua backend.
- Client tối ưu băng thông bằng cách nén ảnh/video trước khi upload, giảm dung lượng truyền.
- Multipart upload giúp giảm rủi ro: nếu một chunk lỗi, chỉ cần retry chunk đó, không upload lại toàn bộ file.
- Backend chỉ xử lý logic tạo presigned URL, xác thực user và xác thực multipart parts.
- Kết quả: băng thông server giảm, xử lý nhẹ, và upload ổn định hơn khi mạng yếu.

### 7. Nén ảnh và video trước khi upload

- Trước khi upload, `useChatThreadAttachments` gọi `prepareAttachmentForUpload()` từ `mobile/services/mediaUpload.ts`.
- Với ảnh, `prepareAttachmentForUpload()` gọi `compressImage()` trong `mobile/services/imageUpload.ts`, dùng `expo-image-manipulator` để resize và compress ảnh thành JPEG.
  - Ảnh lúc này được resize về width `1440` và compress quality `0.95`.
- Với video, nếu file lớn hơn `VIDEO_COMPRESSION_MIN_SIZE_BYTES = 8MB`, mobile import động `react-native-compressor` và gọi `Video.compress()`.
  - Cấu hình compression: `compressionMethod: 'auto'`, `minimumFileSizeForCompress: 8MB`, `progressDivider: 10`.
- Nếu nén thất bại, app sẽ fallback dùng file gốc.
- Sau khi nén xong, app kiểm tra lại kích thước bằng `FileSystem.getInfoAsync()` và dùng URI nén làm source upload.
- Với video, thumbnail được generate riêng bằng `expo-video-thumbnails` rồi upload như một asset độc lập.
- Quy trình nén luôn xảy ra trước khi quyết định upload single PUT hay multipart upload.

Xem thêm chi tiết chunk upload tại: `CHUNK_UPLOAD_README.md`

## Tài nguyên tham khảo

- [Mobile README](mobile/README.md)
- [Server README](server/README.md)
