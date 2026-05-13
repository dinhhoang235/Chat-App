# DiskordMes - Ứng dụng Chat Di động (Mobile App)

DiskordMes là ứng dụng nhắn tin thời gian thực đa nền tảng (iOS & Android) được xây dựng trên nền tảng **Expo** và **React Native**. Ứng dụng cung cấp trải nghiệm nhắn tin mượt mà, hỗ trợ gửi tệp tin, hình ảnh và các tính năng tương tác hiện đại.

## 🚀 Tính năng chính

- **Nhắn tin thời gian thực**: Sử dụng Socket.io để đảm bảo tin nhắn được truyền tải tức thì.
- **Trạng thái hoạt động**: Hiển thị online/offline theo thời gian thực.
- **Typing Indicator**: Hiển thị người đang nhập trong cuộc trò chuyện.
- **Trả lời tin nhắn (Reply Message)**: Hỗ trợ reply trực tiếp trong luồng chat.
- **Trò chuyện nhóm**: Tạo và quản lý nhóm trò chuyện dễ dàng.
- **Tìm kiếm & Kết bạn**:
  - Tìm kiếm người dùng theo tên/số điện thoại.
  - Hỗ trợ quét mã QR hồ sơ để kết nối nhanh.
  - Quản lý yêu cầu kết bạn.
- **Chia sẻ đa phương tiện**:
  - Gửi hình ảnh, video, bản ghi âm và tệp tài liệu.
  - Hỗ trợ ghi âm và gửi voice message trực tiếp trong cuộc trò chuyện.
  - Trình phát video tích hợp với thumbnail preview.
  - Hỗ trợ gửi các tệp tin tài liệu lên đến 100MB qua cơ chế **Multipart Upload**.
  - Tự động nén ảnh, nén video có điều kiện và xử lý dữ liệu trước khi tải lên.
- **Cuộc gọi Voice & Video**:
  - Hỗ trợ gọi thoại (Voice Call) và gọi video (Video Call) thời gian thực.
  - Sử dụng giao thức **WebRTC** để kết nối P2P trực tiếp giữa hai thiết bị trong cuộc gọi 1-1.
  - Giao diện cuộc gọi chuyên nghiệp: hiển thị thời gian, trình điều khiển mic/loa/camera.
  - Hỗ trợ thu nhỏ màn hình gọi (PIP) hoặc chạy nền khi đang gọi.
  - Hỗ trợ cuộc gọi nhóm voice/video đa người, dùng LiveKit để quản lý room, publish/subscribe nhiều luồng audio/video, hiển thị danh sách người tham gia và đồng bộ trạng thái mic/camera.
- **Hệ thống Avatar thông minh**:
  - Tự động hiển thị tên viết tắt (Initials) với màu sắc ngẫu nhiên khi không có ảnh đại diện.
  - Avatar nhóm (Group Avatar) hiển thị lưới các thành viên.

## 📞 Cuộc gọi nhóm vs Cuộc gọi 1-1

| Tiêu chí                      | Cuộc gọi 1-1                        | Cuộc gọi nhóm                                     |
| ----------------------------- | ----------------------------------- | ------------------------------------------------- |
| Signaling                     | Socket.io trực tiếp giữa hai client | Socket.io + LiveKit room quản lý đa người         |
| Media transport               | P2P WebRTC giữa hai thiết bị        | LiveKit publish/subscribe nhiều luồng audio/video |
| Room model                    | Không cần room riêng                | Room LiveKit theo `callId`                        |
| Token LiveKit                 | Không cần                           | Cần token từ `/api/livekit/token`                 |
| Số lượng người tham gia       | 2 người                             | Nhiều người                                       |
| Rời cuộc gọi                  | Rời thì kết thúc                    | Rời vẫn tiếp tục nếu còn >= 2 người               |
| Đồng bộ trạng thái mic/camera | Qua signaling                       | Qua LiveKit + socket events                       |
| Hỗ trợ TURN                   | Có                                  | Có                                                |

- **Cuộc gọi 1-1** sử dụng `webrtcService` và Socket.io để xử lý signaling, tạo kết nối trực tiếp P2P giữa hai client bằng `webrtc_offer`, `webrtc_answer` và `webrtc_ice_candidate`.
- **Cuộc gọi nhóm** dùng `groupCallService` với LiveKit room, lấy token qua endpoint `/api/livekit/token`, publish/subscribe nhiều luồng audio/video và đồng bộ trạng thái tham gia.
- Trong cuộc gọi nhóm, người dùng có thể thoát mà không làm gián đoạn những thành viên còn lại; cuộc gọi chỉ kết thúc hoàn toàn khi chỉ còn một người hoặc khi host dừng.
- 1-1 call chủ yếu dựa vào kết nối peer-to-peer trực tiếp; nhóm call dựa vào LiveKit room để mở rộng, đồng bộ participant events và quản lý media track tốt hơn khi có nhiều bên.
- Cả hai mô hình đều hỗ trợ TURN cho mạng phức tạp.

