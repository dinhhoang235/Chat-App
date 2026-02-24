# Chat App Backend

Node.js + Express + Prisma + MySQL + Redis

## Prerequisites

- Node.js >= 20
- MySQL 8.0
- Redis 7.0
- Docker & Docker Compose (optional)

## Installation

```bash
npm install
```

## Environment Setup

Copy `.env.example` to `.env` và update values:

```bash
cp .env.example .env
```

Hoặc edit `.env` trực tiếp:

```env
PORT=3000
NODE_ENV=development

# MySQL
MYSQL_HOST=localhost
MYSQL_ROOT_PASSWORD=admin123
MYSQL_DATABASE=chat_app
MYSQL_USER=chatuser
MYSQL_PASSWORD=admin123
MYSQL_PORT=3306

# Prisma Database URL
DATABASE_URL="mysql://chatuser:admin123@localhost:3306/chat_app"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Database Setup

### Option 1: Với Docker

```bash
# Start MySQL & Redis containers
docker-compose up -d

# Run migrations
npx prisma migrate dev --name init

# View database GUI
npx prisma studio
```

### Option 2: Local MySQL

Đảm bảo MySQL running locally, rồi:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# View database
npx prisma studio
```

## Development

### Start development server

```bash
npm run dev
```

Server sẽ chạy trên `http://localhost:3000`

## Useful Commands

### Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name <migration_name>

# Create migration without running
npx prisma migrate dev --create-only --name <migration_name>

# Reset database (deletes all data!)
npx prisma migrate reset

# View database GUI
npx prisma studio

# View migration status
npx prisma migrate status

# Format schema
npx prisma format
```

### Development Commands

```bash
# Start dev server with hot reload
npm run dev

# Start production server
npm start

# Generate & migrate in one command
npx prisma migrate dev
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild containers
docker-compose up -d --build
```

## API Endpoints

### Users

- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
  ```json
  { "email": "user@example.com", "name": "John" }
  ```

### Chats

- `GET /api/chats` - Get all chats with participants & messages
- `GET /api/chats/:id/messages` - Get messages from a chat

### Health Check

- `GET /health` - Check database connection

## Database Schema

### User
- `id` (Int, PK)
- `email` (String, unique)
- `name` (String?)
- `avatar` (String?)
- `bio` (String?)
- `createdAt`, `updatedAt`

### Chat
- `id` (Int, PK)
- `title` (String?)
- `description` (String?)
- `isGroup` (Boolean)
- `createdAt`, `updatedAt`

### Message
- `id` (Int, PK)
- `content` (LongText)
- `attachments` (String - JSON?)
- `senderId` (Int, FK)
- `chatId` (Int, FK)
- `createdAt`, `updatedAt`

## Troubleshooting

### Database connection error

```bash
# Check DATABASE_URL in .env
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin < /dev/null
```

### Prisma migrations conflict

```bash
# Reset & restart
npx prisma migrate reset
```

### Port already in use

```bash
# Change PORT in .env or kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Docker MySQL issues

```bash
# Check container logs
docker-compose logs mysql

# Restart MySQL
docker-compose restart mysql

# Remove volume and restart
docker-compose down -v
docker-compose up -d
```

## Project Structure

```
server/
├── src/
│   ├── index.js          # Express server
│   └── db.js             # Prisma client
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Migration files
├── .env                  # Environment variables
├── .env.example          # Example env
├── docker-compose.yml    # Docker services
├── Dockerfile            # App container
└── package.json          # Dependencies
```

## Next Steps

1. Create routes in `src/routes/`
2. Create controllers in `src/controllers/`
3. Add authentication (JWT)
4. Implement Socket.io for real-time chat
5. Add input validation
6. Add error handling middleware

## Notes

- Prisma Client is auto-generated, don't edit `node_modules/.prisma`
- Migrations should be committed to git
- Always run `npx prisma generate` after schema changes
- Use `prisma studio` to visualize and edit data

## References

- [Prisma Docs](https://www.prisma.io/docs/)
- [Express Docs](https://expressjs.com/)
- [Docker Docs](https://docs.docker.com/)
