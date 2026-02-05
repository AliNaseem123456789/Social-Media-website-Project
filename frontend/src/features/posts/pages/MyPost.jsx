import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../../../components/Sidebar";
import { postService } from "../services/postService";
import PostCard from "../components/PostCard";
import { Typography, Box, Stack, Skeleton, Container } from "@mui/material";

function MyPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem("user_id");

  // 1. Memoize the function using useCallback
  const fetchMyPosts = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const data = await postService.getUserPosts(userId);
      setPosts(data);
    } catch (error) {
      console.error("Error fetching my posts:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]); // Only recreate this function if userId changes

  // 2. Safely call the memoized function in useEffect
  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]); // ESLint is now happy

  const handleLike = async (postId, e) => {
    e.preventDefault();
    try {
      const res = await postService.likePost(userId, postId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, total_likes: res.total_likes } : p,
          ),
        );
      }
    } catch (err) {
      console.error("Error liking post");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f0f2f5",
        display: "flex",
        minHeight: "100vh",
      }}
    >
      <Sidebar />
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Typography
          variant="h4"
          sx={{ mb: 4, fontWeight: 800, color: "#1a1a1b" }}
        >
          My Posts
        </Typography>

        {loading ? (
          Array.from(new Array(3)).map((_, i) => (
            <Box
              key={i}
              sx={{ mb: 4, p: 3, bgcolor: "white", borderRadius: "24px" }}
            >
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Skeleton variant="circular" width={50} height={50} />
                <Box sx={{ width: "40%" }}>
                  <Skeleton width="100%" height={20} />
                  <Skeleton width="60%" height={15} />
                </Box>
              </Stack>
              <Skeleton
                variant="rectangular"
                height={150}
                sx={{ borderRadius: "16px", mb: 2 }}
              />
              <Skeleton width="100%" />
            </Box>
          ))
        ) : !posts || posts.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 10 }}>
            <Typography variant="h6" color="text.secondary">
              No posts yet. Share something with the world!
            </Typography>
          </Box>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id || post.post_id}
              post={post}
              onLike={handleLike}
            />
          ))
        )}
      </Container>
    </div>
  );
}

export default MyPosts;
