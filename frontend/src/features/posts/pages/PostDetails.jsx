import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import { postService } from "../services/postService";
import PostCard from "../components/PostCard"; // Use your beautiful shared component
import {
  Typography,
  Avatar,
  Box,
  TextField,
  Button,
  Stack,
  Container,
  Paper,
  Divider,
  Fade,
  CircularProgress,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

function PostDetails() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const userId = localStorage.getItem("user_id");
  const isLoggedIn = !!userId;

  useEffect(() => {
    const loadPost = async () => {
      try {
        const data = await postService.getFullPost(id);
        setPost(data);
      } catch (error) {
        console.error("Error loading full post:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadPost();
  }, [id]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !isLoggedIn) return;
    setPosting(true);
    try {
      const result = await postService.addComment({
        post_id: id,
        comment_text: newComment,
        user_id: Number(userId),
      });
      setPost((prev) => ({
        ...prev,
        comments: [result.comment, ...(prev.comments || [])], // Newest first
      }));
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setPosting(false);
    }
  };

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );

  if (!post)
    return (
      <Typography variant="h6" sx={{ textAlign: "center", mt: 10 }}>
        Post not found
      </Typography>
    );

  return (
    <Box
      sx={{ backgroundColor: "#f8f9fa", display: "flex", minHeight: "100vh" }}
    >
      <Sidebar />

      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Fade in={true} timeout={800}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                mb: 3,
                fontWeight: 800,
                color: "#1a1a1b",
                letterSpacing: "-0.5px",
              }}
            >
              Discussion
            </Typography>

            {/* Reuse the Beautiful PostCard */}
            <PostCard post={post} onLike={() => {}} />

            {/* Modern Comment Section */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: "24px",
                p: 3,
                bgcolor: "white",
                border: "1px solid #f0f0f0",
                boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 700 }}>
                Comments ({post.comments?.length || 0})
              </Typography>

              {/* Input Area */}
              <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: "#6366f1" }}>
                  {localStorage.getItem("username")?.charAt(0).toUpperCase() ||
                    "U"}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    variant="standard"
                    placeholder={
                      isLoggedIn
                        ? "Write a thoughtful comment..."
                        : "Please login to join the chat"
                    }
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={!isLoggedIn || posting}
                    InputProps={{
                      disableUnderline: true,
                      sx: { fontSize: "0.95rem" },
                    }}
                    sx={{
                      bgcolor: "#f9fafb",
                      p: 2,
                      borderRadius: "16px",
                      mb: 1.5,
                    }}
                  />
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      onClick={handleAddComment}
                      disabled={!isLoggedIn || posting || !newComment.trim()}
                      endIcon={
                        posting ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <SendRoundedIcon />
                        )
                      }
                      sx={{
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 700,
                        px: 3,
                        boxShadow: "none",
                      }}
                    >
                      Send
                    </Button>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 3, opacity: 0.6 }} />

              {/* Comments List */}
              <Stack spacing={3}>
                {post.comments?.length > 0 ? (
                  post.comments.map((c) => (
                    <Box key={c.comment_id} sx={{ display: "flex", gap: 2 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          bgcolor: "#e0e7ff",
                          color: "#4338ca",
                        }}
                      >
                        {c.username?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            bgcolor: "#f3f4f6",
                            p: 2,
                            borderRadius: "0 16px 16px 16px",
                            display: "inline-block",
                            minWidth: "150px",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 800, mb: 0.5 }}
                          >
                            {c.username}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "#4b5563", lineHeight: 1.5 }}
                          >
                            {c.comment_text}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            mt: 0.5,
                            ml: 1,
                            color: "text.disabled",
                            fontWeight: 600,
                          }}
                        >
                          {new Date(c.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontStyle: "italic" }}
                    >
                      Be the first to start the conversation!
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}

export default PostDetails;
