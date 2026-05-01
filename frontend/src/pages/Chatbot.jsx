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
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
import ForumIcon from "@mui/icons-material/Forum";
import MemoryIcon from "@mui/icons-material/Memory";
import FavoriteIcon from "@mui/icons-material/Favorite";
import PostAddIcon from "@mui/icons-material/PostAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import { postService } from "../features/posts/services/postService";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true); // Start closed
  const chatEndRef = useRef(null);

  // Welcome message on first open
  const [hasWelcomed, setHasWelcomed] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show welcome message when chat is opened for the first time
  useEffect(() => {
    if (isOpen && !hasWelcomed) {
      setHasWelcomed(true);
      setMessages([
        {
          text: "Hi there! I'm your AI Assistant. I can help you with:",
          sender: "ai",
          features: true,
        },
      ]);
    }
  }, [isOpen, hasWelcomed]);

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
      alert("✅ Post created successfully! 🎉");
      setMessages((prev) => [
        ...prev,
        { text: "✅ Post published successfully!", sender: "system" },
      ]);
    } catch (err) {
      alert("❌ Failed to create post.");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        "https://social-media-website-assistant.onrender.com/api/chat",
        // "http://localhost:8000/api/chat",
        {
          message: input,
          user_id: userId,
        },
      );

      setMessages((prev) => [
        ...prev,
        {
          text: res.data.response,
          sender: "ai",
          suggestion: res.data.post_suggestion,
          intent: res.data.intent,
          action: res.data.action_taken,
        },
      ]);
    } catch (err) {
      console.error("Chat Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          text: " Sorry, I'm having trouble connecting. Please try again later.",
          sender: "ai",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const FeatureList = () => (
    <Box sx={{ mt: 1, width: "100%" }}>
      <Chip
        icon={<MemoryIcon />}
        label="Remember your preferences"
        size="small"
        sx={{ m: 0.5 }}
        variant="outlined"
      />
      <Chip
        icon={<PostAddIcon />}
        label="Suggest posts"
        size="small"
        sx={{ m: 0.5 }}
        variant="outlined"
      />
      <Chip
        icon={<FavoriteIcon />}
        label="Give advice"
        size="small"
        sx={{ m: 0.5 }}
        variant="outlined"
      />
      <Chip
        icon={<DeleteIcon />}
        label="Delete memories"
        size="small"
        sx={{ m: 0.5 }}
        variant="outlined"
      />
      <Typography
        variant="caption"
        display="block"
        sx={{ mt: 1, color: "text.secondary" }}
      >
        Try: "My name is John", "I love pizza", or "Help me write a post"
      </Typography>
    </Box>
  );

  return (
    <>
      <Zoom in={!isOpen}>
        <Fab
          color="primary"
          aria-label="chat"
          onClick={() => setIsOpen(true)}
          sx={{
            position: "fixed",
            bottom: 30,
            right: 30,
            zIndex: 10000,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            background: "linear-gradient(45deg, #1877f2, #4c9aff)",
          }}
        >
          <ForumIcon />
        </Fab>
      </Zoom>
      <Zoom in={isOpen}>
        <Paper
          elevation={10}
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: { xs: "90vw", sm: 380 },
            height: 550,
            display: "flex",
            flexDirection: "column",
            borderRadius: 4,
            overflow: "hidden",
            zIndex: 10000,
            boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          }}
        >
          <Box
            sx={{
              p: 2,
              background: "linear-gradient(45deg, #1877f2, #4c9aff)",
              color: "white",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <SmartToyIcon />
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    AI Assistant
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Powered by Groq
                  </Typography>
                </Box>
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
                        ? "#1877f2"
                        : msg.sender === "system"
                          ? "#4caf50"
                          : "white",
                    color: msg.sender === "user" ? "white" : "black",
                    p: 1.5,
                    borderRadius: 2,
                    maxWidth: "85%",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography
                    variant="body2"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {msg.text}
                  </Typography>
                  {msg.action && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mt: 0.5, opacity: 0.7 }}
                    >
                      {msg.action}
                    </Typography>
                  )}
                </Box>
                {msg.features && <FeatureList />}
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
                      startIcon={<PostAddIcon />}
                    >
                      Post Now
                    </Button>
                  </Paper>
                )}
              </ListItem>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <ListItem sx={{ justifyContent: "flex-start", px: 0 }}>
                <Box
                  sx={{
                    bgcolor: "white",
                    p: 1.5,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    AI is thinking...
                  </Typography>
                </Box>
              </ListItem>
            )}
            <div ref={chatEndRef} />
          </List>
          <Box sx={{ p: 2, borderTop: "1px solid #ddd", bgcolor: "white" }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything... "
                onKeyPress={(e) =>
                  e.key === "Enter" && !loading && handleSend()
                }
                disabled={loading}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
              <IconButton
                onClick={handleSend}
                color="primary"
                disabled={loading || !input.trim()}
                sx={{
                  bgcolor: loading || !input.trim() ? "transparent" : "#1877f2",
                  color: "white",
                  "&:hover": { bgcolor: "#1565c0" },
                }}
              >
                <SendIcon />
              </IconButton>
            </Stack>

            {/* Quick action suggestions */}
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}
            >
              <Chip
                label="What can you do?"
                size="small"
                variant="outlined"
                onClick={() => {
                  setInput("What can you help me with?");
                  handleSend();
                }}
                sx={{ fontSize: "0.7rem" }}
              />
              <Chip
                label="Remember my name"
                size="small"
                variant="outlined"
                onClick={() => {
                  setInput("My name is [your name]");
                  handleSend();
                }}
                sx={{ fontSize: "0.7rem" }}
              />
              <Chip
                label="Help me write a post"
                size="small"
                variant="outlined"
                onClick={() => {
                  setInput("Help me write a post about my achievements");
                  handleSend();
                }}
                sx={{ fontSize: "0.7rem" }}
              />
            </Stack>
          </Box>
        </Paper>
      </Zoom>
    </>
  );
};

export default Chatbot;
