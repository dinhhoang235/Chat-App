import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import prisma from './db.js';
import userRoutes from './routes/users.js';
import { chatRoutes } from './routes/chats.js';
import { setupSocket } from './socket.js';
import { connectRedis } from './utils/redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 3000;

// Setup Socket.io
setupSocket(io);

// Connect Redis (Caching only)
connectRedis().catch(err => console.error('Redis startup failed:', err));

// Middleware
app.use(cors());

// JSON/URL parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve media files
app.use('/media', express.static(path.join(__dirname, '../media')));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok',
      database: 'connected'
    });
  } catch (err) {
    console.error('✗ Database error:', err);
    res.status(500).json({ 
      status: 'error',
      message: 'Database connection failed'
    });
  }
});

// Routes (multer applied per route)
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes(io));

// Start server
httpServer.listen(PORT, async () => {
  try {
    // Test database connection once on startup
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connected');
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error('✗ Failed to connect to database:', err);
    process.exit(1);
  }
});
