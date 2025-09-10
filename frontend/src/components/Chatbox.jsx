import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import { Box, Paper, TextField, Button, Typography } from "@mui/material";
import Navbar from "./Navbar";
// Single Socket.IO instance
const socket = io("http://localhost:5000");

function ChatPage() {
  const { user1, user2 } = useParams(); // two params from route
  const currentUserId = localStorage.getItem("user_id"); // logged-in user
  const currentUsername = localStorage.getItem("username");

  // figure out who is the other participant
  const toUserId = user1 === currentUserId ? user2 : user1;

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [recipientName, setRecipientName] = useState("");
  const messagesEndRef = useRef(null);

 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Register user 
  useEffect(() => {
    if (currentUserId) {
      socket.emit("register", currentUserId);
    }

    socket.on("private_message", (data) => {
      const senderName = data.from === currentUserId ? "Me" : data.username;
      setChat((prev) => [...prev, { from: senderName, text: data.message }]);
    });

    return () => socket.off("private_message");
  }, [currentUserId]);

  // Fetch recipient username
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${toUserId}`);
        setRecipientName(res.data.username);
      } catch (err) {
        console.error("Failed to fetch recipient:", err);
      }
    };
    if (toUserId) fetchUser();
  }, [toUserId]);

  // Fetch chat history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/chat/${currentUserId}/${toUserId}`
        );
        const formatted = res.data.map((msg) => ({
          from: msg.from_user === currentUserId ? "Me" : msg.username || recipientName || msg.from_user,
          text: msg.message,
        }));
        setChat(formatted);
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };
    if (currentUserId && toUserId) fetchHistory();
  }, [currentUserId, toUserId, recipientName]);

  // Send message
  const sendMessage = () => {
    if (!message.trim()) return;

    const payload = {
      from: currentUserId,
      username: currentUsername,
      to: toUserId,
      message,
    };

    socket.emit("private_message", payload);
    setChat((prev) => [...prev, { from: "Me", text: message }]);
    setMessage("");
  };

  return (
    <><Navbar/>
    <Box sx={{ maxWidth: 600, margin: "auto", p: 2,mt:8 }}>
      <Typography
        variant="h5"
        sx={{ mb: 2, textAlign: "center", fontWeight: 600 }}>
        Chat with {recipientName || toUserId}
      </Typography>

      <Paper
        elevation={3}
        sx={{
          height: 350,
          overflowY: "auto",
          p: 2,
          mb: 2,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f9f9f9",
        }}
      >
        {chat.map((msg, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              justifyContent: msg.from === "Me" ? "flex-end" : "flex-start",
              mb: 1,
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                borderRadius: 2,
                maxWidth: "70%",
                backgroundColor: msg.from === "Me" ? "#DCF8C6" : "#FFF",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                {msg.from}:
              </Typography>
              <Typography variant="body1">{msg.text}</Typography>
            </Paper>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Paper>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={sendMessage}
          sx={{ px: 3, borderRadius: 2 }}
        >
          Send
        </Button>
      </Box>
    </Box>
    </>
  );
}

export default ChatPage;
