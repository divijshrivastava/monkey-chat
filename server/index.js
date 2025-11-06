const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const { socketAuthMiddleware } = require('./middleware/auth');
const SocketHandler = require('./socket/socketHandler');
const setupSocketAdapter = require('./config/socketAdapter');
const { pool } = require('./database/db');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Socket.io setup with clustering support
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Setup Redis adapter for horizontal scaling (only in production)
if (process.env.NODE_ENV === 'production') {
  setupSocketAdapter(io).catch(console.error);
}

// Trust proxy (required for Render and other reverse proxies)
app.set('trust proxy', true);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io authentication
io.use(socketAuthMiddleware);

// Socket.io connection handling
const socketHandler = new SocketHandler(io);
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Run database migrations on startup
async function runMigrations() {
  try {
    console.log('Checking database schema...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Run migration (CREATE TABLE IF NOT EXISTS ensures idempotency)
    await pool.query(schema);
    console.log('✓ Database schema verified');
  } catch (error) {
    console.error('Database migration error:', error.message);
    // Don't exit - allow server to start even if migration fails
    // This prevents blocking if tables already exist
  }
}

const PORT = process.env.PORT || 5000;

// Start server after migrations
async function startServer() {
  await runMigrations();
  
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Chat Server Running Successfully     ║
╠════════════════════════════════════════╣
║   Port: ${PORT.toString().padEnd(30)} ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(23)} ║
║   Time: ${new Date().toLocaleTimeString().padEnd(30)} ║
╚════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
