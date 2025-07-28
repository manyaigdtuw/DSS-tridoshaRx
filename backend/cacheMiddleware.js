import { getCache, setCache, getRedisClient } from './redis.js';

// Generic caching middleware with better error handling
export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query parameters
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cachedData = await getCache(key);
      
      if (cachedData) {
        console.log('Cache hit for:', key);
        
        // ADD THIS VALIDATION
        if (!Array.isArray(cachedData) && req.originalUrl.includes('/api/search')) {
          console.error('Cache data is not an array for search endpoint:', typeof cachedData);
          // If cached data is corrupted, proceed without cache
          return next();
        }
        
        return res.json(cachedData);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // ADD VALIDATION BEFORE CACHING
        if (data && (Array.isArray(data) || typeof data === 'object')) {
          setCache(key, data, duration).catch(err => {
            console.error('Cache write error:', err);
          });
        } else {
          console.warn('Skipping cache for invalid data type:', typeof data);
        }
        
        console.log('Cache miss for:', key);
        return originalJson.call(this, data);
      };
      
      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      next();
    }
  };
};

// Rate limiting middleware
export const rateLimitMiddleware = (maxRequests = 100, windowMs = 60000) => {
  return async (req, res, next) => {
    const client = getRedisClient();
    if (!client) return next();

    const ip = req.ip || req.connection.remoteAddress;
    const key = `rate_limit:${ip}`;

    try {
      const current = await client.incr(key);
      
      if (current === 1) {
        await client.expire(key, Math.ceil(windowMs / 1000));
      }
      
      if (current > maxRequests) {
        return res.status(429).json({ 
          error: 'Too many requests, please try again later' 
        });
      }
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - current),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs)
      });
      
      next();
    } catch (err) {
      console.error('Rate limiting error:', err);
      next();
    }
  };
};
