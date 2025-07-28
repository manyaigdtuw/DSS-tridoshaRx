import { createClient } from 'redis';

let redisClient;

const initializeRedisClient = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    redisClient.on('ready', () => {
      console.log('Redis client ready');
    });

    redisClient.on('end', () => {
      console.log('Redis connection ended');
    });

    await redisClient.connect();
    
    // Test the connection
    const pingResult = await redisClient.ping();
    console.log('Redis ping result:', pingResult);
    
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null; // Return null instead of throwing to allow app to continue
  }
};

const getRedisClient = () => {
  if (!redisClient || !redisClient.isOpen) {
    console.warn('Redis client is not connected');
    return null;
  }
  return redisClient;
};

const closeRedisConnection = async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('Redis connection closed');
  }
};

// Cache helper functions
const setCache = async (key, data, ttl = 300) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.setEx(key, ttl, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
};

const getCache = async (key) => {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

const deleteCache = async (pattern) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`Deleted ${keys.length} cache entries matching: ${pattern}`);
    }
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
};

export { 
  initializeRedisClient, 
  getRedisClient, 
  closeRedisConnection,
  setCache,
  getCache,
  deleteCache
};