## 🔄 Flow hoạt động

### Cuộc gọi 1-1

1. Người dùng A gửi `call_invite` qua Socket.io đến server với `targetUserId`, `callId`, `callType`.
2. Server lưu metadata cuộc gọi, gửi sự kiện `incoming_call` đến user B, và thông báo push nếu B offline.
3. B chấp nhận bằng `call_accept`; server gửi lại sự kiện `call_accepted` cho A.
4. A tạo `webrtc_offer` và gửi cho B qua server; B trả về `webrtc_answer`.
5. Cả hai bên trao đổi `webrtc_ice_candidate` để hoàn thành kết nối P2P và bắt đầu phát audio/video.

### Cuộc gọi nhóm

1. Người dùng khởi tạo hoặc tham gia cuộc gọi nhóm bằng `call_invite` cùng `groupTargets` và `callId`.
2. Server cập nhật `groupTargets`, giữ thông tin `activeUserIds`, và phát `incoming_call` đến tất cả thành viên được mời.
3. Khi đồng ý, client gọi `/api/livekit/token` để lấy token LiveKit và kết nối tới room `callId`.
4. Client sử dụng LiveKit để publish audio/video tracks, đồng thời lắng nghe sự kiện `participant_joined`/`participant_left` và track subscription.
5. Khi một người rời, server xử lý `call_end`; nếu còn nhiều hơn 1 người thì cuộc gọi vẫn tiếp tục, chỉ khi còn 1 người hoặc hết thành viên thì server kết thúc phiên và ghi log cuộc gọi.

- **Thư viện Media trực quan**:
  - Xem lại toàn bộ ảnh/video/file/link trong cuộc trò chuyện.
  - Phân loại nội dung theo tab (Ảnh, File, Link).
  - Hiển thị thời gian (Timestamp) chi tiết cho từng mục media.
- **Tìm kiếm trong cuộc trò chuyện**: Tìm nhanh tin nhắn theo từ khóa trong từng chat.
- **Tùy chọn cuộc trò chuyện**:
  - Ghim cuộc trò chuyện.
  - Tắt thông báo theo mốc thời gian hoặc đến khi bật lại.
  - Đánh dấu chưa đọc.
- **Thông báo đẩy (Push Notifications)**:
  - Nhận thông báo khi có tin nhắn mới (foreground/background).
  - Điều hướng thẳng vào đúng cuộc trò chuyện khi nhấn thông báo.
- **Giao diện hiện đại**:
  - Hỗ trợ Dark Mode/Light Mode tự động.
  - Hiệu ứng mượt mà với React Native Reanimated.
  - Thiết kế Responsive với NativeWind (Tailwind CSS).

## 🆕 Cập nhật mới nhất

### Messaging & Content
- **Location Messages** 📍: Gửi vị trí thực tế với preview bản đồ trong cuộc trò chuyện.
- **Message Deletion**: Hỗ trợ unsend (xóa cho tất cả) và deleteForMe (xóa chỉ cho mình).
- **GIF Support**: Gửi GIF từ bộ sưu tập hình ảnh hoặc tìm kiếm từ kho lưu trữ.
- **Voice-to-Text Dictation** 🎤: Chuyển đổi giọng nói thành text với `expo-speech-recognition`.
- **Message Retry Logic**: Tự động retry khi gửi tin nhắn thất bại.
- **Voice Message Support**: Ghi âm, xem trước và gửi tin nhắn giọng nói với waveform.
- **Video Message Support**: Tối ưu gửi và hiển thị video với thumbnail preview.
- **Image Group Display**: Gửi nhiều ảnh cùng lúc với layout group.

### Call & Real-time
- **PiP (Picture-in-Picture) Layout**: Nhỏ màn hình gọi video, camera flipping, trạng thái camera người khác.
- **Microphone Status Management**: Quản lý trạng thái mic trong cuộc gọi nhóm.
- **Group Call Support**: Cuộc gọi nhóm voice/video với LiveKit, danh sách người tham gia, mic/camera control.
- **Real-Time Connection Status**: Banner thông báo reconnect, indicator trạng thái mạng.
- **User Presence Management**: Đồng bộ trạng thái online/offline, typing indicator realtime.

### Chat Management & Performance
- **Image Dimension Preloading**: Tải sẵn kích thước ảnh (Messenger/Zalo style) để tránh layout shift.
- **Conversation Caching**: Cache thông minh danh sách cuộc trò chuyện với 3-level priority.
- **Message Batch Loading**: Tối ưu hiệu suất, batch query tin nhắn, tăng cache size.
- **Message Seen Receipts**: Hiệu chỉnh logic read receipt.

