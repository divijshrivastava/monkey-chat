# Chat Application Architecture

## System Overview

The chat application is built using a microservices-inspired architecture with the following main components:

### Components

1. **Frontend (React SPA)**
   - Single Page Application
   - Real-time updates via WebSocket
   - RESTful API consumption

2. **Backend (Node.js/Express)**
   - RESTful API server
   - WebSocket server (Socket.io)
   - Authentication and authorization
   - File upload handling

3. **Database (PostgreSQL)**
   - Persistent data storage
   - ACID compliance
   - Relational data modeling

4. **Cache/Session Store (Redis)**
   - User sessions
   - Online presence tracking
   - Socket.io adapter for clustering
   - Conversation caching

## Data Flow

### Message Sending Flow
```
┌─────────┐      1. Type message       ┌─────────────┐
│ Client  │─────────────────────────▶│  React UI   │
└─────────┘                           └─────────────┘
                                             │ 2. Submit
                                             ▼
                                      ┌─────────────┐
                                      │  Socket.io  │
                                      │   Client    │
                                      └─────────────┘
                                             │ 3. Emit event
                                             ▼
                                      ┌─────────────┐
                                      │  Socket.io  │
                                      │   Server    │
                                      └─────────────┘
                                             │ 4. Save to DB
                                             ▼
                                      ┌─────────────┐
                                      │ PostgreSQL  │
                                      └─────────────┘
                                             │
                                             ▼
                                      5. Broadcast to room
                                             │
                   ┌─────────────────────────┴────────────────────┐
                   ▼                                              ▼
            ┌─────────────┐                               ┌─────────────┐
            │  Client 1   │                               │  Client 2   │
            │  (Sender)   │                               │ (Recipient) │
            └─────────────┘                               └─────────────┘
```

### Authentication Flow
```
┌─────────┐    1. Login request    ┌─────────────┐
│ Client  │───────────────────────▶│   Express   │
└─────────┘                         │    API      │
                                    └─────────────┘
                                          │ 2. Verify credentials
                                          ▼
                                    ┌─────────────┐
                                    │ PostgreSQL  │
                                    └─────────────┘
                                          │ 3. Return user
                                          ▼
                                    ┌─────────────┐
                                    │ Generate    │
                                    │    JWT      │
                                    └─────────────┘
                                          │ 4. Store session
                                          ▼
                                    ┌─────────────┐
                                    │    Redis    │
                                    └─────────────┘
                                          │ 5. Return token
                                          ▼
┌─────────┐                         ┌─────────────┐
│ Client  │◀────────────────────────│   Express   │
│ (Store  │     JWT + User Data     │    API      │
│  Token) │                         └─────────────┘
└─────────┘
```

## Scalability Architecture

### Single Instance (Development)
```
┌─────────┐
│ Client  │─────▶ Backend ─────▶ PostgreSQL
└─────────┘          │
                     └─────────▶ Redis
```

### Multi-Instance with Load Balancer (Production)
```
                                    ┌─────────────┐
                                    │ PostgreSQL  │
                                    │  (Primary)  │
                                    └─────────────┘
                                          ▲
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
             ┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
┌─────────┐  │  Backend 1  │      │  Backend 2  │      │  Backend 3  │
│ Client  │  └─────────────┘      └─────────────┘      └─────────────┘
│    │    │         │                     │                     │
│    ▼    │         └─────────────────────┼─────────────────────┘
│  Nginx  │                               │
│   LB    │                               ▼
└────┬────┘                         ┌─────────────┐
     │                              │    Redis    │
     │                              │  (Pub/Sub)  │
     │                              └─────────────┘
     │                                     │
     └─────────────────────────────────────┘
```

### Read Replica Pattern
```
                    Write Queries
┌─────────┐              │              ┌─────────────┐
│ Backend │──────────────┴─────────────▶│ PostgreSQL  │
│         │                              │  (Primary)  │
│         │                              └─────────────┘
│         │                                     │
│         │                                     │ Replication
│         │                                     ▼
│         │         Read Queries         ┌─────────────┐
│         │──────────────────────────────│ PostgreSQL  │
└─────────┘                              │  (Replica)  │
                                         └─────────────┘
```

## WebSocket Architecture

