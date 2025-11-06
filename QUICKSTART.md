# Quick Start Guide

Get your chat app running in 5 minutes!

## Option 1: Docker (Easiest) 🐳

### Prerequisites
- Docker and Docker Compose installed

### Steps
```bash
# 1. Start all services
docker-compose up -d

# 2. Run database migrations
docker exec chat-backend npm run migrate

# 3. Open your browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

That's it! 🎉

## Option 2: Local Development 💻

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Steps

```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..

# 2. Start PostgreSQL (if not running)
# macOS:
brew services start postgresql

# Ubuntu/Debian:
sudo systemctl start postgresql

# Windows: Start PostgreSQL from Services

# 3. Start Redis (if not running)
# macOS:
brew services start redis

# Ubuntu/Debian:
sudo systemctl start redis-server

# Windows: Start Redis from Services or WSL

# 4. Create database
createdb chatapp

# 5. Run migrations
npm run migrate

# 6. Start the application
npm run dev
```

Open http://localhost:3000 in your browser! 🚀

## First Use

1. **Register an account**
   - Go to http://localhost:3000
   - Click "Register"
   - Create your account

2. **Create a conversation**
   - Click the ➕ button
   - Search for a user
   - Start chatting!

3. **Test with multiple users**
   - Open http://localhost:3000 in an incognito window
   - Register another account
   - Chat between the two accounts

## Testing Features

### Real-time Messaging
1. Open two browser windows with different accounts
2. Send a message from one window
3. Watch it appear instantly in the other! ⚡

### Read Receipts
1. Send a message
2. Watch for the checkmark (✓)
3. It becomes double checkmark (✓✓) when delivered
4. Changes color when read

### Image Sharing
1. Click the 📎 button in the message input
2. Select an image (max 5MB)
3. Image uploads and displays in the chat

### Online Status
1. Login from one account
2. Check another user's status
3. Watch it change to "Online" in real-time

## Common Commands

```bash
# Development
npm run dev          # Start both backend and frontend
npm run server       # Start backend only
npm run client       # Start frontend only

# Production
npm run build        # Build frontend for production
npm start            # Start backend in production mode
npm run cluster      # Start with Node.js clustering

# Database
npm run migrate      # Run database migrations

# Docker
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose logs -f backend    # View backend logs
docker-compose restart backend    # Restart backend
```

## Troubleshooting

### Port already in use
```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Database connection error
```bash
# Check if PostgreSQL is running
psql -h localhost -U postgres -c "SELECT 1"

# Recreate database
dropdb chatapp
createdb chatapp
npm run migrate
```

### Redis connection error
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Restart Redis
# macOS:
brew services restart redis

# Linux:
sudo systemctl restart redis-server
```

### Frontend not loading
```bash
# Clear node_modules and reinstall
cd client
rm -rf node_modules package-lock.json
npm install
cd ..
npm run client
```

## What's Next?

- Read [README.md](README.md) for detailed documentation
- Check [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment

## Default Accounts (for testing)

If you ran seed data (not included by default), you can use:
- No default accounts - create your own!

## Performance Tips

### For Development
- Use Chrome DevTools Network tab to monitor WebSocket connections
- Check Redux DevTools for state management (if added)
- Use React Developer Tools for component debugging

### For Testing at Scale
```bash
# Start with clustering (utilizes all CPU cores)
npm run cluster

# Or with Docker and multiple instances
docker-compose up -d --scale backend=3
```

## Need Help?

- 📖 Read the [full documentation](README.md)
- 🐛 [Report issues](https://github.com/yourrepo/issues)
- 💬 Join our community chat

Happy chatting! 💬✨
