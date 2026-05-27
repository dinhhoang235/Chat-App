# Tối ưu chat kiểu Messenger / Zalo

Tài liệu này tổng hợp cách làm để màn chat của app mở nhanh, hiện nội dung sớm, ảnh lên dần ở nền, và không còn cảm giác "đứng" khi vào thread.

Mục tiêu không phải là làm mọi thứ xong trước khi render, mà là render ngay phần người dùng cần thấy, rồi hydrate dữ liệu và media phía sau.

## 1. Nguyên tắc cốt lõi

- Hiển thị cache hoặc snapshot cũ trước, không chờ network xong mới dựng UI.
- Không để ảnh, cache size, hay prefetch media chặn first paint.
- Giữ chiều cao bubble ổn định để list không nhảy layout.
- Chạy các tác vụ nền sau khi màn chat đã hiện, không tranh JS thread với render đầu tiên.
- Ưu tiên progressive loading giống Messenger / Zalo: thấy chat trước, ảnh và metadata đến sau.

## 2. Những gì log hiện tại đã cho thấy

Trong repo này, phần chậm còn lại chủ yếu nằm ở network:

- `initialMessages` từ memory cache chỉ mất vài ms.
- `buildProcessedMessages` gần như 0 ms.
- `chatApi.getMessages` vẫn mất khoảng gần 1 giây trở lên.
- Các tác vụ prefetch ảnh và size prefill đã giảm đáng kể, nhưng vẫn nên để chạy nhẹ ở nền.

Kết luận: FlashList không phải thủ phạm chính. Cổ chai chính là request dữ liệu đầu tiên và cách UI chờ nó.

## 3. Cách làm đúng để giống Messenger / Zalo

### 3.1. Render sớm từ cache

Ưu tiên lấy dữ liệu sẵn có từ memory cache hoặc local cache trước.

Trong repo, flow này nên được giữ và mở rộng ở:

- [mobile/hooks/useChatThread.ts](mobile/hooks/useChatThread.ts)
- [mobile/hooks/useChatThread/useChatThreadRuntime.ts](mobile/hooks/useChatThread/useChatThreadRuntime.ts)

Nguyên tắc:

- Nếu có cache thì vẽ ngay.
- Network chỉ dùng để refresh nền.
- Không set spinner chặn UI khi đã có đủ dữ liệu để hiển thị thread.

### 3.2. Không chặn first paint bằng media hydration

Ảnh và thumbnail nên được warm ở nền, không nên `await` trước khi set messages.

Trong luồng hiện tại, phần ảnh nên được đối xử như sau:

- set messages ngay sau khi response về.
- sau đó mới warm cache ảnh.
- ảnh thiếu metadata thì bổ sung dần sau.

File liên quan:

- [mobile/utils/imageCache.ts](mobile/utils/imageCache.ts)
- [mobile/hooks/useChatThread/useChatThreadRuntime.ts](mobile/hooks/useChatThread/useChatThreadRuntime.ts)

### 3.3. Giữ layout bubble ổn định

Messenger / Zalo thường cho cảm giác ổn vì bubble không đổi kích thước nhiều sau khi đã mount.

Cần giữ:

- ảnh có width/height hoặc aspect ratio sẵn.
- video/file/location bubble có chiều cao đoán trước được.
- tránh resize lại item sau `onLoad` nếu không thật sự cần.

### 3.4. Tách rõ "hiện UI" và "làm đẹp sau"

Đừng gom các việc sau vào cùng một bước trước render:

- fetch messages
- warm cache ảnh
- prefill size cache
- load metadata bổ sung

Messenger / Zalo thường tách chúng thành nhiều pha:

1. Vẽ thread ngay.
2. Nạp lại dữ liệu nền.
3. Warm ảnh và metadata nền.
4. Cập nhật dần khi sẵn sàng.

## 4. Checklist triển khai cho repo này

### 4.1. Mở chat

- Giữ `initialMessages` từ cache để vào chat ngay.
- Không để thread chờ `getMessages` mới hiện UI.
- Nếu network chậm, vẫn để list sẵn có hiển thị trước.

### 4.2. Danh sách tin nhắn

- Dùng list ảo hoá tối ưu nhất có thể.
- Giữ `estimatedItemSize` sát thực tế.
- Tránh render lại toàn bộ list chỉ vì typing, menu, reaction, hoặc upload progress.
- Không đưa object inline mới vào item nếu không cần.

### 4.3. Ảnh trong chat

- Lưu width/height ngay từ lúc upload nếu có thể.
- Render thumbnail trước, full image sau.
- Không để ảnh thiếu metadata chặn layout.
- Warm cache ảnh ở nền thay vì trong luồng mở chat.

### 4.4. Cache và network

- Cache conversation gần nhất trong memory.
- Cache thêm AsyncStorage nếu phù hợp.
- Refresh network song song nhưng không block paint.
- Nếu endpoint tin nhắn nặng, trả page nhỏ hơn hoặc tách metadata media ra.

## 5. Những thứ không nên làm

- Không đợi xong image cache rồi mới set messages.
- Không dùng loading spinner che toàn màn nếu đã có dữ liệu cũ.
- Không bắt list chờ nhiều effect nền mới được render.
- Không để effect prefetch chạy lặp lại nhiều lần cho cùng một conversation.
- Không để một message nhỏ làm rerender toàn bộ thread.

## 6. Các file nên ưu tiên khi tối ưu tiếp

