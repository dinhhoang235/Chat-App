import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'chatuser',
  password: process.env.DATABASE_PASSWORD || 'admin123',
  database: process.env.DATABASE_NAME || 'chat_app',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
});

const prisma = new PrismaClient({
  adapter: adapter as any,
} as any);

export default prisma;
