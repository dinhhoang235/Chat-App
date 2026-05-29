# Ảnh đại diện nhóm ghép (Group Avatar Composite) — Thiết kế & Hướng triển khai

Mục tiêu
--------
Làm cho avatar nhóm hiển thị ngay giống Messenger: tạo một ảnh ghép duy nhất đại diện cho nhóm (2–4 avatar thành viên hoặc chữ viết tắt), lưu và phục vụ qua CDN để client chỉ cần fetch một URL, giảm số request và đảm bảo hiển thị ngay trên danh sách cuộc trò chuyện, header và bubble.

Ý tưởng tổng quan
-----------------
- Sinh một ảnh composite (ghép) cho mỗi nhóm trên server (hoặc worker), lưu lên object storage và serve qua CDN.
- Client dùng URL composite này ở mọi nơi cần hiển thị avatar nhóm (list, header, message bubble). Nếu composite chưa có thì hiện fallback dựa trên initials ngay lập tức và thay bằng composite khi có.

Lợi ích
--------
- Chỉ 1 request cho avatar nhóm thay vì N request cho từng thành viên.
- CDN cache giúp tải nhanh và sẵn sàng trước khi người dùng vào phòng chat.
- Giảm độ trễ hiển thị ảnh khi mở thread, thay vì phải chờ nhiều file nhỏ tải về.

Thiết kế server
----------------
1) Lưu trữ & CDN
   - Lưu file composite lên S3/MinIO và phục vụ qua CDN (CloudFront/Cloudflare) hoặc public object URL.
   - Quy ước tên: `groups/{groupId}/composite/v{version}.webp` hoặc dùng hash nội dung.
   - Dùng tên file phiên bản hóa để có thể đặt TTL dài trên CDN (immutable URLs).

2) Dịch vụ sinh composite (worker)
   - Kích hoạt sinh composite khi:
     - Tạo nhóm mới
     - Thêm/bớt thành viên
     - Thành viên thay đổi avatar
     - Cron/điều kiện phát hiện composite quá cũ
   - Luồng xử lý:
     1. Chọn tối đa 4 avatar ưu tiên (thumbnail/small). Có thể ưu tiên chủ nhóm, thành viên hoạt động gần đây.
     2. Với avatar không có hoặc tải thất bại, dùng chữ cái viết tắt (initials) và màu nền dự phòng.
     3. Download avatar với timeout & retry; fallback thành initials khi cần.
     4. Resize/crop về kích thước mục tiêu (ví dụ 128×128, 256×256). Xuất WebP để giảm kích thước.
     5. Bố trí các ảnh theo layout cố định (2×2, hoặc 1 lớn + 3 nhỏ chồng), áp dụng viền nhỏ nếu cần.
     6. Lưu file composite lên object storage với tên phiên bản mới.
     7. Cập nhật trường metadata cuộc trò chuyện (`compositeAvatarUrl`) trong DB.

3) API
   - Thêm vào response các trường: `compositeAvatarUrl`, `compositeAvatarVersion`.
   - `GET /conversations` và `GET /conversations/:id` trả về `compositeAvatarUrl`.
   - (Tuỳ chọn) `POST /conversations/:id/composite/regenerate` để force regenerate.

4) Cache & invalidate
   - Dùng tên file có version/hash để đặt TTL dài (CDN cache friendly).
   - Khi regenerate, upload file mới với tên mới và cập nhật DB pointer → client download URL mới.
   - Nếu dùng URL cố định, cần purge CDN khi update (ít tối ưu hơn).

5) Hiệu năng & độ tin cậy
   - Dùng thư viện xử lý ảnh nhanh (Sharp / libvips) để sinh ảnh nhẹ.
   - Chạy sinh composite bằng background queue (Redis queue / worker) — không block request chính.
   - Giữ giới hạn tài nguyên, timeout và fallback rõ ràng (không vì avatar một người mà thất bại hoàn toàn).

Thay đổi phía client
---------------------
1) Ưu tiên `compositeAvatarUrl`
   - Khi map response conversation, nếu tồn tại `compositeAvatarUrl` thì dùng làm `avatar` cho nhóm.
   - Như vậy list, header, bubble đều dùng cùng một URL.

2) Fallback ngay lập tức
   - Nếu `compositeAvatarUrl` chưa có hoặc đang sinh: hiển thị placeholder dạng ghép initials (deterministic) ngay.
   - Đồng thời, kick-off prefetch cho `compositeAvatarUrl` hoặc participant avatars.