- [mobile/app/chat/[id].tsx](mobile/app/chat/%5Bid%5D.tsx)
- [mobile/hooks/useChatThread.ts](mobile/hooks/useChatThread.ts)
- [mobile/hooks/useChatThread/useChatThreadRuntime.ts](mobile/hooks/useChatThread/useChatThreadRuntime.ts)
- [mobile/utils/imageCache.ts](mobile/utils/imageCache.ts)
- [mobile/components/chat/messageParts/MessageImageBubble.tsx](mobile/components/chat/messageParts/MessageImageBubble.tsx)

## 7. Cách kiểm tra đã "giống Messenger / Zalo" hơn chưa

Nên test theo các case này:

- mở thread cũ có 20 đến 50 message, phải thấy content ngay.
- mở thread nhiều ảnh, ảnh đầu tiên không được làm đứng UI.
- fling nhanh không thấy blank area rõ rệt.
- typing, reaction, menu, sheet không làm mất frame của list.
- mạng chậm thì vẫn thấy cache trước, network cập nhật sau.

## 8. Kết luận

Muốn có cảm giác giống Messenger / Zalo thì phải đổi mục tiêu từ "load xong rồi mới vẽ" sang "vẽ ngay từ cache, rồi đồng bộ dần ở nền".

Trong repo này, các điểm quan trọng nhất là:

- render từ cache sớm
- không block first paint vì network hoặc ảnh
- giữ layout bubble ổn định
- giảm effect chạy lặp và work nền không cần thiết

Nếu làm đúng 4 điểm này, màn chat sẽ bớt cảm giác đứng rõ rệt và tiến gần hành vi của Messenger / Zalo hơn.# Toi uu chat nhu Messenger/Zalo

## Muc tieu
Khi mo chat phai thay noi dung ngay, khong cho nguoi dung cho:
- khong doi network xong moi ve UI
- khong doi anh hydrate xong moi mount list
- khong lam JS thread bi chong khi vao man chat

## Nguyen tac chung
1. Render truoc, lam dep sau.
2. Cache truoc, fetch lai o nen.
3. Anh va media phai la progressive loading, khong duoc block first paint.
4. Chi lam viec nang sau khi man chat da hien.

## Cai gi dang lam cham hien tai
Theo log hien tai, co 3 diem chinh:
- `chatApi.getMessages` mat khoang 0.9s den 1.5s.
- `image cache hydration` tung chan first open.
- Chat screen co nhieu effect chay lap lai cho cung conversation.

`buildProcessedMessages` va prefill size list khong con la van de chinh.

## Cach lam giong Messenger/Zalo

### 1. Hien UI ngay tu cache
- Neu co `initialMessages` hoac cache local thi render list ngay.
- Khong block body loading neu da co data de ve.
- Nen co snapshot cu de user thay ngay man chat.

### 2. Network chi refresh nen
- Goi `getMessages` de cap nhat, nhung khong cho no giu first paint.
- Neu request cham, UI van phai o trang thai hien.
- Khi response ve thi merge vao list.

### 3. Anh phai co thumbnail/dimension san
- Luu `width`, `height`, `thumbnailUrl` ngay luc upload.
- Bubble anh phai co kich thuoc on dinh tu lan render dau.
- Chi warm cache anh o nen, khong await trong duong vao chat.

### 4. List phai mount nhe nhat co the
- Dung `FlashList` hoac list toi uu tuong duong, nhung khong de no lam viec nang luc khoi dong.
- `estimatedItemSize` phai gan dung.
- Chi prefill size cho mot so item gan viewport, khong loop qua qua nhieu.

### 5. Khong lap effect vo can
- Moi conversation chi nen fetch mot lan o open.
- Thumbnail prefetch, size prefill, media prefetch chi nen chay mot lan.
- Neu effect bi chay lap, se tao cam giac giat va dong UI.

### 6. Khong dung InteractionManager cho luong chat chinh
- `InteractionManager` co the tao cam giac tre va con warning.
- Neu can defer work, dung `requestIdleCallback` hoac `setTimeout(0)` cho task nhe.
- Task nang nen tach ra thanh tung buc nho.

## Thu tu uu tien de toi uu
### Uu tien 1: first paint
- Lo bo moi `await` khong can thiet trong duong vao chat.
- Render list ngay khi co cache.
- Khong de media hydration chan man chat.

### Uu tien 2: network
- Kiem tra vi sao `getMessages` cham.
- Neu endpoint tra ve cham, can toi uu server hoac cache API.
- Co the tra cache local truoc, refresh sau.

### Uu tien 3: media
- Thumbnail prefetch chi lam sau.
- Anh full chi tai khi can.
- Khong hydrate disk cache ngay luc open.

### Uu tien 4: stable rerender
- Giam rerender cua item khi state phu doi.
- Tach menu, sheet, typing, search, reaction ra khoi item.
- Giu props cua item on dinh.

## Check list can lam
- [ ] Hien list ngay neu co cache.
- [ ] Bo `await` trong phan hydrate anh luc vao chat.
- [ ] Chi fetch messages mot lan cho moi conversation.
- [ ] Bo lap prefetch effect.
- [ ] Giam effect/phu luc open.
- [ ] Kiem tra server `getMessages`.
- [ ] Dam bao thumbnail va size anh co san trong payload.
- [ ] Dung prefetch nen, khong block UI.

## Kien truc ly tuong
1. Man chat mo ra tu cache local.
2. List ve ngay.
3. Network cap nhat o nen.
4. Thumbnail len truoc.
5. Anh full len sau.
6. Moi chung chi update khi da co mat tren man hinh.

## Ket luan
Neu muon cam giac giong Messenger/Zalo, diem quan trong nhat khong phai list nao nhanh hon, ma la:
- UI phai co data de ve ngay
- khong cho request/network/media chan first paint
- moi thu nang deu de o nen

