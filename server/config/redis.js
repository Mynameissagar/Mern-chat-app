const { Redis } = require("@upstash/redis");

// Connect to Upstash Redis using credentials from .env
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Helper functions for presence tracking ─────────────

// Mark user as online — stores userId with expiry
// EX: 300 = expires in 300 seconds (5 minutes)
// Socket will refresh this on each ping
const setUserOnline = async (userId) => {
  await redis.set(`online:${userId}`, "1", { ex: 300 });
};

// Mark user as offline — remove from Redis
const setUserOffline = async (userId) => {
  await redis.del(`online:${userId}`);
};

// Check if specific user is online
const isUserOnline = async (userId) => {
  const result = await redis.get(`online:${userId}`);
  return result === "1";
};

// Get count of online users (for dashboard/stats)
const getOnlineCount = async () => {
  const keys = await redis.keys("online:*");
  return keys.length;
};

module.exports = {
  redis,
  setUserOnline,
  setUserOffline,
  isUserOnline,
  getOnlineCount,
};