// This file tracks which users are currently online
// We use a simple Map (like a dictionary) in memory
// In Sprint 4 we upgrade this to Redis

const onlineUsers = new Map();
// Structure: { userId: socketId }

const addOnlineUser = (userId, socketId) => {
  onlineUsers.set(userId.toString(), socketId);
};

const removeOnlineUser = (userId) => {
  onlineUsers.delete(userId.toString());
};

const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

module.exports = {
  addOnlineUser,
  removeOnlineUser,
  getOnlineUsers,
  isUserOnline,
};