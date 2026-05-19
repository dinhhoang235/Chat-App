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
- Quản lý hồ sơ người dùng: avatar, cover, bio, giới tính, ngày sinh, presence status.
- **Tài khoản**: chuyển đổi tài khoản, xóa tài khoản, logout với xóa push token.
- **Kết bạn**: gửi/chấp nhận/từ chối/hủy lời mời kết bạn, thông báo push realtime.
- **Chat 1-1 và nhóm**: text, hình ảnh, video, audio, file, GIF, location messages và reply.
- **Message control**: xóa tin nhắn (unsend/deleteForMe), retry tự động, tìm kiếm tin nhắn.
- **Group management**: tạo nhóm, thêm/xóa thành viên, rời nhóm, giải tán nhóm, phân quyền nhắn tin.
- **Conversation options**: ghim cuộc trò chuyện, mute thông báo, đánh dấu đã đọc/chưa đọc.
- **Media gallery**: xem ảnh, video, file, link theo tab với phân trang cursor, image preloading.
- **Voice features**: ghi âm voice message, voice-to-text dictation 🎤, audio waveform.
- **File upload**: upload file lớn lên ~100MB bằng MinIO Multipart Upload với nén ảnh/video.
- **1-1 Voice/Video Call**: gọi thoại và gọi video thời gian thực qua WebRTC P2P.
- **Group Voice/Video Call**: cuộc gọi nhóm nhiều người bằng LiveKit SFU, PiP layout, mic/camera control.
- **Real-time features**: typing indicators, user presence (online/offline), trạng thái kết nối.
- **QR Profile**: chia sẻ profile bằng QR code, quét để kết nối nhanh.
- **UI Modern**: Dark Mode/Light Mode, hiệu ứng mượt với Reanimated, giao diện đáp ứng NativeWind.

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
npx expo prebuild
npx expo run:android
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

## 🆕 Tính Năng Mới Cập Nhật

### Messaging & Content
- **📍 Location Messages**: Gửi vị trí thực tế với preview bản đồ trong cuộc trò chuyện, hỗ trợ chia sẻ GPS.
- **❌ Message Deletion**: Hỗ trợ unsend (xóa cho tất cả) và deleteForMe (xóa chỉ cho mình) với tracking lịch sử xóa.
- **🎬 GIF Support**: Gửi GIF từ bộ sưu tập hình ảnh hoặc tìm kiếm từ kho lưu trữ thiết bị.
- **🎤 Voice-to-Text Dictation**: Chuyển đổi giọng nói thành text với `expo-speech-recognition` (hỗ trợ chế độ continuous trên Android, auto-restart on silence).
- **🔄 Message Retry Logic**: Tự động retry khi gửi tin nhắn thất bại do mạng yếu hoặc mất kết nối.
- **🖼️ Image Group Display**: Gửi nhiều ảnh cùng lúc với layout group, tối ưu không gian hiển thị.

### Call & Real-time
- **PiP (Picture-in-Picture) Layout**: Nhỏ màn hình gọi video khi cần, hỗ trợ camera flipping và theo dõi trạng thái camera người khác.
- **Microphone Status Management**: Quản lý trạng thái mic trong cuộc gọi nhóm và video, hiển thị indicator trực quan.
- **Real-Time Connection Status**: Hiển thị banner thông báo khi Socket.io đang reconnect, với indicator trạng thái mạng.

### Chat Management & Performance
- **📌 Image Dimension Preloading**: Tải sẵn kích thước ảnh (Messenger/Zalo style) để tránh layout shift khi load hình.
- **Conversation Caching**: Cache thông minh danh sách cuộc trò chuyện với 3-level priority (preload → AsyncStorage → network).
- **Message Batch Loading**: Tối ưu hiệu suất bằng cách batch query tin nhắn, tăng cache size và giảm render lag.
- **Message Seen Receipts**: Hiệu chỉnh logic read receipt sử dụng `lastReadAt > createdAt` để tránh false positive.

### User & Account
- **🔀 Account Switching**: Chuyển đổi linh hoạt giữa nhiều tài khoản với re-authentication, lưu lịch sử tài khoản.
- **🗑️ Account Deletion**: Xóa tài khoản đang đăng nhập với xác nhận, hủy toàn bộ dữ liệu người dùng.
- **Logout with Token Cleanup**: Đăng xuất rõ ràng, tự động xóa push token khỏi server để tránh nhận thông báo sau logout.
- **🔐 Secure Token Storage**: Lưu trữ JWT bằng `expo-secure-store` (mã hóa an toàn thay vì AsyncStorage).

### Profile & Sharing
- **Friend Request Notifications**: Thông báo push khi có lời mời kết bạn và khi bị chấp nhận lời mời.
- **Message Bubbles Enhanced**: Hiệu ứng highlight, bubble styles tối ưu, hỗ trợ contact sharing bubble.

### UI/UX Improvements
- **Message Menu Modal**: Context menu cho tin nhắn với tùy chọn delete, reply, forward (TODOs: message reactions, message pin).
- **Typing Indicators Enhanced**: Hiển thị tên viết tắt (initials) của người đang gõ, cập nhật realtime.
- **Emoji Picker**: Bộ chọn emoji tích hợp sẵn trong composer.
- **In-Thread Search**: Tìm kiếm tin nhắn chi tiết trong từng cuộc trò chuyện.
- **Mute Settings Modal**: Tùy chọn tắt thông báo theo thời gian (1h, 8h, 1 ngày, cho đến khi bật lại).
- **User Presence Management**: Đồng bộ trạng thái online/offline, typing indicator, presence indicator theo thời gian thực.
- **Profile UI Enhancements**: Modal chỉnh sửa profile, bio, display name, presence status, block settings, reporting.
- **Conversation Permissions**: Kiểm soát quyền nhắn tin trong nhóm (ai có thể gửi tin nhắn).

### Infrastructure
- **Socket Reconnection Enhancement**: Tự động reconnect với fresh token, proper listener cleanup để tránh memory leak.
- **MariaDB/MySQL Support**: Backend hỗ trợ MariaDB qua `@prisma/adapter-mariadb` để tối ưu hiệu suất.
- **Database Indexing**: Index trên Message table (conversationId, type, createdAt) để tăng tốc độ query.

### Pending Features (TODOs)
- ⭐ Message Reactions
- ➡️ Message Forward
- 📌 Message Pin (per user)
- 🎨 GIF Picker Integration
- 🗑️ Account Deletion (Full UI completion)

## Tài nguyên tham khảo

- [Mobile README](mobile/README.md)
- [Server README](server/README.md)
- [Tài liệu hệ thống (Docs)](docs/index.md)

