import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import prisma from './db.js';
import userRoutes from './routes/users.js';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Routes
app.use('/api/users', userRoutes);

// Start server
app.listen(PORT, async () => {
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
