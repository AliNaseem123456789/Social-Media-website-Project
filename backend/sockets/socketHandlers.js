import supabase from "../supabaseClient.js";
const users = {};
export const handleConnection = (io, socket) => {
  console.log(" New client connected:", socket.id);
  socket.on("register", (userId) => {
    if (!userId) return;
    users[userId] = socket.id;
    console.log(`User ${userId} registered`);
  });

  socket.on("private_message", async ({ from, username, to, message }) => {
    if (!from || !to || !message || !username) return;

    try {
      await supabase
        .from("messages")
        .insert([{ from_user: from, to_user: to, username, message }]);

      const targetSocket = users[to];
      if (targetSocket) {
        io.to(targetSocket).emit("private_message", {
          from,
          username,
          message,
        });
      }
      socket.emit("private_message", { from, username, message });
    } catch (err) {
      console.error("Failed to save message:", err.message);
    }
  });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
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

  socket.on("video_call_request", ({ from, to, roomId }) => {
    const targetSocket = users[to];
    if (targetSocket) {
      io.to(targetSocket).emit("video_call_request", { from, roomId });
    }
  });
  socket.on("video_call_rejected", ({ to, roomId }) => {
    const targetSocket = users[to];
    if (targetSocket) {
      io.to(targetSocket).emit("video_call_rejected", { roomId });
    }
  });

  socket.on("disconnect", () => {
    for (let id in users) {
      if (users[id] === socket.id) delete users[id];
    }
    console.log("Client disconnected:", socket.id);
  });
};
