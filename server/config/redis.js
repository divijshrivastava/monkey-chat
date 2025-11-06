const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('connect', () => {
  console.log('✓ Redis connected successfully');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

// Connect to Redis
redisClient.connect().catch(console.error);

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
