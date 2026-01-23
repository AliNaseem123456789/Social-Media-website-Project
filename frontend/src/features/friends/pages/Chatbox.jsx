import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Avatar,
} from "@mui/material";
import { chatService, socket } from "../services/chatService";
function ChatPage() {
  const { user1, user2 } = useParams();
  const currentUserId = localStorage.getItem("user_id");
  const currentUsername = localStorage.getItem("username");
  const toUserId = user1 === currentUserId ? user2 : user1;
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [recipientName, setRecipientName] = useState("");
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [chat]);
  useEffect(() => {
    if (!currentUserId || !toUserId) return;
    chatService.registerUser(currentUserId);
    const initializeChat = async () => {
      try {
        const [userInfo, history] = await Promise.all([
          chatService.getRecipientInfo(toUserId),
          chatService.getChatHistory(currentUserId, toUserId),
        ]);
        setRecipientName(userInfo.username);
        const formatted = history.map((msg) => ({
          from:
            msg.from_user === currentUserId
              ? "Me"
              : msg.username || userInfo.username,
          text: msg.message,
        }));
        setChat(formatted);
      } catch (err) {
        console.error("Chat initialization failed:", err);
      }
    };
    initializeChat();
    socket.on("private_message", (data) => {
      if (data.from === toUserId || data.from === currentUserId) {
        const senderName = data.from === currentUserId ? "Me" : data.username;
        setChat((prev) => [...prev, { from: senderName, text: data.message }]);
      }
    });
    return () => socket.off("private_message");
  }, [currentUserId, toUserId]);
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
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: 600, margin: "auto", p: 2, pt: 10 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 1,
            display: "flex",
            alignItems: "center",
            gap: 2,
            borderRadius: "15px 15px 0 0",
          }}
        >
          <Avatar sx={{ bgcolor: "#1976d2" }}>
            {recipientName?.charAt(0)}
          </Avatar>
          <Typography variant="h6" fontWeight="600">
            {recipientName || "Loading..."}
          </Typography>
        </Paper>
        <Paper
          elevation={2}
          sx={{
            height: "60vh",
            overflowY: "auto",
            p: 3,
            mb: 2,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#e5ddd5",
            borderRadius: "0 0 15px 15px",
          }}
        >
          {chat.map((msg, i) => {
            const isMe = msg.from === "Me";
            return (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  mb: 1.5,
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    px: 2,
                    borderRadius: isMe
                      ? "18px 18px 0px 18px"
                      : "18px 18px 18px 0px",
                    maxWidth: "75%",
                    backgroundColor: isMe ? "#dcf8c6" : "#fff",
                    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                  }}
                >
                  <Typography variant="body1">{msg.text}</Typography>
                </Paper>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Paper>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            bgcolor: "#fff",
            p: 1,
            borderRadius: "25px",
            boxShadow: 1,
          }}
        >
          <TextField
            fullWidth
            variant="standard"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            InputProps={{ disableUnderline: true, sx: { px: 2, py: 1 } }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            sx={{
              borderRadius: "50%",
              minWidth: "48px",
              width: "48px",
              height: "48px",
            }}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default ChatPage;
