# Kiến trúc Hệ thống – Chat App

## 1. Tổng quan

Hệ thống Chat App được thiết kế theo mô hình **micro‑services** chạy trên Docker Compose,
phân tầng rõ ràng giữa lớp **Public** (Internet), lớp **Proxy**, và lớp **Internal Network**.

### Các thành phần chính

| Thành phần | Vai trò | Công nghệ | Port |
|---|---|---|---|
| Mobile App | Ứng dụng client | React Native | — |
| Nginx | Reverse proxy, SSL termination | Nginx Alpine | 80, 443 (public) |
| API Server | Backend REST + Socket.io | Node.js, Express, Prisma | 3000 (internal) |
| MySQL | CSDL quan hệ | MySQL 8.0 | 3306 (internal) |
| Redis | Cache & Socket.io pub/sub adapter | Redis 6.x | 6379 (internal) |
| MinIO | Lưu trữ object (ảnh, video) | MinIO S3‑compatible | 9000 (internal) |
| LiveKit | Máy chủ WebRTC signaling | LiveKit Server | 7880 (internal) |
| CoTurn | STUN/TURN relay cho LiveKit + P2P | coturn | 3478, 5349 (public), relay UDP 20000-20100 |
| FCM | Thông báo push | Firebase Cloud Messaging | — (external service) |

---

## 2. Sơ đồ kiến trúc tổng quan (Mermaid)

> **Lưu ý:** Nginx đứng **trước** API Server, đóng vai trò cổng vào duy nhất từ Internet.
> CoTurn và FCM là hai thành phần duy nhất expose trực tiếp ra ngoài cùng với Nginx.

```mermaid
---
config:
  layout: elk
---
flowchart LR
    %% === GROUPS ===
    subgraph ClientSide["🏠 CLIENT NETWORK (Private)"]
        Mobile["📱 Mobile App<br/>(React Native)"]
        NAT["🌐 NAT / Router<br/>(IP chuyển dịch)"]
    end         

    subgraph Internet["💫 INTERNET (Public)"]
        FCM["🔔 FCM<br/>(Firebase Cloud Messaging)"]
    end

    subgraph Proxy["🛡️ PROXY LAYER"]
        Nginx["💻 NGINX<br/>:80 / :443<br/>(SSL Termination, LB)"]
    end

    subgraph Internal["🔒 INTERNAL NETWORK (Docker Compose)"]
        subgraph Backend["⚙️ Backend Services"]
            API["🧩 API Server<br/>:3000<br/>(Node.js + Socket.io + REST)"]
            Redis["⚡ Redis<br/>:6379<br/>(Cache, Pub/Sub)"]
            MySQL["🗄️ MySQL<br/>:3306<br/>(Main DB)"]
        end

        subgraph Storage["🗂️ Storage Services"]
            MinIO["☁️ MinIO<br/>:9000<br/>(Object Storage, S3 API)"]
        end

        subgraph Realtime["🎥 Realtime (Audio/Video)"]
            LiveKit["📹 LiveKit<br/>:7880<br/>(WebRTC SFU)"]
        end
    end

    subgraph TURN["📡 TURN LAYER (Public)"]
        CoTurn["📶 CoTurn<br/>:3478 / :5349<br/>relay UDP 20000-20100<br/>(STUN + TURN)"]
    end

    %% === FLOWS ===
    Mobile -->|"UDP :3478 / 20000-20100<br/>TURN relay media (P2P failed)"| CoTurn
    Mobile -->|"HTTPS/WSS :443<br/>Login / Messaging / Upload"| NAT
    NAT --> Nginx
    FCM -->|"Push notification"| Mobile

    Nginx -->|"HTTP :3000<br/>REST / Socket.io WS"| API
    API -->|"TCP :3306<br/>SQL Queries"| MySQL
    API -->|"TCP :6379<br/>Cache / Pub-Sub"| Redis
    API -->|"HTTP :9000<br/>PUT / GET Objects"| MinIO
    API -->|"WS :7880<br/>Signaling + LiveKit API"| LiveKit
    API -->|"HTTPS (outbound)<br/>Push notification"| FCM
    LiveKit -->|"UDP :3478<br/>TURN relay config"| CoTurn
    CoTurn -.->|"UDP 20000-20100<br/>Relay media stream"| Mobile

    %% === STYLE CLASSES ===
    classDef client fill:#fefce8,stroke:#facc15,stroke-width:1.5px,color:#333
    classDef internet fill:#fff7ed,stroke:#fb923c,stroke-width:1.5px,color:#333
    classDef proxy fill:#eff6ff,stroke:#3b82f6,stroke-width:1.5px,color:#333
    classDef internal fill:#f0fdf4,stroke:#22c55e,stroke-width:1.5px,color:#333
    classDef turn fill:#fef2f2,stroke:#ef4444,stroke-width:1.5px,color:#333
    classDef subgroup fill:#f0f9ff,stroke:#06b6d4,stroke-width:1px,color:#333

    class ClientSide,Mobile,NAT client
    class Internet,FCM,GoogleSTUN internet
    class Proxy,Nginx proxy
    class Internal internal
    class Backend,Storage,Realtime subgroup
    class API,MySQL,Redis,MinIO,LiveKit internal
    class CoTurn turn
```

