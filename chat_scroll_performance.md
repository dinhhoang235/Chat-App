# Chat Scroll Performance — Không bị trắng màn hình khi cuộn nhanh

Tài liệu này mô tả cách tối ưu màn chat để trải nghiệm cuộn gần giống Messenger / Zalo: kéo nhanh vẫn giữ được nội dung, không bị trắng màn hình, không giật khi danh sách nhiều tin nhắn hoặc có media nặng.

## 1. Mục tiêu

- Không để vùng nhìn thấy bị trống khi user fling danh sách rất nhanh.
- Giữ tốc độ mở chat và chuyển đổi giữa các đoạn lịch sử ổn định.
- Tránh render lại toàn bộ cây chat chỉ vì một thay đổi nhỏ như typing, reaction, upload progress hoặc menu trạng thái.

## 2. Nút thắt thường gặp

Trong màn chat của repo, điểm nóng chính là danh sách tin nhắn ở [mobile/app/chat/[id].tsx](../mobile/app/chat/%5Bid%5D.tsx).

Các nguyên nhân hay gây trắng màn hình:

- List ảo hoá quá nhỏ window render, trong khi user cuộn nhanh hơn tốc độ JS kịp bơm item mới.
- Item có chiều cao thay đổi sau khi đã render, đặc biệt là ảnh / video / attachment.
- Dữ liệu bị thay đổi reference liên tục khiến toàn bộ list re-render.
- Tải trang lịch sử chỉ bắt đầu khi đã chạm đáy, nên lúc fling nhanh sẽ có khoảng trống trước khi page tiếp theo về.
- Placeholder, loading row, hoặc empty state làm list bị unmount/remount khi trạng thái loading đổi.

## 3. Ưu tiên số 1: dùng list ảo hoá đúng

Nếu danh sách chat còn dùng `FlatList`, bước nâng cấp đáng làm nhất là chuyển sang `FlashList`.

Lý do:

- `FlashList` tối ưu cho feed/chat dài.
- Hỗ trợ ước lượng chiều cao item tốt hơn, giảm blanking khi cuộn nhanh.
- Phù hợp với chat có mix text, date separator, image, file, reaction, typing row.

Khi dùng `FlashList`:

- Đặt `estimatedItemSize` sát kích thước trung bình thực tế.
- Phân loại item bằng `getItemType` nếu list có nhiều kiểu row khác nhau.
- Giữ `keyExtractor` ổn định, ưu tiên ID thật, hạn chế key theo index.
- Tránh nhét object/array mới vào `extraData` nếu không cần.

Nếu vẫn phải giữ `FlatList`:

- Tăng đủ `windowSize` để list có vùng đệm.
- Giữ `initialNumToRender` và `maxToRenderPerBatch` ở mức cân bằng, không quá thấp.
- Dùng `updateCellsBatchingPeriod` hợp lý để JS không bị dồn việc quá sát nhau.
- Bật `removeClippedSubviews` có chọn lọc, kiểm tra kỹ trên cả Android và iOS.

## 4. Ưu tiên số 2: item phải có chiều cao ổn định

Trắng màn hình rất hay xuất hiện khi item vừa render xong đã đổi chiều cao.

Checklist cho bubble:

- Ảnh trong chat nên có wrapper cố định hoặc aspect ratio cố định.
- Không đổi layout sau `onLoad` nếu không thật sự cần.
- Thumbnail video, file card, location card nên có chiều cao dự đoán được.
- Message bubble text nên limit line and wrap ổn định, tránh phụ thuộc quá nhiều vào đo thủ công sau mount.

Trong repo đã có một nguyên tắc quan trọng cho ảnh chat: wrapper ảnh cần giữ chiều cao ổn định, không resize sau khi load xong. Điều này giúp list không bị nhảy layout khi cuộn.

## 5. Ưu tiên số 3: preload và cache trước khi user chạm tới vùng trống

Messenger/Zalo không chỉ render nhanh, mà còn nạp sớm hơn vùng đang nhìn thấy.

Nên làm:

- Preload trang tiếp theo trước khi chạm đáy hoàn toàn.
- Giữ cache của vài page gần nhất trong memory hoặc storage nội bộ.
- Cache avatar, thumbnail media, và các metadata hay lặp lại.
- Khi mở lại cùng conversation, ưu tiên cache local trước rồi mới fetch network.

