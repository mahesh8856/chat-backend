import express from "express";
import http from "http";
import cors from "cors";
import "dotenv/config";
import { connectDB } from "./lib/db.js";
import userRouter from "./Routes/userRoutes.js";
import messageRouter from "./Routes/messageRoutes.js";
import { Server } from "socket.io";

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// ✅ Allow multiple frontend origins
const allowedOrigins = [
  "https://chat-app-psi-nine-96.vercel.app",
  "https://chat-pbfi0o9ja-maheshs-projects-563ecfbf.vercel.app"
];

// ✅ CORS for HTTP requests
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: "4mb" }));

// ✅ Initialize Socket.IO with CORS
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// ✅ Track multiple sockets per user
export const userSocketMap = {}; // userId => [socketId1, socketId2, ...]

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("🔌 User connected:", userId);

  if (userId) {
    if (!userSocketMap[userId]) {
      userSocketMap[userId] = [];
    }
    userSocketMap[userId].push(socket.id);
  }

  io.emit("online-users", Object.keys(userSocketMap));

  socket.on("send-message", ({ to, text, image }) => {
    const from = socket.handshake.query.userId;

    const receiverSockets = userSocketMap[to];
    const senderSockets = userSocketMap[from];

    const messagePayload = {
      senderId: from,
      receiverId: to,
      text,
      image,
      _id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    if (receiverSockets) {
      receiverSockets.forEach((id) => {
        io.to(id).emit("receive-message", messagePayload);
      });
    }

    if (senderSockets) {
      senderSockets.forEach((id) => {
        io.to(id).emit("receive-message", messagePayload);
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", userId);

    if (userId && userSocketMap[userId]) {
      userSocketMap[userId] = userSocketMap[userId].filter(
        (id) => id !== socket.id
      );
      if (userSocketMap[userId].length === 0) {
        delete userSocketMap[userId];
      }
    }

    io.emit("online-users", Object.keys(userSocketMap));
  });
});

// ✅ Routes
app.get("/", (req, res) => {
  res.send("✅ API is running...");
});
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// ✅ Start server after DB connection
const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
};

startServer();

// ✅ Export for Vercel compatibility
export default server;
