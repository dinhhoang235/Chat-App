# Chunk Upload / Multipart Upload chi tiết

### 1. Khi nào dùng chunked upload

- Mobile quyết định file lớn khi `uploadSize > multipartThreshold`.
- Ngưỡng mặc định: `DEFAULT_MULTIPART_THRESHOLD_BYTES = 5MB`.
- Với audio, ngưỡng nhẹ hơn: `AUDIO_MULTIPART_THRESHOLD_BYTES = 2MB`.
- File lớn hơn ngưỡng sẽ dùng `uploadFileChunked()` thay vì single PUT.

### 2. Flow chính trên client

- `mobile/hooks/useChatThread/useChatThreadAttachments.ts` chuẩn bị attachment và gọi `storageApi.uploadFileChunked(...)`.
- `mobile/services/storage.ts` thực hiện:
  1. `initMultipart(fileName, fileType)` → `uploadId`, `objectName`.
  2. Tính `totalParts = ceil(fileSize / 5MB)`.
  3. Chọn concurrency động `1..5` dựa trên mạng và thiết bị.
  4. Với mỗi part:
     - Lấy presigned URL bằng `getMultipartUrl(objectName, uploadId, partNumber)`.
     - Đọc chunk từ file gốc bằng `FileSystem.readAsStringAsync({ position, length, encoding: 'base64' })`.
     - Ghi chunk ra file tạm trong `FileSystem.cacheDirectory`.
     - Upload file tạm lên MinIO bằng `FileSystem.uploadAsync(uploadUrl, chunkFileUri, { httpMethod: 'PUT' })`.
     - Lấy `ETag` từ header trả về và lưu vào danh sách parts.
  5. Sort danh sách parts theo `partNumber`.
  6. Gọi `completeMultipart(objectName, uploadId, parts)` để MinIO ghép lại và trả `finalUrl`.
  7. Nếu có lỗi ở bất kỳ bước nào, gọi `abortMultipart(objectName, uploadId)` và xóa file tạm.

### 3. Chunk upload chuyên sâu

- Kích thước chunk cố định: `CHUNK_SIZE = 5 * 1024 * 1024` (5MB).
- Mỗi part phải có `partNumber` bắt đầu từ 1.
- Client dùng `runWithRetry()` để retry khi upload từng part thất bại.
- `uploadFileChunked()` cập nhật progress tới UI: 0..0.95 khi upload chunks, 0.97 khi chờ complete, 1.0 khi hoàn tất.
- Để tránh trùng lặp tên và đảm bảo phân quyền, server tạo `objectName` theo dạng `${userId}/${UUID}${ext}`.

### 4. Flow server / MinIO

- `server/src/routes/storage.ts` định nghĩa 4 endpoint multipart:
  - `/init-multipart`
  - `/get-multipart-url`
  - `/complete-multipart`
  - `/abort-multipart`
- `server/src/controllers/storage/initMultipart.ts` gọi `initMultipartUpload()` và trả về `uploadId` + `objectName`.
- `server/src/controllers/storage/getMultipartUrl.ts` kiểm tra `objectName` thuộc user rồi gọi `getPresignedUrlForPart()`.
- `server/src/controllers/storage/completeMultipart.ts` nhận `parts`, gọi `completeMultipartUpload()` và trả `finalUrl`.
- `server/src/controllers/storage/abortMultipart.ts` gọi `abortMultipartUpload()` khi upload bị huỷ.

### 5. Các file quan trọng

- `mobile/services/storage.ts`
- `mobile/hooks/useChatThread/useChatThreadAttachments.ts`
- `server/src/routes/storage.ts`
- `server/src/controllers/storage/initMultipart.ts`
- `server/src/controllers/storage/getMultipartUrl.ts`
- `server/src/controllers/storage/completeMultipart.ts`
- `server/src/controllers/storage/abortMultipart.ts`
- `server/src/utils/minio.ts`

### 6. Đặc điểm kỹ thuật thêm

- Server chỉ cấp presigned URL, không download/upload file qua backend.
- Upload trực tiếp lên MinIO/Nginx giúp giảm tải backend và tiết kiệm băng thông.
- Multipart upload phù hợp cho file lớn vì retry theo chunk, không phải restart toàn bộ.
- Nginx proxy `/storage/` được dùng để rewrite presigned URLs phù hợp môi trường container.
