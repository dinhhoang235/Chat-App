# Tối ưu chat kiểu Messenger / Zalo

Mục tiêu là mở chat thấy nội dung ngay, còn ảnh và metadata thì lên dần ở nền. Tài liệu này chỉ giữ các nguyên tắc và việc còn lại cần làm.

## Nguyên tắc

- Render từ cache/snapshot trước, network refresh sau.
- Không để media hydration, prefetch, hay size prefill chặn first paint.
- Giữ chiều cao bubble ổn định để list không nhảy layout.
- Tách rõ phần “hiện UI” và phần “làm đẹp sau”.
- Các tác vụ nặng phải chạy nền, không tranh JS thread lúc mở chat.

## Kết luận từ log hiện tại

- `initialMessages` từ cache chỉ mất vài ms.
- `buildProcessedMessages` gần như 0 ms.
- Chỗ còn chậm chủ yếu là `chatApi.getMessages` và vài effect mount-time.
- FlashList không còn là thủ phạm chính, nhưng vẫn cần giữ cấu hình sát thực tế.

## Cách làm đúng

### Mở chat

- Hiển thị ngay nội dung có sẵn từ cache.
- Không chặn UI bằng spinner nếu đã có đủ data để vẽ thread.
- Network chỉ dùng để refresh nền.

### Media

- Lưu `width`, `height`, `thumbnailUrl` sớm nhất có thể.
- Render thumbnail trước, full image sau.
- Warm cache ảnh ở nền, không `await` trong đường mở chat.

### List

- Giữ `estimatedItemSize` sát thực tế.
- Tránh object inline và props inline làm rerender dây chuyền.
- Chỉ prefill size cho vài item gần viewport.

### Work nền

- Mỗi conversation chỉ nên fetch/prefetch một lần khi open.
- Tránh chạy lại các effect prefetch, size prefill, media warm.
- Dùng `requestIdleCallback` hoặc `setTimeout(0)` cho task nhẹ, không dùng `InteractionManager` cho luồng chính.

## File ưu tiên

- [mobile/app/chat/[id].tsx](mobile/app/chat/%5Bid%5D.tsx)
- [mobile/hooks/useChatThread.ts](mobile/hooks/useChatThread.ts)
- [mobile/hooks/useChatThread/useChatThreadRuntime.ts](mobile/hooks/useChatThread/useChatThreadRuntime.ts)
- [mobile/utils/imageCache.ts](mobile/utils/imageCache.ts)
- [mobile/components/chat/messageParts/MessageImageBubble.tsx](mobile/components/chat/messageParts/MessageImageBubble.tsx)

## Việc cần làm tiếp

- [ ] Đo lại first-paint, `tap -> render start -> screen mount -> first layout`.
- [ ] Quét `mobile/` để tìm `useEffect` có `await` còn sót lại.
- [ ] Giảm props inline và object inline trong item list.
- [ ] Warm cache chỉ cho vài item đầu tiên trong viewport.
- [ ] Tối ưu thêm `chatApi.getMessages` nếu request đầu vẫn chậm.
- [ ] Rà lại `FlashList` config theo từng loại thread.
- [ ] Đưa typing, search, reaction, menu, prefetch sang trạng thái lazy hơn.
- [ ] Kiểm tra smoke case: thread cũ, thread nhiều ảnh, mạng chậm, fling nhanh.

## Checklist mượt

- [ ] Mở thread có cache là thấy content ngay.
- [ ] Thread nhiều ảnh không làm đứng khung hình đầu.
- [ ] Cuộn nhanh không thấy blank area rõ.
- [ ] Typing, reaction, menu, sheet không làm list giật frame đầu.
- [ ] Ảnh full và metadata có thể lên sau, nhưng bubble phải ổn định.
- [ ] Không có tác vụ nền nào đủ nặng để tranh JS thread với first paint.