### Room-Based Broadcasting
```
Backend Instance
├── Socket.io Server
│   ├── Namespace: /
│   │   ├── Room: conversation:1
│   │   │   ├── Socket: user_123
│   │   │   └── Socket: user_456
│   │   ├── Room: conversation:2
│   │   │   ├── Socket: user_123
│   │   │   └── Socket: user_789
│   │   └── Global Events
│   │       ├── user:online
│   │       └── user:offline
```

### Multi-Instance Synchronization
```
Backend 1                     Redis Pub/Sub                   Backend 2
    │                              │                              │
    │  1. User sends message       │                              │
    │──────────────────────────────┼──────────────────────────────│
    │                              │                              │
    │  2. Publish to Redis         │                              │
    │─────────────────────────────▶│                              │
    │                              │  3. Broadcast to subscribers │
    │                              │─────────────────────────────▶│
    │                              │                              │
    │  4. Emit to local clients    │      5. Emit to remote clients
    │──────────────────────────────┼──────────────────────────────│
```

## Security Layers

### 1. Network Layer
- HTTPS/TLS encryption
- WSS (WebSocket Secure)
- CORS restrictions
- Rate limiting

### 2. Application Layer
- JWT authentication
- Password hashing (bcrypt)
- Input validation
- SQL injection prevention (parameterized queries)

### 3. Data Layer
- Encrypted connections to database
- Redis authentication
- Environment variables for secrets

## Database Design

### Entity Relationship
```
Users ──┐
        │
        ├──< Conversation_Participants >──┐
        │                                  │
        │                                  ├── Conversations
        │                                  │
        ├──< Messages >────────────────────┘
        │       │
        │       ├──< Read_Receipts
        │       └──< Delivery_Receipts
        │
        └──< (sender_id in Messages)
```

### Indexes for Performance
- `messages.conversation_id` + `created_at` (DESC)
- `messages.sender_id`
- `read_receipts.message_id`
- `users.username`
- `users.email`

## Caching Strategy

### Redis Cache Layers

1. **Session Cache**
   - Key: `session:{userId}`
   - TTL: 7 days
   - Data: socketId, userId, connectedAt

2. **Online Users**
   - Key: `online_users` (Set)
   - No TTL
   - Data: Set of user IDs

3. **Conversation Cache**
   - Key: `conversation:{conversationId}`
   - TTL: 1 hour
   - Data: Full conversation object

## Performance Optimizations

### Backend
1. **Connection Pooling**: PostgreSQL max 20 connections
2. **Compression**: gzip middleware for responses
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Clustering**: Node.js cluster module for multi-core utilization

### Frontend
1. **Code Splitting**: React lazy loading
2. **Asset Optimization**: Image compression
3. **Caching**: Browser caching headers
4. **CDN**: Static asset delivery

### Database
1. **Indexes**: On frequently queried columns
2. **Query Optimization**: Use EXPLAIN ANALYZE
3. **Connection Pooling**: Reuse connections
4. **Prepared Statements**: Prevent SQL injection and improve performance

## Monitoring & Observability

### Metrics to Track
- WebSocket connections (current/peak)
- Messages per second
- API response times (p50, p95, p99)
- Error rates
- Database query performance
- Redis memory usage
- CPU and memory per instance

### Logging Strategy
- Structured logging (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation
- User action tracking

## Disaster Recovery

### Backup Strategy
1. **Database**: Daily automated backups, 30-day retention
2. **Redis**: RDB snapshots + AOF persistence
3. **Uploaded Files**: S3 with versioning

### High Availability
1. **Load Balancer**: Health checks with automatic failover
2. **Database**: Primary-replica with automatic failover
3. **Redis**: Redis Sentinel or Redis Cluster
4. **Multi-AZ Deployment**: Distribute across availability zones

## Future Enhancements

### Phase 1: Scalability
- [ ] Kubernetes deployment
- [ ] Auto-scaling based on metrics
- [ ] Database sharding by user_id

### Phase 2: Features
- [ ] End-to-end encryption
- [ ] Voice/video calling (WebRTC)
- [ ] Group chat support
- [ ] Message search (Elasticsearch)

### Phase 3: Mobile
- [ ] React Native apps
- [ ] Push notifications (FCM/APNS)
- [ ] Offline message queue