Với chat history:

- Đừng đợi user chạm “cuối danh sách” mới gọi `fetchMessages(true)`.
- Trigger tải thêm sớm hơn bằng threshold hợp lý.
- Nếu API trả page size nhỏ, tăng độ đệm để tránh mạng chậm làm hở list.

## 6. Ưu tiên số 4: hạn chế re-render không cần thiết

Một chat thread dài rất dễ bị render lại chỉ vì 1 trạng thái phụ thay đổi.

Nên giữ các phần sau thật “ổn định”:

- `renderItem` nên được memo hoá và chỉ phụ thuộc vào dữ liệu thật sự cần.
- Không truyền object/array inline mới vào `MessageBubble` nếu có thể tái sử dụng.
- Tách các state giao diện như menu, sheet, typing, search, reaction ra khỏi list item nếu không làm item cần rerender.
- Tránh update toàn bộ `messages` khi chỉ thay đổi 1 message; cập nhật có chọn lọc theo `id`.

Trong màn chat hiện tại, những state như typing indicator, composer, reaction sheet, menu, upload progress đều có thể gây nhiều render hơn cần thiết nếu reference không được kiểm soát.

## 7. Ưu tiên số 5: giữ skeleton và loading có kích thước thật

Một lỗi phổ biến là đổi từ loading sang list trống rồi list đầy, làm màn hình “nhấp nháy” hoặc trắng.

Nên dùng:

- Skeleton có chiều cao gần giống item thật.
- Loading indicator chỉ chiếm một phần hợp lý, không unmount cả khối list nếu không cần.
- Empty state khác với loading state.
- Khi đã có cache hoặc initial messages, hiển thị list ngay rồi load bổ sung phía sau.

## 8. Các thông số nên kiểm tra

Nếu vẫn dùng `FlatList`, có thể benchmark quanh các giá trị sau rồi chỉnh theo dữ liệu thật:

- `initialNumToRender`: 6 đến 12
- `maxToRenderPerBatch`: 6 đến 12
- `windowSize`: 5 đến 9
- `updateCellsBatchingPeriod`: 16 đến 50
- `onEndReachedThreshold`: đủ sớm để prefetch, thường 0.3 đến 0.7

Nếu dùng `FlashList`, ưu tiên:

- `estimatedItemSize` sát thực tế
- `drawDistance` đủ lớn để đệm trước khi user kéo mạnh
- `getItemType` để tách text / media / separator / typing row

## 9. Thứ tự nên làm cho repo này

1. Đảm bảo chat list dùng list ảo hoá tối ưu nhất có thể, ưu tiên `FlashList` nếu chưa dùng.
2. Giữ chiều cao bubble media ổn định, không resize sau load.
3. Prefetch page tiếp theo sớm hơn và giữ cache local cho conversation vừa mở.
4. Giảm re-render từ reaction, typing, search, menu và upload progress.
5. Test với 500 đến 1000 messages, xen kẽ text và image, rồi kéo liên tục từ trên xuống dưới.

## 10. Cách kiểm tra đã đạt chưa

Khi test thủ công, cần kiểm tra các tình huống sau:

- Cuộn rất nhanh lên đầu và xuống cuối không bị trống màn hình.
- Mở chat cũ có nhiều media vẫn render ổn định sau 1 đến 2 lần fling mạnh.
- Khi typing hoặc mở sheet, list không giật và không làm mất frame đang thấy.
- Khi network chậm, list vẫn giữ nội dung cũ trong lúc đợi page mới.

## 11. Kết luận ngắn

Muốn cuộn chat mượt như Messenger / Zalo thì không chỉ “render nhanh hơn”, mà phải kết hợp 3 lớp:

- Virtualization tốt: list phù hợp, window hợp lý.
- Layout ổn định: item không đổi chiều cao sau mount.
- Dữ liệu đệm sớm: cache, preload, và tránh reload toàn bộ list.

Nếu làm đúng 3 lớp này, hiện tượng trắng màn hình khi cuộn nhanh sẽ giảm rất rõ.