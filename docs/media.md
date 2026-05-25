## Media — Upload & Management

1. Tên chức năng
- Media upload: images, audio, video, generic files (presigned or multipart)

2. Mục đích
- Lưu trữ file media an toàn, cung cấp URL công khai qua Nginx/MinIO, sinh thumbnails.

3. Actor
- Client, Storage (MinIO), App API, Worker (thumbnail/virus-scan), Database.

4. Input
- Gọi REST để presign: `POST /api/storage/upload-url` hoặc upload qua các endpoint API server-side xử lý kiểu multipart (`init`, `part`, `complete`).

5. Output
- Chuỗi trả về bao gồm `uploadUrl` (presigned host) kèm `finalUrl`, hoặc trả thẳng `finalUrl` sau khi upload `complete`; trả về metadata của tài nguyên media.

6. Flow xử lý (chi tiết)
- Presigned single PUT: client yêu cầu presign -> PUT lên storage -> client thông báo hoàn tất -> server kiểm tra và tạo media record.
- Multipart: init -> lấy presigned URL cho từng part -> client PUT các part -> complete -> server gọi completeMultipart và tạo media record.
- Server-side upload: client upload lên API -> server stream tới MinIO -> tạo media record.

7. Sequence Diagrams
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as App Server
  participant Min as MinIO
  participant DB as Database

  Note over C,API: 1. Request presigned upload
  C->>API: POST /api/storage/upload-url {fileName}
  activate API
  API->>Min: presign
  activate Min
  Min-->>API: {uploadUrl, finalUrl}
  deactivate Min
  API-->>C: {uploadUrl, finalUrl}
  deactivate API

  Note over C,Min: 2. Upload file
  C->>Min: PUT uploadUrl (file)
  activate Min
  Min-->>C: 200 OK
  deactivate Min

  Note over C,API: 3. Complete and persist
  C->>API: POST /media/complete {finalUrl, meta}
  activate API
  API->>DB: INSERT media
  activate DB
  DB-->>API: ok
  deactivate DB
  API-->>C: 201 {media}
  deactivate API
```

7.1 Host-aware presign rewrite (Nginx proxy) — client sees public host URL
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as App Server
  participant Min as MinIO
  participant N as Nginx

  Note over C,API: 1. Request presigned upload
  C->>API: POST /api/storage/upload-url {fileName}
  activate API
  API->>Min: presignedUrl(bucket, object)
  activate Min
  Min-->>API: internalUrl
  deactivate Min
  API->>API: rewrite URL host -> request.get('host')
  API-->>C: { uploadUrl (host-aware) }
  deactivate API

  Note over C,N: 2. Upload via proxy
  C->>N: PUT uploadUrl (Nginx proxies to MinIO)
  activate N
  N->>Min: PUT object
  activate Min
  Min-->>N: 200 OK
  deactivate Min
  N-->>C: 200 OK
  deactivate N
```

7.2 Multipart part signing details
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as App Server
  participant Min as MinIO

  Note over C,API: 1. Init multipart
  C->>API: POST /api/storage/init-multipart {fileName}
  activate API
  API->>Min: initiateMultipartUpload -> uploadId
  activate Min
  Min-->>API: uploadId
  deactivate Min
  API-->>C: { uploadId, objectName }
  deactivate API

  Note over C,API: 2. Get part URL
  C->>API: POST /api/storage/get-multipart-url {partNumber}
  activate API
  API->>Min: presignedUrl(part)
  activate Min
  Min-->>API: uploadUrl
  deactivate Min
  API-->>C: { uploadUrl }
  deactivate API

  Note over C,Min: 3. Upload part
  C->>Min: PUT uploadUrl (part)
  activate Min
  Min-->>C: etag
  deactivate Min

  Note over C,API: 4. Complete multipart
  C->>API: POST /api/storage/complete-multipart {parts}
  activate API
  API->>Min: completeMultipartUpload
  activate Min
  Min-->>API: ok
  deactivate Min
  API-->>C: 200 {finalUrl}
  deactivate API
```

7.3 Server-side direct upload handling (streaming to MinIO)
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as App Server
  participant Min as MinIO
  participant DB as Database
  participant Socket as Socket Server

  Note over C,API: 1. Upload multipart to API
  C->>API: POST /conversations/:id/messages (multipart)
  activate API
  API->>Min: putObject(stream)
  activate Min
  Min-->>API: url
  deactivate Min
  API->>DB: INSERT message with attachment
  activate DB
  DB-->>API: ok
  deactivate DB
  API->>Socket: emit new_message
  activate Socket
  Socket-->>API: emitted
  deactivate Socket
  API-->>C: 201 {message}
  deactivate API
```

7.4 Multipart end-to-end (client loop example)
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant API as App Server
  participant Min as MinIO

  Note over C,API: 1. Init multipart
  C->>API: POST /api/storage/init-multipart {fileName}
  activate API
  API->>Min: initiate multipart -> uploadId
  activate Min
  Min-->>API: uploadId
  deactivate Min
  API-->>C: {uploadId, objectName}
  deactivate API

  loop parts
    Note over C,API: 2. Presign part
    C->>API: POST /api/storage/get-multipart-url {partNumber}
    activate API
    API->>Min: presign part
    activate Min
    Min-->>API: uploadUrl
    deactivate Min
    API-->>C: {uploadUrl}
    deactivate API
    Note over C,Min: 3. Upload part
    C->>Min: PUT uploadUrl (part)
    activate Min
    Min-->>C: etag
    deactivate Min
  end

  Note over C,API: 4. Complete multipart
  C->>API: POST /api/storage/complete-multipart {parts}
  activate API
  API->>Min: completeMultipart
  activate Min
  Min-->>API: ok
  deactivate Min
  API->>DB: INSERT media
  activate DB
  DB-->>API: ok
  deactivate DB
  API-->>C: 201 {media}
  deactivate API
```

8. API Design
- `POST /api/storage/upload-url`
- `POST /api/storage/init-multipart`
- `POST /api/storage/get-multipart-url`
- `POST /api/storage/complete-multipart`

9. Database liên quan
- `media` (owner, url, mime, size, width/height, duration, created_at).

10. Validation / Business Rules
- Giới hạn kích thước tối đa cho mỗi loại file (chẳng hạn images 10MB, video 200MB); cho phép theo whitelist định dạng mime; quản lý dung lượng (quota) mỗi user nếu cần.

11. Error Handling
- `400` thiếu parameters; `403` cấm truy cập object; `413` tải trọng (payload) kích thước quá lớn; `500` lỗi storage/hoàn tất upload.
