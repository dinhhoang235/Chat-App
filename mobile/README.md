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
  - Gửi hình ảnh, video và tệp tài liệu.
  - Trình phát video tích hợp với thumbnail preview.
  - Hỗ trợ gửi các tệp tin tài liệu lên đến 100MB qua cơ chế **Multipart Upload**.
  - Tự động nén ảnh, nén video có điều kiện và xử lý dữ liệu trước khi tải lên.
- **Hệ thống Avatar thông minh**:
  - Tự động hiển thị tên viết tắt (Initials) với màu sắc ngẫu nhiên khi không có ảnh đại diện.
  - Avatar nhóm (Group Avatar) hiển thị lưới các thành viên.
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
- **Video Message Support**: Tối ưu gửi và hiển thị video trong cuộc trò chuyện bằng `expo-video`.
- **Smart Upload Pipeline**: Nén ảnh/video trước upload, retry khi lỗi mạng và chunk upload cho file lớn.
- **Multipart Storage**: Upload nhiều phần với thanh tiến trình và tự động abort khi thất bại.
- **Media Gallery Enhanced**: Trang media hỗ trợ phân loại ảnh/video/file/link theo ngày.
- **Chat Controls**: Bổ sung ghim chat, tắt thông báo, đánh dấu chưa đọc và tìm kiếm tin nhắn trong chat.
- **QR Contact Flow**: Chia sẻ profile bằng QR và quét để mở nhanh trang người dùng.

## 🛠 Công nghệ sử dụng

- **Framework**: [Expo](https://expo.dev/) (SDK 54) & [React Native](https://reactnative.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS cho React Native)
- **Real-time**: [Socket.io Client](https://socket.io/)
- **State Management**: React Context API & Hooks
- **Media & Upload**: Expo Camera, Expo Image Picker, Expo Document Picker, Expo File System, **Expo Video**, Expo Image Manipulator, react-native-compressor
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

### ⚙️ Cài đặt

1. Cài đặt các phụ thuộc:
   ```bash
   npm install
   ```

2. Cấu hình biến môi trường:
   Tạo tệp `.env` dựa trên `.env.example`:
   ```env
   EXPO_PUBLIC_API_URL=http://your-server-ip:3000/api
   EXPO_PUBLIC_SOCKET_URL=http://your-server-ip:3000
   ```

3. Khởi chạy ứng dụng:
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