### User & Account
- **Account Switching** 🔀: Chuyển đổi giữa nhiều tài khoản với re-authentication.
- **Account Deletion** 🗑️: Xóa tài khoản đang đăng nhập.
- **Logout with Token Cleanup**: Đăng xuất, xóa push token từ server.
- **Secure Token Storage** 🔐: Lưu JWT bằng `expo-secure-store`.

### Profile & Sharing
- **Friend Request Notifications**: Thông báo push khi có lời mời kết bạn.
- **QR Profile**: Chia sẻ profile bằng QR, quét để kết nối.
- **Message Bubbles Enhanced**: Hiệu ứng highlight, bubble styles tối ưu.

### UI/UX Improvements
- **Message Menu Modal**: Context menu với delete, reply, forward (TODOs: reactions, pin).
- **Typing Indicators Enhanced**: Hiển thị tên viết tắt (initials) của người đang gõ.
- **Emoji Picker**: Bộ chọn emoji tích hợp.
- **In-Thread Search**: Tìm kiếm tin nhắn chi tiết trong chat.
- **Mute Settings Modal**: Tắt thông báo theo thời gian.
- **Profile UI Enhancements**: Modal chỉnh sửa profile, bio, display name, presence status.

### Smart Upload Pipeline
- **Nén ảnh/video trước upload**: Giảm dung lượng truyền.
- **Retry khi lỗi mạng**: Tự động retry upload.
- **Chunk upload cho file lớn**: Multipart upload 5MB/chunk, giới hạn ~100MB.

## 🛠 Công nghệ sử dụng

- **Framework**: [Expo](https://expo.dev/) (SDK 54) & [React Native](https://reactnative.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS cho React Native)
- **Real-time**: [Socket.io Client](https://socket.io/)
- **State Management**: React Context API & Hooks
- **Media & Upload**: Expo Camera, Expo Image Picker, Expo Document Picker, Expo File System, **Expo Audio**, **Expo Video**, Expo Image Manipulator, react-native-compressor
- **Real-time Communication**: **react-native-webrtc** (kết nối P2P cho voice/video call)
- **Group Call Engine**: **LiveKit** (`@livekit/react-native-webrtc`) cho room đa người, publish/subcribe track, và tạo phòng nhóm ổn định.
- **Voice & Speech**: **Expo Speech Recognition** (`expo-speech-recognition`) cho voice-to-text dictation
- **Security**: **Expo Secure Store** (`expo-secure-store`) cho lưu trữ JWT an toàn
- **Notifications**: Expo Notifications
- **Animations**: React Native Reanimated & Gesture Handler

## 📁 Cấu trúc thư mục

- `app/`: Định nghĩa các màn hình và luồng điều hướng (Expo Router).
- `components/`: Các thành phần giao diện dùng chung (Chat, Avatars, Modals, Lists...).
- `services/`: Các dịch vụ xử lý logic API, Socket, Auth và Lưu trữ.
- `hooks/`: Các custom hooks xử lý logic nghiệp vụ (Chat thread, Typing indicator, Keyboard...).
- `context/`: Quản lý trạng thái toàn cục (với Auth, Notification...).
- `constants/`: Các hằng số về màu sắc, kích thước, cấu hình.
- `utils/`: Các hàm tiện ích bổ trợ.

## 🔄 Luồng upload tệp lớn (đã triển khai)

1. Ứng dụng gọi API để khởi tạo multipart upload và nhận `uploadId`, `objectName`.
2. Chia file thành các part 5MB và upload song song với số luồng động theo thiết bị/mạng.
3. Theo dõi tiến trình và retry tự động khi part upload bị lỗi tạm thời.
4. Hoàn tất multipart để lấy `finalUrl` và gửi metadata vào tin nhắn.
5. Nếu xảy ra lỗi giữa chừng, app tự động gọi API hủy multipart (`abort`) để dọn dẹp.

## 🏁 Bắt đầu

### 📋 Yêu cầu hệ thống

- Node.js (phiên bản LTS)
- npm hoặc yarn
- Expo Go (cho thử nghiệm nhanh) hoặc Development Build

### 🧱 Cài đặt lần đầu

1. Cài dependencies:

   ```bash
   npm install
   ```

2. Nếu cần tạo cấu trúc native local để chạy Android/iOS bằng `expo run`, thực hiện:

   ```bash
   npx expo prebuild
   ```

3. Hoặc chạy trực tiếp Android trên thiết bị/emulator:
   ```bash
   npx expo run:android
   ```

4. Khởi chạy ứng dụng:

   ```bash
   npx expo start
   ```

Quét mã QR bằng ứng dụng **Expo Go** (trên Android) hoặc ứng dụng **Camera** (trên iOS) để xem ứng dụng.

## 📱 Build và Deployment

Ứng dụng sử dụng **EAS (Expo Application Services)** để build và phân phối.

- Build cho Android: `eas build --platform android`
- Build cho iOS: `eas build --platform ios`

---

Được phát triển bởi đội ngũ DiskordMes. Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ qua Discord hoặc GitHub.
