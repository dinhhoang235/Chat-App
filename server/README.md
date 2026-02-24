# Ứng Dụng Chat Backend

Node.js + Express + Prisma + MySQL + Redis

## Yêu Cầu

- Node.js >= 20
- Docker & Docker Compose

## Cài Đặt Nhanh

```bash
npm install
```

## Chạy Ứng Dụng

```bash
# Bắt đầu Docker (MySQL + Redis)
docker compose up -d

# Đồng bộ database
docker compose exec app npx prisma db push

# Bắt đầu server
npm run dev
```

Server chạy trên `http://localhost:3000`

## Lệnh Quan Trọng

```bash
# Docker
docker compose up -d          # Bắt đầu dịch vụ
docker compose down           # Dừng dịch vụ
docker compose ps             # Kiểm tra trạng thái
docker compose logs -f        # Xem logs

# Database
npx prisma db push            # Đồng bộ schema
npx prisma studio             # Xem & chỉnh sửa data

# Server
npm run dev                   # Phát triển
npm start                     # Sản xuất
npm run build                 # Build
```

## API Endpoints

- `POST /api/users/login` - Đăng nhập: `{ phone, password }`
- `POST /api/users/signup` - Đăng ký: `{ phone, fullName, password }`
- `GET /api/users` - Danh sách users
- `GET /api/users/:id` - Lấy user
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user

## Cài Đặt .env

```env
PORT=3000
MYSQL_USER=chatuser
MYSQL_PASSWORD=admin123
MYSQL_DATABASE=chat_app
MYSQL_PORT=3306
MYSQL_ROOT_PASSWORD=admin123
```

## Connect MySQL

```bash
docker compose exec mysql mysql -u chatuser -p'admin123' -D chat_app
SELECT * FROM users;
```

## Xử Lý Sự Cố

```bash
docker compose logs -f       # Xem logs
docker compose restart       # Restart
docker compose down -v       # Reset (mất dữ liệu)
```
