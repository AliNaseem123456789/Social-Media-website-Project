import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  List,
  ListItem,
  Button,
  Stack,
  Zoom,
  Fab,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
import ForumIcon from "@mui/icons-material/Forum";
import axios from "axios";
import { postService } from "../features/posts/services/postService";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true); // Default open
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const userId = localStorage.getItem("user_id");

  const handleCreatePost = async (content) => {
    if (!userId) {
      alert("Please log in to post!");
      return;
    }
    try {
      await postService.createPost({
        user_id: userId,
        content: content,
        image_url: null,
      });
      alert("Post created successfully! 🎉");
      setMessages((prev) => [
        ...prev,
        { text: "Post published!", sender: "system" },
      ]);
    } catch (err) {
      alert("Failed to create post.");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/api/chat", {
        message: input,
        user_id: userId,
      });
      setMessages((prev) => [
        ...prev,
        {
          text: res.data.response,
          sender: "ai",
          suggestion: res.data.post_suggestion,
        },
      ]);
    } catch (err) {
      console.error("Chat Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. FLOATING ACTION BUTTON (Shown when chat is closed) */}
      <Zoom in={!isOpen}>
        <Fab
          color="primary"
          aria-label="chat"
          onClick={() => setIsOpen(true)}
          sx={{
            position: "fixed",
            bottom: 30,
            right: 30,
            zIndex: 10000, // Higher than Navbars/Footers
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <ForumIcon />
        </Fab>
      </Zoom>

      {/* 2. CHAT WINDOW */}
      <Zoom in={isOpen}>
        <Paper
          elevation={10}
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: { xs: "90vw", sm: 350 },
            height: 500,
            display: "flex",
            flexDirection: "column",
            borderRadius: 4,
            overflow: "hidden",
            zIndex: 10000,
          }}
        >
          {/* Header */}
          <Box sx={{ p: 2, bgcolor: "primary.main", color: "white" }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <SmartToyIcon />
                <Typography variant="subtitle1" fontWeight="bold">
                  AI Assistant
                </Typography>
              </Stack>
              <IconButton
                size="small"
                onClick={() => setIsOpen(false)}
                sx={{ color: "white" }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </Box>

          {/* Body */}
          <List
            sx={{ flexGrow: 1, overflow: "auto", p: 2, bgcolor: "#f5f5f5" }}
          >
            {messages.map((msg, i) => (
              <ListItem
                key={i}
                sx={{
                  flexDirection: "column",
                  alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                  mb: 1,
                  px: 0,
                }}
              >
                <Box
                  sx={{
                    bgcolor:
                      msg.sender === "user"
                        ? "primary.main"
                        : msg.sender === "system"
                          ? "#c8e6c9"
                          : "white",
                    color: msg.sender === "user" ? "white" : "black",
                    p: 1.5,
                    borderRadius: 2,
                    maxWidth: "85%",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography variant="body2">{msg.text}</Typography>
                </Box>
                {msg.suggestion && (
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 1,
                      p: 1.5,
                      bgcolor: "white",
                      width: "100%",
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="primary"
                      fontWeight="bold"
                    >
                      AI Suggestion:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontStyle: "italic", my: 1 }}
                    >
                      "{msg.suggestion}"
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      fullWidth
                      onClick={() => handleCreatePost(msg.suggestion)}
                    >
                      Post Now
                    </Button>
                  </Paper>
                )}
              </ListItem>
            ))}
            <div ref={chatEndRef} />
          </List>

          {/* Footer Input */}
          <Box sx={{ p: 2, borderTop: "1px solid #ddd", bgcolor: "white" }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Talk to AI..."
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
              />
              <IconButton
                onClick={handleSend}
                color="primary"
                disabled={loading || !input.trim()}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </Box>
        </Paper>
      </Zoom>
    </>
  );
};

export default Chatbot;
