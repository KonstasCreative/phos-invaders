// server.js (ES module)

import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// Polyfill __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Init Express + HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // game page joins
  socket.on("join-game", (sessionId) => {
    socket.join(sessionId);
    console.log(`→ [Game] ${socket.id} joined ${sessionId}`);
  });

  // controller page joins
  socket.on("join-controller", (sessionId) => {
    socket.join(sessionId);
    console.log(`→ [Controller] ${socket.id} joined ${sessionId}`);

    // only now do we notify the game
    io.to(sessionId).emit("controller-connected");
  });

  // controller sends inputs
  socket.on("control", ({ sessionId, type, action }) => {
    socket.to(sessionId).emit("control", { type, action });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Start listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server up: http://localhost:${PORT}`);
});
