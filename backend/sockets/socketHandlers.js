// sockets/socketHandlers.js - COMPLETE REPLACEMENT

import supabase from "../supabaseClient.js";
import EmailPublisher from "../services/EmailPublisher.js";

const users = {}; // userId -> socketId

export const handleConnection = (io, socket) => {
  // ✅ Get user from socket (set by middleware)
  const userId = socket.userId;
  const username = socket.username;
  
  console.log(`✅ User ${userId} (${username}) connected: ${socket.id}`);
  
  // ✅ Auto-register (no event needed from client)
  if (userId) {
    users[userId] = socket.id;
  }

  // ✅ Register event (kept for backward compatibility, but does nothing)
  socket.on("register", () => {
    if (userId) {
      users[userId] = socket.id;
      console.log(`User ${userId} registered`);
    }
  });
  // ✅ Auto-join notification room using userId from session
if (userId) {
  users[userId] = socket.id;
  socket.join(`user_${userId}`);  // ← ADD THIS LINE
  console.log(`User ${userId} joined notification room: user_${userId}`);
}

// ✅ Also handle explicit join_room from frontend
socket.on("join_room", ({ userId: roomUserId }) => {
  const room = `user_${roomUserId}`;
  socket.join(room);
  console.log(`User ${userId} joined room: ${room}`);
});
  // ✅ PRIVATE MESSAGE - CHANGED: 'from' comes from session, not client
  socket.on("private_message", async ({ to, message }) => {
    // 'from' is from session, NOT from client!
    const from = userId;
    const fromUsername = username;
    
    if (!from || !to || !message) return;

    try {
      // Save to database
      await supabase
        .from("messages")
        .insert([{ from_user: from, to_user: to, username: fromUsername, message }]);

      // Send to recipient if online
      const targetSocket = users[to];
      if (targetSocket) {
        io.to(targetSocket).emit("private_message", {
          from,
          username: fromUsername,
          message,
        });
      } else {
        // Send email notification
        const { data: recipient } = await supabase
          .from("users")
          .select("email, username")
          .eq("id", to)
          .single();
        
        if (recipient) {
          EmailPublisher.sendNewMessageEmail({
            to: recipient.email,
            recipientName: recipient.username,
            senderName: fromUsername,
            messagePreview: message.substring(0, 150),
            conversationLink: `${process.env.APP_URL}/chat/${from}_${to}`
          }).catch(err => console.error('Failed to queue email:', err.message));
        }
      }
      
      // Echo to sender
      socket.emit("private_message", { from, username: fromUsername, message });
      
    } catch (err) {
      console.error("Failed to save message:", err.message);
    }
  });

  // Video call - userId from session
  socket.on("video_call_request", ({ to, roomId }) => {
    const targetSocket = users[to];
    if (targetSocket) {
      io.to(targetSocket).emit("video_call_request", { from: userId, roomId });
    }
  });

  socket.on("video_call_rejected", ({ to, roomId }) => {
    const targetSocket = users[to];
    if (targetSocket) {
      io.to(targetSocket).emit("video_call_rejected", { roomId });
    }
  });

  // WebRTC signaling (unchanged)
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room: ${roomId}`);
  });

  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (userId && users[userId] === socket.id) {
      delete users[userId];
    }
    console.log(`User ${userId} disconnected: ${socket.id}`);
  });
};