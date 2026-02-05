import React, { useState, useEffect } from "react";
import {
  Typography,
  Stack,
  Skeleton,
  Box,
  Container,
  IconButton,
  Tooltip,
  Fade,
  Alert,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { postService } from "../services/postService";
import PostCard from "../components/PostCard";
import Sidebar from "../../../components/Sidebar";

function Feed() {
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem("user_id");
  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await postService.getFeed(userId);
      setPosts(data);
      setMessage("");
    } catch (err) {
      setMessage("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setMessage("You must be logged in to view the feed");
      setLoading(false);
      return;
    }
    loadFeed();
  }, [userId]);

  // Inside Feed.jsx
  const handleLike = async (postId, e) => {
    e.preventDefault();
    if (!userId) return;
    try {
      const res = await postService.likePost(userId, postId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            // Use p.post_id because that's what GraphQL provides
            p.post_id === postId || p.id === postId
              ? { ...p, total_likes: res.total_likes }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error("Error liking post", err);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        bgcolor: "#f4f7fe", // Softer, premium blue-grey background
        minHeight: "100vh",
      }}
    >
      <Sidebar />

      <Container maxWidth="sm" sx={{ py: 6 }}>
        {/* Header Section */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                color: "#1a1a1b",
                letterSpacing: "-1px",
              }}
            >
              Feed
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              See what your friends are sharing
            </Typography>
          </Box>

          <Tooltip title="Refresh Feed">
            <IconButton
              onClick={loadFeed}
              sx={{
                bgcolor: "white",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                "&:hover": { bgcolor: "#f0f0f0" },
              }}
            >
              <RefreshRoundedIcon color="primary" />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Error/Message Handling */}
        {message && (
          <Fade in={!!message}>
            <Alert
              severity="info"
              sx={{ mb: 4, borderRadius: "16px", fontWeight: 600 }}
            >
              {message}
            </Alert>
          </Fade>
        )}

        {/* Posts Area */}
        <Stack spacing={1}>
          {loading
            ? // Improved Skeletons to match PostCard height
              Array.from(new Array(3)).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    mb: 4,
                    p: 3,
                    bgcolor: "white",
                    borderRadius: "24px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Skeleton variant="circular" width={50} height={50} />
                    <Box sx={{ width: "40%" }}>
                      <Skeleton
                        width="100%"
                        height={20}
                        sx={{ borderRadius: "4px" }}
                      />
                      <Skeleton
                        width="60%"
                        height={15}
                        sx={{ borderRadius: "4px" }}
                      />
                    </Box>
                  </Stack>
                  <Skeleton
                    variant="rectangular"
                    height={250}
                    sx={{ borderRadius: "16px", mb: 2 }}
                  />
                  <Skeleton width="90%" height={20} />
                  <Skeleton width="40%" height={20} />
                </Box>
              ))
            : posts.map((post, index) => (
                <Fade in={true} timeout={400 + index * 100} key={post.id}>
                  <Box>
                    <PostCard post={post} onLike={handleLike} />
                  </Box>
                </Fade>
              ))}

          {!loading && posts.length === 0 && !message && (
            <Box sx={{ textAlign: "center", py: 10 }}>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                Your feed is empty
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Follow some people to see their posts here!
              </Typography>
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

export default Feed;
