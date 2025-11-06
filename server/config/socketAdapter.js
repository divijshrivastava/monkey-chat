const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
require('dotenv').config();

async function setupSocketAdapter(io) {
  // Support both REDIS_URL (production) and individual host/port/password (development)
  const redisConfig = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
        },
        password: process.env.REDIS_PASSWORD || undefined,
      };

  const pubClient = createClient(redisConfig);
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));

  console.log('✓ Socket.io Redis adapter configured for clustering');

  return { pubClient, subClient };
}

module.exports = setupSocketAdapter;
