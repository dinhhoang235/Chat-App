# DiskordMes - Ứng dụng Chat Di động (Mobile App)

DiskordMes là ứng dụng nhắn tin thời gian thực đa nền tảng (iOS & Android) được xây dựng trên nền tảng **Expo** và **React Native**. Ứng dụng cung cấp trải nghiệm nhắn tin mượt mà, hỗ trợ gửi tệp tin, hình ảnh và các tính năng tương tác hiện đại.

## 🚀 Tính năng chính

- **Nhắn tin thời gian thực**: Sử dụng Socket.io để đảm bảo tin nhắn được truyền tải tức thì.
- **Trò chuyện nhóm**: Tạo và quản lý nhóm trò chuyện dễ dàng.
- **Tìm kiếm & Kết bạn**:
  - Tìm kiếm người dùng qua tên đăng nhập.
  - Hỗ trợ quét mã QR để kết nối nhanh chóng.
  - Quản lý yêu cầu kết bạn.
- **Chia sẻ đa phương tiện**:
  - Gửi hình ảnh và **video** từ thư viện hoặc chụp trực tiếp.
  - Trình phát video tích hợp (Integrated Video Player) với đầy đủ điều khiển.
  - Hỗ trợ gửi các tệp tin tài liệu lên đến 100MB qua cơ chế **Multipart Upload**.
  - Tự động nén ảnh và xử lý dữ liệu trước khi tải lên.
- **Hệ thống Avatar thông minh**:
  - Tự động hiển thị tên viết tắt (Initials) với màu sắc ngẫu nhiên khi không có ảnh đại diện.
  - Avatar nhóm (Group Avatar) hiển thị lưới các thành viên.
- **Thư viện Media trực quan**:
  - Xem lại tất cả hình ảnh, tệp tin và liên kết đã chia sẻ trong cuộc trò chuyện.
  - Hiển thị thời gian (Timestamp) chi tiết cho từng mục media.
- **Thông báo đẩy (Push Notifications)**: Nhận thông báo tin nhắn mới ngay cả khi không mở ứng dụng.
- **Giao diện hiện đại**:
  - Hỗ trợ Dark Mode/Light Mode tự động.
  - Hiệu ứng mượt mà với React Native Reanimated.
  - Thiết kế Responsive với NativeWind (Tailwind CSS).

## 🆕 Cập nhật mới nhất
- **Video Chat Support**: Tích hợp `expo-video` hỗ trợ gửi và xem video mượt mà trong cuộc hội thoại.
- **Multipart Storage**: Triển khai MinIO Multipart Upload cho phép tải lên tệp tin dung lượng lớn với thanh tiến trình (Progress bar).
- **Media Gallery Enhanced**: Trang quản lý media hỗ trợ phân loại ảnh/video/files cùng thời gian chi tiết.
- **Improved Avatars**: Hệ thống initials fallback mới và hiển thị avatar nhóm chuyên nghiệp hơn.

## 🛠 Công nghệ sử dụng

- **Framework**: [Expo](https://expo.dev/) (SDK 54) & [React Native](https://reactnative.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS cho React Native)
- **Real-time**: [Socket.io Client](https://socket.io/)
- **State Management**: React Context API & Hooks
- **Media**: Expo Camera, Expo Image Picker, Expo Document Picker, **Expo Video**, **Expo Image Manipulator**
- **Animations**: React Native Reanimated & Gesture Handler

## 📁 Cấu trúc thư mục

- `app/`: Định nghĩa các màn hình và luồng điều hướng (Expo Router).
- `components/`: Các thành phần giao diện dùng chung (Chat, Avatars, Modals, Lists...).
- `services/`: Các dịch vụ xử lý logic API, Socket, Auth và Lưu trữ.
- `hooks/`: Các custom hooks xử lý logic nghiệp vụ (Chat thread, Typing indicator, Keyboard...).
- `context/`: Quản lý trạng thái toàn cục (với Auth, Notification...).
- `constants/`: Các hằng số về màu sắc, kích thước, cấu hình.
- `utils/`: Các hàm tiện ích bổ trợ.

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

