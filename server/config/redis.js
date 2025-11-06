const redis = require('redis');
require('dotenv').config();

// Support both REDIS_URL (production) and individual host/port/password (development)
const redisConfig = process.env.REDIS_URL
  ? {
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.log('Redis max retries reached');
            return new Error('Redis max retries reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    }
  : {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.log('Redis max retries reached');
            return new Error('Redis max retries reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
      password: process.env.REDIS_PASSWORD || undefined,
    };

const redisClient = redis.createClient(redisConfig);

redisClient.on('connect', () => {
  console.log('✓ Redis connected successfully');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err.message);
});

redisClient.on('reconnecting', () => {
  console.log('Redis reconnecting...');
});

// Connect to Redis with error handling
redisClient.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err.message);
});

// Session management helpers
const sessionHelpers = {
  // Store user session
  async setSession(userId, socketId, data = {}) {
    const sessionData = {
      socketId,
      userId,
      connectedAt: new Date().toISOString(),
      ...data,
    };
    await redisClient.set(`session:${userId}`, JSON.stringify(sessionData), {
      EX: 7 * 24 * 60 * 60, // 7 days
    });
    await redisClient.set(`socket:${socketId}`, userId.toString(), {
      EX: 7 * 24 * 60 * 60,
    });
  },

  // Get user session
  async getSession(userId) {
    const data = await redisClient.get(`session:${userId}`);
    return data ? JSON.parse(data) : null;
  },

  // Delete user session
  async deleteSession(userId, socketId) {
    await redisClient.del(`session:${userId}`);
    if (socketId) {
      await redisClient.del(`socket:${socketId}`);
    }
  },

  // Get userId by socketId
  async getUserBySocket(socketId) {
    return await redisClient.get(`socket:${socketId}`);
  },

  // Store online users (for presence)
  async setUserOnline(userId) {
    await redisClient.sAdd('online_users', userId.toString());
  },

  async setUserOffline(userId) {
    await redisClient.sRem('online_users', userId.toString());
  },

  async getOnlineUsers() {
    return await redisClient.sMembers('online_users');
  },

  // Cache conversation data
  async cacheConversation(conversationId, data, expirySeconds = 3600) {
    await redisClient.set(
      `conversation:${conversationId}`,
      JSON.stringify(data),
      { EX: expirySeconds }
    );
  },

  async getCachedConversation(conversationId) {
    const data = await redisClient.get(`conversation:${conversationId}`);
    return data ? JSON.parse(data) : null;
  },
};

module.exports = { redisClient, sessionHelpers };
