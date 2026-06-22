// Feed.jsx
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
  Tabs,
  Tab,
  Paper,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import PeopleIcon from "@mui/icons-material/People";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { postService } from "../services/postService";
import PostCard from "../components/PostCard";
import Sidebar from "../../../components/Sidebar";
import { useAuth } from "../../auth/context/AuthContext";

// Tab Panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`feed-tabpanel-${index}`}
      aria-labelledby={`feed-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function Feed() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [feedTitle, setFeedTitle] = useState("For You");
  
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
  const userId = currentUser?.id;
  const observerRef = useRef();

  // Tab configurations
  const tabs = [
    { 
      label: "For You", 
      icon: <WhatshotIcon />, 
      value: 0,
      description: "Personalized posts just for you",
      feedType: "forYou"
    },
    { 
      label: "Friends Feed", 
      icon: <PeopleIcon />, 
      value: 1,
      description: "Posts from your friends",
      feedType: "friends"
    },
    { 
      label: "Latest", 
      icon: <AccessTimeIcon />, 
      value: 2,
      description: "Chronological order",
      feedType: "latest"
    },
  ];

  const loadFeed = useCallback(async (cursor = null, isLoadMore = false) => {
    if (isLoadMore && loadingMore) return;
    if (isLoadMore && !hasMore) return;
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      let result;
      
      // Determine which feed to load based on tab
      switch(tabValue) {
        case 0: // For You - ranked feed
          result = await postService.getForYouFeed(10, cursor);
          setFeedTitle("For You");
          break;
        case 1: // Friends Feed - ranked feed (same as for you but different label)
          result = await postService.getFeed(10, cursor);
          setFeedTitle("Friends Feed");
          break;
        case 2: // Latest - chronological feed
          result = await postService.getForYouFeed(10, cursor);
          setFeedTitle("Latest");
          break;
        default:
          result = await postService.getChronologicalFeed(10, cursor);
          setFeedTitle("For You");
      }
      
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
  }, [tabValue, loadingMore, hasMore]);

  const refreshFeed = () => {
    setPosts([]);
    setHasMore(true);
    setNextCursor(null);
    loadFeed(null, false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPosts([]);
    setHasMore(true);
    setNextCursor(null);
    setLoading(true);
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
  }, [isAuthenticated, authLoading, userId, navigate, tabValue]);

  const handleLike = async (postId, e) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    
    const currentPost = posts.find(p => (p.post_id || p.id) === postId);
    const wasLiked = currentPost?.liked || false;
    
    setPosts((prev) =>
      prev.map((p) => {
        if ((p.post_id || p.id) === postId) {
          return {
            ...p,
            total_likes: wasLiked 
              ? Math.max((p.total_likes || 1) - 1, 0)
              : (p.total_likes || 0) + 1,
            liked: !wasLiked,
          };
        }
        return p;
      })
    );
    
    try {
      const res = await postService.likePost(postId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => {
            if ((p.post_id || p.id) === postId) {
              return { 
                ...p, 
                total_likes: res.total_likes,
                liked: res.liked,
              };
            }
            return p;
          })
        );
      } else {
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
        <CircularProgress size={40} />
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

      <Container maxWidth="sm" sx={{ py: 4 }}>
        {/* Header */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  color: "#1a1a1b",
                  letterSpacing: "-0.5px",
                }}
              >
                {feedTitle}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                {tabs.find(t => t.value === tabValue)?.description || "Your feed"}
              </Typography>
            </Box>

            <Tooltip title="Refresh Feed">
              <IconButton
                onClick={refreshFeed}
                sx={{
                  bgcolor: "white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  border: "1px solid",
                  borderColor: "divider",
                  "&:hover": { bgcolor: "#f0f0f0" },
                  transition: "all 0.2s ease",
                }}
              >
                <RefreshRoundedIcon color="primary" />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Modern Tabs */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: "16px",
              bgcolor: "white",
              p: 0.5,
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}
          >
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                "& .MuiTab-root": {
                  borderRadius: "12px",
                  minHeight: 44,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                  transition: "all 0.2s ease",
                  "&.Mui-selected": {
                    color: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  },
                },
                "& .MuiTabs-indicator": {
                  display: "none",
                },
              }}
            >
              {tabs.map((tab) => (
                <Tab
                  key={tab.value}
                  icon={tab.icon}
                  label={tab.label}
                  iconPosition="start"
                  sx={{
                    "& .MuiTab-iconWrapper": {
                      fontSize: "1.1rem",
                    },
                  }}
                />
              ))}
            </Tabs>
          </Paper>
        </Stack>

        {message && (
          <Fade in={!!message}>
            <Alert
              severity="info"
              sx={{ mb: 3, borderRadius: "16px", fontWeight: 600 }}
            >
              {message}
            </Alert>
          </Fade>
        )}

        {/* Tab Panels */}
        {tabs.map((tab) => (
          <TabPanel key={tab.value} value={tabValue} index={tab.value}>
            <Stack spacing={1.5}>
              {loading ? (
                // Loading skeletons
                Array.from(new Array(3)).map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      mb: 3,
                      p: 3,
                      bgcolor: "white",
                      borderRadius: "24px",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                      <Skeleton variant="circular" width={44} height={44} />
                      <Box sx={{ width: "40%" }}>
                        <Skeleton
                          width="100%"
                          height={18}
                          sx={{ borderRadius: "4px" }}
                        />
                        <Skeleton
                          width="60%"
                          height={14}
                          sx={{ borderRadius: "4px" }}
                        />
                      </Box>
                    </Stack>
                    <Skeleton
                      variant="rectangular"
                      height={200}
                      sx={{ borderRadius: "16px", mb: 2 }}
                    />
                    <Skeleton width="90%" height={18} />
                    <Skeleton width="40%" height={18} />
                  </Box>
                ))
              ) : posts.length > 0 ? (
                <>
                  {posts.map((post, index) => {
                    const isLastPost = index === posts.length - 1;
                    return (
                      <Fade in={true} timeout={300 + index * 80} key={post.post_id || post.id}>
                        <Box ref={isLastPost ? lastPostRef : null}>
                          <PostCard post={post} onLike={handleLike} />
                        </Box>
                      </Fade>
                    );
                  })}
                  
                  {loadingMore && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                      <CircularProgress size={28} />
                    </Box>
                  )}
                  
                  {!hasMore && posts.length > 0 && (
                    <Box sx={{ textAlign: "center", py: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        🎉 You've seen all posts
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                !loading && posts.length === 0 && !message && (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      No posts yet
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      {tabValue === 0 && "Follow some people to see personalized posts here!"}
                      {tabValue === 1 && "Add some friends to see their posts!"}
                      {tabValue === 2 && "No recent posts from your friends"}
                    </Typography>
                  </Box>
                )
              )}
            </Stack>
          </TabPanel>
        ))}
      </Container>
    </Box>
  );
}

export default Feed;