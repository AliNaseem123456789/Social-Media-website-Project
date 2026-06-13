import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  CircularProgress,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { postService } from "../services/postService";
import PostCard from "../components/PostCard";
import Sidebar from "../../../components/Sidebar";
import { useAuth } from "../../auth/context/AuthContext";

function Feed() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
  const userId = currentUser?.id;
  const observerRef = useRef();

  const loadFeed = useCallback(async (cursor = null, isLoadMore = false) => {
    if (isLoadMore && loadingMore) return;
    if (isLoadMore && !hasMore) return;
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const result = await postService.getFeed(10, cursor);
      
      const edges = result?.edges || [];
      const newPosts = edges.map(edge => edge.node);
      const pageInfo = result?.pageInfo || { hasNextPage: false, endCursor: null };
      
      if (isLoadMore) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      
      setHasMore(pageInfo.hasNextPage);
      setNextCursor(pageInfo.endCursor);
      setMessage("");
      
    } catch (err) {
      console.error("Error loading feed:", err);
      setMessage("Unable to reach the server");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  const refreshFeed = () => {
    setPosts([]);
    setHasMore(true);
    setNextCursor(null);
    loadFeed(null, false);
  };

  const lastPostRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        loadFeed(nextCursor, true);
      }
    }, { threshold: 0.1, rootMargin: "100px" });
    
    observerRef.current.observe(node);
  }, [hasMore, loadingMore, loading, nextCursor, loadFeed]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
      return;
    }
    if (isAuthenticated && userId) {
      loadFeed(null, false);
    }
  }, [isAuthenticated, authLoading, userId, navigate]);
const handleLike = async (postId, e) => {
  e.preventDefault();
  if (!isAuthenticated) return;
  
  // Find current post to get current liked status
  const currentPost = posts.find(p => (p.post_id || p.id) === postId);
  const wasLiked = currentPost?.liked || false;
  
  // Optimistic update for better UX
  setPosts((prev) =>
    prev.map((p) => {
      if ((p.post_id || p.id) === postId) {
        return {
          ...p,
          total_likes: wasLiked 
            ? Math.max((p.total_likes || 1) - 1, 0)
            : (p.total_likes || 0) + 1,
          liked: !wasLiked, // Toggle liked status
        };
      }
      return p;
    })
  );
  
  try {
    const res = await postService.likePost(postId);
    if (res.success) {
      // Update with server values to ensure consistency
      setPosts((prev) =>
        prev.map((p) => {
          if ((p.post_id || p.id) === postId) {
            return { 
              ...p, 
              total_likes: res.total_likes,
              liked: res.liked, // Use server's liked status
            };
          }
          return p;
        })
      );
    } else {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) => {
          if ((p.post_id || p.id) === postId) {
            return currentPost;
          }
          return p;
        })
      );
    }
  } catch (err) {
    console.error("Error liking post", err);
    // Revert on error
    setPosts((prev) =>
      prev.map((p) => {
        if ((p.post_id || p.id) === postId) {
          return currentPost;
        }
        return p;
      })
    );
  }
};

  if (authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          bgcolor: "#f4f7fe",
          minHeight: "100vh",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        bgcolor: "#f4f7fe",
        minHeight: "100vh",
      }}
    >
      <Sidebar />

      <Container maxWidth="sm" sx={{ py: 6 }}>
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
              onClick={refreshFeed}
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

        <Stack spacing={1}>
          {loading ? (
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
          ) : posts.length > 0 ? (
            <>
              {posts.map((post, index) => {
                const isLastPost = index === posts.length - 1;
                return (
                  <Fade in={true} timeout={400 + index * 100} key={post.post_id || post.id}>
                    <Box ref={isLastPost ? lastPostRef : null}>
                      <PostCard post={post} onLike={handleLike} />
                    </Box>
                  </Fade>
                );
              })}
              
              {loadingMore && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              )}
              
              {!hasMore && posts.length > 0 && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    You've seen all posts
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            !loading && posts.length === 0 && !message && (
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
            )
          )}
        </Stack>
      </Container>
    </Box>
  );
}

export default Feed;