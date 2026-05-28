# MERN Real-Time Chat Application

A full-featured real-time chat application built with the MERN stack,
Socket.io, Redis, and AI integration.

## 🔴 Live Demo
Backend API: https://mern-chat-backend.onrender.com

## ✨ Features
- 🔐 JWT Authentication (Register, Login, Protected Routes)
- ⚡ Real-time messaging with Socket.io
- 🏢 Workspaces and Channels (like Slack)
- 📎 File and Image Upload (Cloudinary CDN)
- 😊 Emoji Reactions with toggle
- 💬 Threaded Replies
- 👤 Direct Messages (DMs)
- ✏️ Edit and Delete messages
- 🔍 Full-text Message Search
- 📨 Workspace Invite System
- 🤖 AI Thread Summarizer (Groq Llama 3.3)
- 📹 WebRTC Video Call Signaling
- ⚡ Redis Presence Tracking (Upstash)
- 🛡️ Admin Panel

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite (Sprint 7) |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas + Mongoose |
| Real-time | Socket.io |
| Cache/Presence | Redis (Upstash) |
| File Storage | Cloudinary |
| AI | Groq API (Llama 3.3 70B) |
| Video Calls | WebRTC + Socket.io Signaling |
| Auth | JWT + bcrypt |
| Deployment | Render.com |

## 📡 API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET  /api/auth/me
- POST /api/channels
- GET  /api/messages/:channelId
- POST /api/upload
- POST /api/ai/summarize
- GET  /api/search?q=keyword
- POST /api/workspaces
- GET  /api/calls/history

🚀 Local Setup
    bash
git clone https://github.com/mynameissagar/mern-chat-app
cd mern-chat-app/server
npm install
cp .env.example .env   # fill in your credentials
npm run dev


## 🌍 Environment Variables
See .env.example for all required variables.

## 👨‍💻 Developer
Sagar — Full Stack Developer
GitHub: github.com/mynameissagar