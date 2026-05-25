## Notifications — Push & In-app

1. Tên chức năng
- Notifications: push (FCM/APNs) and in-app notifications

2. Mục đích
- Thông báo người dùng về tin nhắn, cuộc gọi, friend-requests khi offline; lưu in-app history.

3. Actor
- App server, Notification queue/worker, FCM/APNs, Database, Client devices.

4. Input
- Nhận event nội bộ (ví dụ: message mới, cuộc gọi tới, yêu cầu kết bạn) có đính kèm user đích và thông tin thiết bị (devices).

5. Output
- Trạng thái kết quả đẩy thông báo (Push send results); ghi lưu (store) lại các notification object vào database để truy xuất; thông báo được đẩy thành công đến đích.

6. Flow xử lý (chi tiết)
- Khi có event: xác định các device đích -> nếu thiết bị đang online qua WS thì bỏ qua việc gửi push; nếu không thì enqueue job push -> worker tạo payload và gửi tới FCM/APNs -> xử lý response (cleanup invalid tokens).

7. Sequence Diagram
```mermaid
sequenceDiagram
  autonumber
  participant API as App Server
  participant Q as Queue
  participant W as Worker
  participant F as FCM/APNs
  participant D as Device

  Note over API,Q: 1. Enqueue push job
  API->>+Q: Nạp Push Job (enqueue)
  Q-->>-API: Xác nhận (jobId)

  Note over W,Q: 2. Dequeue job
  W->>+Q: Kéo Job về (dequeue)
  Q-->>-W: Dữ liệu Payload
  activate W

  Note over W,F: 3. Send push
  W->>+F: Gửi Push (send)
  F-->>-W: Kết quả trả về (response)
  deactivate W
  F->>D: Phân phối tới điện thoại (deliver)
```

7.1 Chi tiết luồng kiểm tra trạng thái Online và gửi Push
```mermaid
sequenceDiagram
  autonumber
  participant Event as App/Socket (Internal)
  participant R as Redis (Presence)
  participant DB as Database
  participant Q as Queue (BullMQ/RabbitMQ)

  Note over Event,R: 1. Check presence
  Event->>+R: MGET presence:user:<ids>
  R-->>-Event: [online, offline, ...]
  loop for offline users
    Note over Event,DB: 2. Fetch device tokens
    Event->>+DB: Fetch device_tokens
    DB-->>-Event: tokens
    Note over Event,Q: 3. Enqueue push job
    Event->>+Q: Nạp job push (payload, tokens)
    Q-->>-Event: queued
  end
```

7.2 Cơ chế Retry và Cleanup Token rác (Worker)
```mermaid
sequenceDiagram
  autonumber
  participant W as Worker
  participant F as FCM/APNs
  participant DB as Database

  Note over W,F: 1. Send push
  W->>+F: Gửi Push notification
  F-->>-W: Response (Mixed: OK, Unregistered)
  alt Invalid Token / Unregistered
    Note over W,DB: 2. Cleanup invalid token
    W->>+DB: DELETE FROM device_tokens WHERE token
    DB-->>-W: ok
  else Timeout / Server Error
    Note over W: Throw Error để Queue tự động Retry (với backoff)
  end
```

8. API Design
- Internal: `POST /notifications/send` (service-to-service).
- Client: `GET /notifications` to fetch in-app notifications.

9. Database liên quan
- `device_tokens` (user_id, token, platform, last_seen).
- `notifications` (id, user_id, payload, delivered, created_at).

10. Validation / Business Rules
- Tuân thủ cài đặt cấu hình thông báo (chẳng hạn tắt thông báo - mute, chế độ DND); gộp nhóm (group) tin báo tương tự nếu cần; chiến lược retry khi gặp lỗi mạng tạm thời.

11. Error Handling
- Thực hiện Retry với những lỗi tạm thời; đánh dấu và dọn dẹp các token device lỗi; ghi chú log đầy đủ những lần thử bị fail.