## 3. Luồng dữ liệu chi tiết

### 3.1 Đăng nhập / Đăng ký
```
Mobile ──HTTPS──► Nginx ──HTTP──► API ──SQL──► MySQL
                                  │
                                  └──► Trả về JWT token
```

### 3.2 Gửi & nhận tin nhắn (Real‑time)
```
Mobile ──WSS──► Nginx ──WS──► API
                               │
                               ├──► Redis (Pub/Sub broadcast)
                               │         └──► Các API node khác
                               └──► MySQL (lưu lịch sử)
```

### 3.3 Upload file / media
```
Mobile ──HTTPS──► Nginx ──HTTP──► API ──S3 PUT──► MinIO
                                  │
                                  └──► Lưu URL vào MySQL
```

### 3.4 Cuộc gọi video / audio (WebRTC)

> **Lưu ý về Google STUN (`stun:stun.l.google.com:19302`):**
> Google STUN là dịch vụ public miễn phí, không phải hạ tầng của hệ thống. Client dùng nó để **khám phá IP public** của chính nó (gửi 1 gói UDP hỏi đáp) trước khi thiết lập P2P. Nó là ICE server được cấu hình trong `RTCPeerConnection` ở client (`mobile/services/webrtc.ts`), không cần cài đặt server riêng. CoTurn vừa làm STUN (nếu cấu hình) vừa làm TURN relay khi P2P không khả thi.

```
Google STUN ──1 UDP query──► Mobile (trả về public IP:port)
                                   
Mobile ──WSS──► LiveKit (Signaling)
  │                    │
  │             CoTurn (TURN Relay)
  │                    │
  └────────P2P Media (UDP)──────────► Mobile khác
```

### 3.5 Push Notification
```
API ──HTTPS──► FCM ──Push──► Mobile (kể cả khi app đóng)
```

### 3.6 Caching
```
API ──GET──► Redis (cache hit → trả về ngay, TTL: 5–10 phút)
         └──► MySQL (cache miss → truy vấn → lưu Redis)
```

---

## 4. Điểm lưu ý kiến trúc

### 4.1 Single Point of Failure (SPOF)
| Thành phần | Rủi ro | Giải pháp đề xuất |
|---|---|---|
| Nginx | Toàn bộ traffic bị chặn nếu down | Chạy 2 instance + keepalived |
| MySQL | Mất dữ liệu nếu không có replica | MySQL Replica / backup định kỳ |
| Redis | Socket.io mất pub/sub | Redis Sentinel hoặc Cluster |

### 4.2 Security Checklist
- [ ] Nginx là **cổng vào duy nhất** từ Internet — không expose port nội bộ ra ngoài
- [ ] JWT token có TTL hợp lý, lưu refresh token trong Redis
- [ ] MinIO không public bucket — tất cả file trả qua signed URL
- [ ] `MYSQL_ROOT_PASSWORD`, `MINIO_ROOT_PASSWORD`, `FCM_SERVER_KEY` lưu trong `.env`, **không commit lên Git**
- [ ] CoTurn giới hạn relay IP, tránh bị dùng làm proxy

### 4.3 Tại sao CoTurn ở "Public Layer" dù chạy trong Docker?

