# Scalable Chat Application

A production-ready, real-time chat application built with Node.js, React, PostgreSQL, and Redis. Designed to handle millions of concurrent users with horizontal scaling capabilities.

## Features

- **Real-time Messaging**: WebSocket-based instant messaging using Socket.io
- **User Authentication**: Secure JWT-based authentication with session management
- **Message History**: Persistent message storage in PostgreSQL database
- **Read Receipts**: Track message delivery and read status
- **Image Sharing**: Upload and share images with file size limits
- **Online Presence**: Real-time user online/offline status
- **Typing Indicators**: See when other users are typing
- **Scalable Architecture**: Horizontal scaling support with Redis adapter
- **Docker Support**: Easy deployment with Docker and docker-compose
- **Security**: Rate limiting, helmet protection, input validation

## Tech Stack

### Backend
- **Node.js** + **Express**: REST API server
- **Socket.io**: Real-time WebSocket communication
- **PostgreSQL**: Relational database for messages and users
- **Redis**: Session management, caching, and Socket.io adapter
- **JWT**: Token-based authentication
- **Multer**: File upload handling

### Frontend
- **React**: UI library
- **Socket.io-client**: Real-time communication
- **Axios**: HTTP client
- **React Router**: Client-side routing
- **date-fns**: Date formatting

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client 1  │────▶│   Nginx LB  │────▶│  Backend 1  │
└─────────────┘     │             │     └─────────────┘
                    │             │            │
┌─────────────┐     │             │     ┌──────▼──────┐
│   Client 2  │────▶│             │────▶│  Backend 2  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┴────────┐
                    │                                   │
             ┌──────▼──────┐                    ┌──────▼──────┐
             │  PostgreSQL │                    │    Redis    │
             │  (Messages) │                    │  (Sessions) │
             └─────────────┘                    └─────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional)

### Option 1: Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd chat
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Run database migrations:
```bash
docker exec chat-backend node server/database/migrate.js
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Option 2: Manual Setup

1. Install dependencies:
```bash
# Backend
npm install

# Frontend
cd client
npm install
cd ..
```

2. Setup PostgreSQL:
```bash
# Create database
createdb chatapp

# Run migrations
npm run migrate
```

3. Setup Redis:
```bash
# Start Redis (if not running)
redis-server
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
```

5. Start the application:
```bash
# Development mode (runs both backend and frontend)
npm run dev

# Or run separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatapp
DB_USER=postgres
DB_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# CORS Configuration
CLIENT_URL=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Conversations
- `GET /api/conversations` - Get user's conversations
- `POST /api/conversations` - Create or get direct conversation
- `GET /api/conversations/:id/messages` - Get conversation messages

### Users
- `GET /api/users/search?query=...` - Search users

### Upload
- `POST /api/upload` - Upload image file

## WebSocket Events

### Client → Server
- `message:send` - Send a message
- `message:read` - Mark message as read
- `message:delivered` - Mark message as delivered
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator
- `conversation:join` - Join conversation room

### Server → Client
- `message:new` - New message received
- `message:read` - Message read by recipient
- `message:delivered` - Message delivered to recipient
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline

## Scaling to Millions of Users

### Horizontal Scaling

1. **Enable Redis Adapter** (already configured in production mode):
   - Socket.io uses Redis adapter to sync messages across instances
   - All session data stored in Redis

2. **Run Multiple Backend Instances**:

   Using Docker Compose:
   ```bash
   # Uncomment backend-2 and nginx services in docker-compose.yml
   docker-compose up -d --scale backend=3
   ```

   Using Node.js Cluster:
   ```bash
   npm run cluster
   ```

3. **Load Balancer**:
   - Nginx configured for sticky sessions
   - Health checks enabled
   - Least connections algorithm

### Database Optimization

- Indexed columns for faster queries
- Connection pooling (max 20 connections per instance)
- Read replicas for scaling reads
- Partitioning messages table by date

### Performance Tips

1. **CDN**: Serve static assets through CDN
2. **Database**: Use read replicas and connection pooling
3. **Redis**: Consider Redis Cluster for high availability
4. **Caching**: Cache frequently accessed data
5. **Monitoring**: Use tools like PM2, Datadog, or New Relic

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- Helmet.js for HTTP headers security
- CORS configuration
- Input validation and sanitization
- File upload restrictions (type and size)
- SQL injection prevention (parameterized queries)

## Database Schema

### Users Table
- id, username, email, password_hash, avatar_url, status, last_seen

### Conversations Table
- id, type (direct/group), name, created_by

### Messages Table
- id, conversation_id, sender_id, content, message_type, file_url, created_at

### Read Receipts Table
- id, message_id, user_id, read_at

### Delivery Receipts Table
- id, message_id, user_id, delivered_at

## Development

### Project Structure
```
chat/
├── server/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── database/        # Database config and migrations
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── socket/          # Socket.io handlers
│   └── index.js         # Server entry point
├── client/
│   ├── public/          # Static files
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API and socket services
│   │   └── App.js       # Main app component
│   └── package.json
├── docker-compose.yml   # Docker orchestration
├── Dockerfile           # Backend Docker image
└── README.md
```

### Running Tests
```bash
# Backend tests
npm test

# Frontend tests
cd client && npm test
```

## Deployment

### Production Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Update database credentials
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure Redis persistence
- [ ] Set up monitoring and logging
- [ ] Enable rate limiting
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipeline

### Docker Production Deployment

```bash
# Build and start services
docker-compose -f docker-compose.yml up -d --build

# Scale backend instances
docker-compose up -d --scale backend=5

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Monitoring

### Health Check
```bash
curl http://localhost:5000/health
```

### Metrics to Monitor
- Active WebSocket connections
- Message throughput (messages/second)
- Database query performance
- Redis memory usage
- CPU and memory usage per instance
- API response times
- Error rates

## Troubleshooting

### WebSocket Connection Issues
- Check CORS configuration
- Verify JWT token is being sent
- Check firewall/proxy settings
- Enable WebSocket support in nginx

### Database Connection Errors
- Verify PostgreSQL is running
- Check database credentials
- Ensure database exists and migrations ran
- Check connection pool settings

### Redis Connection Errors
- Verify Redis is running
- Check Redis host and port
- Verify password if configured

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Email: support@example.com

## Roadmap

- [ ] Group chat support
- [ ] Voice messages
- [ ] Video calling
- [ ] Message encryption (E2E)
- [ ] Message search
- [ ] File sharing (documents)
- [ ] Push notifications
- [ ] Mobile apps (React Native)
- [ ] Message reactions
- [ ] User profiles
