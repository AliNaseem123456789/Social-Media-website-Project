import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Stack,
  Grid,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import { chatService, socket } from "../services/chatService";
import ChatSidebar from "../components/ChatSidebar";

function ChatPage() {
  const { user1, user2 } = useParams();
  const currentUserId = localStorage.getItem("user_id");
  const currentUsername = localStorage.getItem("username");

  const toUserId = String(user1) === String(currentUserId) ? user2 : user1;

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const messagesEndRef = useRef(null);

  // Match this exactly to your actual Navbar height
  const NAVBAR_HEIGHT = "64px";

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

        setRecipient(userInfo);
        setChat(
          history.map((msg) => ({
            from:
              String(msg.from_user) === String(currentUserId)
                ? "Me"
                : userInfo.username,
            text: msg.message,
          })),
        );
      } catch (err) {
        console.error(err);
      }
    };

    initializeChat();
    socket.on("private_message", (data) => {
      if (
        String(data.from) === String(toUserId) ||
        String(data.from) === String(currentUserId)
      ) {
        setChat((prev) => [
          ...prev,
          {
            from:
              String(data.from) === String(currentUserId)
                ? "Me"
                : data.username,
            text: data.message,
          },
        ]);
      }
    });
    return () => socket.off("private_message");
  }, [currentUserId, toUserId]);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("private_message", {
      from: currentUserId,
      username: currentUsername,
      to: toUserId,
      message,
    });
    setChat((prev) => [...prev, { from: "Me", text: message }]);
    setMessage("");
  };

  return (
    <Box
      sx={{
        bgcolor: "#f0f2f5",
        height: `calc(100vh - ${NAVBAR_HEIGHT})`,
        width: "100vw",
        display: "flex",
        overflow: "hidden",
        position: "fixed",
        bottom: 0,
        left: 0,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: 0,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <Grid container sx={{ height: "100%", flexWrap: "nowrap" }}>
          {/* SIDEBAR: Kept slightly narrower to give Chat more room */}
          <Grid
            item
            sx={{
              width: { sm: "280px", md: "320px" },
              flexShrink: 0, // Prevents sidebar from shrinking
              borderRight: "1px solid #e0e0e0",
              display: { xs: "none", sm: "block" },
              height: "100%",
              bgcolor: "#fff",
            }}
          >
            <ChatSidebar />
          </Grid>

          {/* CHAT AREA: Forced to fill all available width */}
          <Grid
            item
            xs
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              bgcolor: "#efeae2",
              flexGrow: 1, // Ensures it takes every available pixel
              minWidth: 0, // Critical for preventing grid blowout
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: "10px 24px",
                bgcolor: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                zIndex: 1,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={recipient?.profile_image}
                  sx={{ width: 40, height: 40 }}
                >
                  {recipient?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, lineHeight: 1.2 }}
                  >
                    {recipient?.username || "Loading..."}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="success.main"
                    sx={{ fontWeight: 700 }}
                  >
                    Online
                  </Typography>
                </Box>
              </Stack>
              <IconButton size="small">
                <MoreVertRoundedIcon />
              </IconButton>
            </Box>

            {/* Messages Area - The wider container is here */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                px: { xs: 6, md: 8, lg: 10 }, // Increased horizontal padding for layout
                py: 3,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              {/* Optional: Add a max-width wrapper inside to keep messages readable on ultrawide */}
              <Box
                sx={{
                  width: {
                    xs: "170px",
                    sm: "170px",
                    md: "400px",
                    lg: "600px",
                  },
                  maxWidth: "1200px",
                  margin: "0 auto",
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
                        mb: 0.5,
                      }}
                    >
                      <Paper
                        elevation={1}
                        sx={{
                          p: "8px 16px",
                          borderRadius: isMe
                            ? "12px 0px 12px 12px"
                            : "0px 12px 12px 12px",
                          maxWidth: "85%", // Increased from 75%
                          minWidth: "60px",
                          bgcolor: isMe ? "#d9fdd3" : "#fff",
                          color: "#111b21",
                          boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                          wordBreak: "break-word",
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ fontSize: "0.95rem" }}
                        >
                          {msg.text}
                        </Typography>
                      </Paper>
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Box>
            </Box>

            {/* Input Area */}
            <Box sx={{ p: "12px 24px", bgcolor: "#f0f2f5" }}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ maxWidth: "1200px", margin: "0 auto" }} // Matches the message area width
              >
                <Box
                  sx={{
                    flexGrow: 1,
                    bgcolor: "#fff",
                    borderRadius: "10px",
                    px: 2.5,
                  }}
                >
                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Type a message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    InputProps={{ disableUnderline: true, sx: { py: 1.5 } }}
                  />
                </Box>
                <IconButton
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  sx={{
                    bgcolor: message.trim() ? "#00a884" : "transparent",
                    color: message.trim() ? "#fff" : "#54656f",
                    "&:hover": {
                      bgcolor: message.trim() ? "#008f6f" : "transparent",
                    },
                    p: 1.5,
                  }}
                >
                  <SendRoundedIcon />
                </IconButton>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default ChatPage;
