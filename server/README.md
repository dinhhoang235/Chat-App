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
npx prisma generate           # Tạo lại Prisma Client (sau khi sửa schema)
npx prisma db push
npx prisma migrate dev --name <migration_name>  # Tạo migration (thay <migration_name> bằng tên phù hợp)
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

## Hướng Dẫn Thêm Field Mới Vào Models

**Bước 1: Sửa schema**
```bash
# Mở file prisma/schema.prisma và thêm field mới
# Ví dụ: thêm field "role" vào User model
```

**Bước 2: Tạo migration**
```bash
npx prisma migrate dev --name <tên_migration>
# Ví dụ: npx prisma migrate dev --name add_role_to_user
```

**Bước 3: Chọn khi được hỏi**
- "Do you want to generate Prisma Client?" → Y

**Nếu bị lỗi:**

**Lỗi: Shadow database không được phép**
```bash
docker compose exec mysql mysql -u root -p'admin123' -e "GRANT ALL PRIVILEGES ON *.* TO 'chatuser'@'%'; FLUSH PRIVILEGES;"
```

**Lỗi: Drift detected (schema không sync)**
```bash
npx prisma migrate reset    # Reset database (mất dữ liệu)
# hoặc
npx prisma db push          # Push schema trực tiếp (không reset)
```

**Kiểm tra status migration**
```bash
npx prisma migrate status   # Xem trạng thái
npx prisma studio          # Xem data trong bảng
```

**Tóm tắt nhanh:**
```bash
# Sửa schema.prisma → chạy:
npx prisma migrate dev --name <tên>
```