CoTurn được vẽ ở **TURN LAYER (Public)** bên ngoài Internal Network vì:

- **Expose trực tiếp ra Internet** — Client mobile kết nối tới CoTurn qua UDP port 3478 (và dải port relay `20000-20100/udp`), **không qua Nginx**. Các service khác (API, MySQL, Redis) chỉ giao tiếp nội bộ và qua Nginx ra ngoài.
- Dù map port kiểu Docker thông thường (`ports: - "3478:3478"`) và nằm trong `chat-network`, nhưng bản chất TURN là endpoint public mà client UDP trực tiếp, khác với REST API đi qua Nginx.

Cấu hình thực tế trong `server/docker-compose.yml`:
```yaml
coturn:
  image: coturn/coturn:latest
  ports:
    - "3478:3478"           # STUN + TURN UDP
    - "3478:3478/udp"
    - "5349:5349"           # TLS
    - "5349:5349/udp"
    - "20000-20100:20000-20100/udp"   # Dải port relay media
  command: >
    -n --log-file=stdout
    --external-ip=${TURN_EXTERNAL_IP}
    --listening-port=3478
    --min-port=20000 --max-port=20100
    --user=${TURN_USERNAME}:${TURN_PASSWORD}
    --lt-cred-mech
  env_file: .env
  networks: [chat-network]
```
Biến môi trường lấy từ `server/.env`:
- `TURN_EXTERNAL_IP=192.168.0.19`, `TURN_USERNAME=chatuser`, `TURN_PASSWORD=chatpass`

Client mobile dùng thông tin này trong `mobile/.env`:
- `EXPO_PUBLIC_TURN_HOST=192.168.0.19`, `TURN_USERNAME`, `TURN_PASSWORD`

**So sánh với Google STUN:**
Google STUN (`stun:stun.l.google.com:19302`) là dịch vụ ngoài hoàn toàn, không có Docker, không có deploy — chỉ là URL được cấu hình trong client code (`mobile/services/webrtc.ts`). Nó trả lời 1 UDP query giúp client biết IP public, không relay media.

---

## 5. Docker‑Compose (đầy đủ)

```yaml
version: "3.9"

services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/ssl/certs:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on: [api]

  api:
    image: ghcr.io/yourorg/chat-app-api:latest
    expose:
      - "3000"           # Chỉ expose nội bộ, không bind ra host
    environment:
      - DATABASE_URL=mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/chatdb
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=http://minio:9000
      - MINIO_ACCESS_KEY=${MINIO_ROOT_USER}
      - MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD}
      - LIVEKIT_URL=ws://livekit:7880
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
      - FCM_SERVER_KEY=${FCM_SERVER_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on: [mysql, redis, minio, livekit]

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=chatdb
    volumes:
      - mysql_data:/var/lib/mysql
    expose:
      - "3306"

  redis:
    image: redis:6-alpine
    expose:
      - "6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    expose:
      - "9000"

  livekit:
    image: livekit/livekit-server
    environment:
      - LIVEKIT_KEYS=${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}
    expose:
      - "7880"

  coturn:
    image: coturn/coturn
    network_mode: host        # Cần host network để TURN hoạt động đúng
    command: >
      turnserver -n
      --log-file=stdout
      --listening-port=3478
      --relay-ip=0.0.0.0
      --min-port=49152
      --max-port=65535

volumes:
  mysql_data:
  minio_data:
```

---

## 6. Biến môi trường (.env mẫu)

```env
# MySQL
MYSQL_ROOT_PASSWORD=your_strong_password

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password

# LiveKit
LIVEKIT_API_KEY=livekitkey
LIVEKIT_API_SECRET=your_livekit_secret

# FCM
FCM_SERVER_KEY=your_fcm_server_key

# JWT
JWT_SECRET=your_jwt_secret_key
```

> ⚠️ **Không bao giờ commit file `.env` lên Git.** Thêm `.env` vào `.gitignore`.

---

*Tài liệu được thiết kế để dễ import vào draw.io, Lucidchart hoặc hiển thị trực tiếp trên GitHub/GitLab Markdown.*
*Nếu cần bổ sung: cấu hình TLS chi tiết cho Nginx, Prisma schema, hoặc CI/CD pipeline — vui lòng cho biết.*