3) Cache & revalidate
   - Dùng `expo-image` với `cachePolicy='memory-disk'` và `priority='high'` cho hình hot (list/header).
   - Vì URL composite là immutable (khi dùng version/hash), client có thể cache lâu.

4) Hướng làm riêng cho bubble trong group
   - Bubble trong group không dùng composite của cả nhóm; bubble vẫn là avatar của từng người gửi.
   - Chỉ hiển thị avatar ở bubble đầu tiên của một chuỗi tin nhắn liên tiếp từ cùng một người; các bubble sau cùng người đó có thể ẩn avatar để giống Messenger.
   - Prefetch avatar của tất cả thành viên ngay khi load conversation metadata, không đợi vào thread mới tải.
   - Dùng cùng một URL đã normalize cho mọi nơi: header, bubble, danh sách, mention/reply preview.
   - Nếu avatar từng người chưa có trong cache, hiện fallback initials/màu nền ngay trong bubble rồi thay bằng ảnh khi cache xong.
   - Với bubble, ưu tiên render từ cache local (file://) nếu có; nếu chưa có thì giữ UI mượt, không chặn render chờ ảnh.

Đưa vào production — lộ trình
-----------------------------
1. Phase 1 — Server: implement worker + upload composite + expose field trong API (không ép client dùng ngay).
2. Phase 2 — Client opt-in: client đọc `compositeAvatarUrl` và hiển thị nếu có; vẫn fallback cũ nếu không.
3. Phase 3 — Rollout: đảm bảo đa số nhóm có composite; cập nhật UI để ưu tiên composite.
4. Giám sát: theo dõi số request avatar, cache hit ratio, time-to-first-paint cho danh sách và errors của worker.

Trường hợp đặc biệt & cân nhắc
------------------------------
- Nhóm lớn: chỉ lấy mẫu (owner + 3 người hoạt động gần đây) hoặc hiển thị biểu tượng stylized + số lượng thành viên.
- Quyền riêng tư: cho phép người dùng opt-out khỏi composite (không dùng ảnh cá nhân); fallback về initials.
- Các biến thể avatar: ưu tiên thumbnail vuông để server không phải crop phức tạp.
- Khi sinh thất bại: client hiện initials fallback; worker retry sau.

Checklist triển khai (server)
-----------------------------
- [ ] Thêm cột `compositeAvatarUrl`, `compositeAvatarVersion` vào bảng `conversations`
- [ ] Cài worker sinh composite (Sharp/libvips)
- [ ] Upload composite đến object storage (S3/MinIO) với filename versioned
- [ ] Expose `compositeAvatarUrl` trong API conversations
- [ ] Kích hoạt queue trigger khi nhóm thay đổi / avatar thay đổi
- [ ] Log & monitoring cho thời gian sinh và lỗi

Checklist triển khai (client)
-----------------------------
- [ ] Map `compositeAvatarUrl` vào `avatar` cho conversation nhóm
- [ ] Hiện placeholder initials composite khi chưa có
- [ ] Prefetch composite URL / set `cachePolicy='memory-disk'`
- [ ] Nghe socket `conversation_updated` để cập nhật composite URL realtime
- [ ] Tests end-to-end cho hiển thị composite và fallback

Phương án tạm nếu không thay backend ngay
-----------------------------------------
Client-side composite generator (prototype):
- Dùng `react-native-svg` hoặc `react-native-canvas` để vẽ layout 2×2 hoặc overlapping circles.
- Nếu client đã có avatar của thành viên (cached), vẽ ảnh; nếu không, dùng initials.
- Xuất ra blob PNG/WebP, lưu bằng `expo-file-system` và dùng file:// URL như composite đã cached.
- Cache theo key `groupId:participantsHash` và invalidate khi danh sách/avatars thay đổi.

Kết luận
--------
- Giải pháp tốt nhất để đạt UX "giống Messenger" là server-side composite: nhanh, CDN-cacheable, ít request.
- Nếu backend chưa sẵn sàng, client-side composite + fallback initials cung cấp cải thiện lớn về UX mà không cần backend.

Tiếp theo tôi có thể:
- Soạn PR & migration SQL cho backend (nếu bạn muốn làm server-side), hoặc
- Bắt tay viết prototype client-side composite và tích hợp vào `GroupAvatar` để bạn test.

Bạn muốn tôi làm PR backend hay viết prototype client-side bây giờ?