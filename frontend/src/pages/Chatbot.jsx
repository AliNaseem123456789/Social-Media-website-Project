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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
import ForumIcon from "@mui/icons-material/Forum";
import MemoryIcon from "@mui/icons-material/Memory";
import FavoriteIcon from "@mui/icons-material/Favorite";
import PostAddIcon from "@mui/icons-material/PostAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import ChatIcon from "@mui/icons-material/Chat";
import CelebrationIcon from "@mui/icons-material/Celebration";
import axios from "axios";
import { postService } from "../features/posts/services/postService";

const API_CONFIG = {
  dev: "http://localhost:8000",
  prod: "https://social-media-website-assistant-production.up.railway.app",
  environment: "prod",
};
const getApiUrl = () => {
  return API_CONFIG[API_CONFIG.environment];
};
const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const chatEndRef = useRef(null);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Listen for navigation changes
  useEffect(() => {
    const handlePathChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePathChange);
    
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        setCurrentPath(window.location.pathname);
      }
    });
    
    observer.observe(document.getElementById('root') || document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      window.removeEventListener('popstate', handlePathChange);
      observer.disconnect();
    };
  }, [currentPath]);
  
  const userId = localStorage.getItem("user_id");
  const path = window.location.pathname;
  const isAuthPage = path === "/" || path === "/login" || path === "/signup";
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
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

  if (!userId || isAuthPage) {
    return null;
  }

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
      alert("Post created successfully!");
      setMessages((prev) => [
        ...prev,
        { text: "Post published successfully!", sender: "system" },
      ]);
    } catch (err) {
      alert("❌ Failed to create post.");
    }
  };

  const handleSendFriendRequest = async (friendId, allIds = null) => {
    if (!userId) {
      alert("Please log in to send friend requests!");
      return;
    }
    
    const friendIds = allIds || [friendId];
    
    try {
      const res = await apiClient.post("/api/chat", {
        message: `send_to_all_${JSON.stringify(friendIds)}`,
        user_id: userId,
      });
      
      alert(res.data.response || "Friend request sent!");
      
      setMessages((prev) => [
        ...prev,
        { text: res.data.response, sender: "system" },
      ]);
      
    } catch (err) {
      console.error("Error sending friend request:", err);
      alert("❌ Failed to send friend request.");
    }
  };

  const handleLike = async (postId) => {
    if (!userId) {
      alert("Please log in to like posts!");
      return;
    }
    
    try {
      const res = await apiClient.post("/api/chat", {
        message: `like_post_${postId}`,
        user_id: userId,
      });
      
      alert(res.data.response || "Post liked!");
      
    } catch (err) {
      console.error("Error liking post:", err);
      alert("❌ Failed to like post.");
    }
  };

  const handleOpenCommentDialog = (post) => {
    setSelectedPost(post);
    setCommentText("");
    setCommentDialogOpen(true);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      alert("Please enter a comment!");
      return;
    }
    
    try {
      const res = await apiClient.post("/api/chat", {
        message: `comment_post_${selectedPost.post_id}_${commentText}`,
        user_id: userId,
      });
      
      alert(res.data.response || "Comment added!");
      setCommentDialogOpen(false);
      setCommentText("");
      
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("❌ Failed to add comment.");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiClient.post("/api/chat", {
        message: input,
        user_id: userId,
      });

      setMessages((prev) => [
        ...prev,
        {
          text: res.data.response,
          sender: "ai",
          suggestion: res.data.post_suggestion,
          friendSuggestions: res.data.friend_suggestions,
          engagementSuggestions: res.data.engagement_suggestions,
          birthdaySuggestions: res.data.birthday_suggestions,
          inactiveFriends: res.data.inactive_friends,
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
      <Chip
        icon={<PersonAddIcon />}
        label="Suggest friends"
        size="small"
        sx={{ m: 0.5 }}
        variant="outlined"
      />
      <Chip
        icon={<ChatIcon />}
        label="Engage with posts"
        size="small"
        sx={{ m: 0.5 }}
        variant="outlined"
      />
      <Typography
        variant="caption"
        display="block"
        sx={{ mt: 1, color: "text.secondary" }}
      >
        Try: "Suggest friends", "Help me write a post", or "What should I like?"
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
                
                {/* Post Suggestion Button */}
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
                      📝 AI Suggestion:
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
                
                {/* Engagement Suggestions */}
                {msg.engagementSuggestions && msg.engagementSuggestions.length > 0 && (
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
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <FavoriteIcon fontSize="small" />
                      💬 Posts to Engage With:
                    </Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    {msg.engagementSuggestions.map((post, idx) => (
                      <Box key={post.post_id} sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {post.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          "{post.content}"
                        </Typography>
                        <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                          💡 {post.reason}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleLike(post.post_id)}
                            startIcon={<FavoriteIcon />}
                          >
                            Like ({post.total_likes || 0})
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenCommentDialog(post)}
                            startIcon={<ChatIcon />}
                          >
                            Comment
                          </Button>
                        </Stack>
                        {idx < msg.engagementSuggestions.length - 1 && <Divider sx={{ mt: 1 }} />}
                      </Box>
                    ))}
                  </Paper>
                )}
                
                {/* Birthday Suggestions */}
                {msg.birthdaySuggestions && msg.birthdaySuggestions.length > 0 && (
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 1,
                      p: 1.5,
                      bgcolor: "#fff3e0",
                      width: "100%",
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="warning.main"
                      fontWeight="bold"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <CelebrationIcon fontSize="small" />
                      🎂 Upcoming Birthdays:
                    </Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    {msg.birthdaySuggestions.map((birthday, idx) => (
                      <Box key={birthday.friend_id}>
                        <Typography variant="body2">
                          <strong>{birthday.username}</strong> - 
                          {birthday.days_until === 0 ? " TODAY! 🎉" : ` in ${birthday.days_until} days (${birthday.birth_date})`}
                        </Typography>
                        {idx < msg.birthdaySuggestions.length - 1 && <Divider sx={{ mt: 1 }} />}
                      </Box>
                    ))}
                  </Paper>
                )}
                
                {/* Friend Suggestions */}
                {msg.friendSuggestions && msg.friendSuggestions.length > 0 && (
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
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <PersonAddIcon fontSize="small" />
                      👥 Friend Suggestions:
                    </Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    {msg.friendSuggestions.map((friend, idx) => (
                      <Box key={friend.id} sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {friend.username}
                            </Typography>
                            {friend.match_reason && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                💡 {friend.match_reason}
                              </Typography>
                            )}
                            {friend.location && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                📍 {friend.location}
                              </Typography>
                            )}
                            {friend.hobbies && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                🎨 {friend.hobbies.length > 50 ? friend.hobbies.substring(0, 50) + '...' : friend.hobbies}
                              </Typography>
                            )}
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSendFriendRequest(friend.id)}
                            startIcon={<PersonAddIcon />}
                            sx={{ ml: 1, minWidth: 100 }}
                          >
                            Add Friend
                          </Button>
                        </Stack>
                        {idx < msg.friendSuggestions.length - 1 && <Divider sx={{ mt: 1 }} />}
                      </Box>
                    ))}
                    
                    {msg.friendSuggestions.length > 1 && (
                      <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        sx={{ mt: 1 }}
                        onClick={() => handleSendFriendRequest(null, msg.friendSuggestions.map(f => f.id))}
                        startIcon={<GroupAddIcon />}
                      >
                        Send Requests to All ({msg.friendSuggestions.length})
                      </Button>
                    )}
                  </Paper>
                )}
              </ListItem>
            ))}
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
                label="Suggest friends"
                size="small"
                variant="outlined"
                onClick={() => {
                  setInput("Suggest friends who like hiking");
                  handleSend();
                }}
                sx={{ fontSize: "0.7rem" }}
              />
              <Chip
                label="What should I like?"
                size="small"
                variant="outlined"
                onClick={() => {
                  setInput("What should I like?");
                  handleSend();
                }}
                sx={{ fontSize: "0.7rem" }}
              />
              <Chip
                label="Upcoming birthdays"
                size="small"
                variant="outlined"
                onClick={() => {
                  setInput("Any birthdays coming up?");
                  handleSend();
                }}
                sx={{ fontSize: "0.7rem" }}
              />
            </Stack>
          </Box>
        </Paper>
      </Zoom>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onClose={() => setCommentDialogOpen(false)}>
        <DialogTitle>Add a Comment</DialogTitle>
        <DialogContent>
          <MuiTextField
            autoFocus
            margin="dense"
            label="Your comment"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write something nice..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitComment} variant="contained" color="primary">
            Post Comment
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Chatbot;