import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import { postService } from "../services/postService";
import PostCard from "../components/PostCard";
import {
  Typography,
  Box,
  Stack,
  Skeleton,
  Container,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Chip,
  Drawer,
  Slider,
  Divider,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  FilterList as FilterIcon,
  Sort as SortIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  TextFields as TextIcon,
  Favorite as LikeIcon,
  Comment as CommentIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";
import { useAuth } from "../../auth/context/AuthContext";

// Sort options
const SORT_OPTIONS = [
  { value: 'recent', label: 'Newest First', icon: <TimeIcon fontSize="small" /> },
  { value: 'oldest', label: 'Oldest First', icon: <TimeIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} /> },
  { value: 'likes', label: 'Most Liked', icon: <LikeIcon fontSize="small" /> },
  { value: 'comments', label: 'Most Commented', icon: <CommentIcon fontSize="small" /> },
];

// Time filter options
const TIME_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'year', label: 'Last Year' },
];

function MyPosts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filter & Sort State
  const [sortBy, setSortBy] = useState('recent');
  const [timeFilter, setTimeFilter] = useState('all');
  const [contentType, setContentType] = useState('all');
  const [minLikes, setMinLikes] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
  const { user: currentUser, isAuthenticated } = useAuth();
  const userId = currentUser?.id;
  const observerRef = useRef();
  const isInitialMount = useRef(true);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (timeFilter !== 'all') count++;
    if (contentType !== 'all') count++;
    if (minLikes > 0) count++;
    setActiveFiltersCount(count);
  }, [timeFilter, contentType, minLikes]);

  // Fetch posts function - NOT wrapped in useCallback to prevent loop
  const fetchMyPosts = async (reset = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    const cursorToUse = reset ? null : nextCursor;
    
    if (reset) {
      setLoading(true);
    }
    
    try {
      const response = await postService.getUserPosts(
        cursorToUse, 
        10, 
        sortBy, 
        timeFilter, 
        contentType, 
        minLikes
      );
      
      const postsData = response.data || [];
      const paginationData = response.pagination || { hasMore: false, nextCursor: null };
      
      if (reset) {
        setPosts(postsData);
      } else {
        setPosts(prev => [...prev, ...postsData]);
      }
      
      setHasMore(paginationData.hasMore);
      setNextCursor(paginationData.nextCursor);
    } catch (error) {
      console.error("Error fetching my posts:", error);
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Reset pagination when filters/sort change
  useEffect(() => {
    if (userId && !isInitialMount.current) {
      setPosts([]);
      setHasMore(true);
      setNextCursor(null);
      fetchMyPosts(true);
    }
    isInitialMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, timeFilter, contentType, minLikes]);

  // Load more posts function
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    await fetchMyPosts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, loading]);

  // Initial load and auth check
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (userId) {
      fetchMyPosts(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isAuthenticated, navigate]);

  const handleLike = async (postId, e) => {
    e.preventDefault();
    try {
      const res = await postService.likePost(postId);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            (p.id === postId || p.post_id === postId)
              ? { ...p, total_likes: res.total_likes }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Error liking post");
    }
  };

  const lastPostRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        loadMorePosts();
      }
    }, { threshold: 0.1 });
    
    observerRef.current.observe(node);
  }, [hasMore, loadingMore, loading, loadMorePosts]);

  const handleSortClick = (event) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = (value) => {
    if (value) {
      setSortBy(value);
    }
    setSortAnchorEl(null);
  };

  const handleClearFilters = () => {
    setTimeFilter('all');
    setContentType('all');
    setMinLikes(0);
  };

  if (!isAuthenticated) {
    return null;
  }

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
        <Stack 
          direction="row" 
          justifyContent="space-between" 
          alignItems="center" 
          sx={{ mb: 3 }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: "#1a1a1b" }}
          >
            My Posts
          </Typography>
          
          <Stack direction="row" spacing={1}>
            {/* Sort Button */}
            <IconButton 
              onClick={handleSortClick}
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f0f0f0' } }}
            >
              <SortIcon />
            </IconButton>
            
            {/* Filter Button with Badge */}
            <IconButton 
              onClick={() => setShowFilters(true)}
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f0f0f0' } }}
            >
              <Badge badgeContent={activeFiltersCount} color="primary">
                <FilterIcon />
              </Badge>
            </IconButton>
          </Stack>
        </Stack>

        {activeFiltersCount > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
            {timeFilter !== 'all' && (
              <Chip 
                label={`Time: ${TIME_OPTIONS.find(t => t.value === timeFilter)?.label}`}
                onDelete={() => setTimeFilter('all')}
                size="small"
              />
            )}
            {contentType !== 'all' && (
              <Chip 
                label={`Type: ${contentType === 'image' ? 'Images Only' : 'Text Only'}`}
                onDelete={() => setContentType('all')}
                size="small"
              />
            )}
            {minLikes > 0 && (
              <Chip 
                label={`Min ${minLikes} likes`}
                onDelete={() => setMinLikes(0)}
                size="small"
              />
            )}
          </Stack>
        )}

        <Menu
          anchorEl={sortAnchorEl}
          open={Boolean(sortAnchorEl)}
          onClose={() => handleSortClose(null)}
          PaperProps={{ sx: { minWidth: 180, borderRadius: 2 } }}
        >
          {SORT_OPTIONS.map(option => (
            <MenuItem 
              key={option.value} 
              onClick={() => handleSortClose(option.value)}
              selected={sortBy === option.value}
              sx={{ gap: 1 }}
            >
              {option.icon}
              {option.label}
              {sortBy === option.value && (
                <Box sx={{ ml: 'auto', color: 'primary.main' }}>✓</Box>
              )}
            </MenuItem>
          ))}
        </Menu>

        <Drawer
          anchor="bottom"
          open={showFilters}
          onClose={() => setShowFilters(false)}
          PaperProps={{ sx: { borderRadius: '20px 20px 0 0', maxHeight: '80vh' } }}
        >
          <Box sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>Filter Posts</Typography>
              <IconButton onClick={() => setShowFilters(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            
            <Divider sx={{ mb: 3 }} />
            
            {/* Time Filter */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Time Range
            </Typography>
            <ToggleButtonGroup
              value={timeFilter}
              exclusive
              onChange={(e, val) => val && setTimeFilter(val)}
              sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
            >
              {TIME_OPTIONS.map(option => (
                <ToggleButton 
                  key={option.value} 
                  value={option.value}
                  sx={{ borderRadius: '20px!important', px: 2 }}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            
            {/* Content Type Filter */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Content Type
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Button
                variant={contentType === 'all' ? 'contained' : 'outlined'}
                onClick={() => setContentType('all')}
                sx={{ borderRadius: '20px' }}
              >
                All
              </Button>
              <Button
                variant={contentType === 'image' ? 'contained' : 'outlined'}
                onClick={() => setContentType('image')}
                startIcon={<ImageIcon />}
                sx={{ borderRadius: '20px' }}
              >
                Images
              </Button>
              <Button
                variant={contentType === 'text' ? 'contained' : 'outlined'}
                onClick={() => setContentType('text')}
                startIcon={<TextIcon />}
                sx={{ borderRadius: '20px' }}
              >
                Text Only
              </Button>
            </Stack>
            
            {/* Minimum Likes Filter */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Minimum Likes: {minLikes}
            </Typography>
            <Slider
              value={minLikes}
              onChange={(e, val) => setMinLikes(val)}
              min={0}
              max={100}
              step={5}
              valueLabelDisplay="auto"
              sx={{ mb: 3 }}
            />
            
            <Divider sx={{ my: 2 }} />
            
            <Stack direction="row" spacing={2}>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={handleClearFilters}
              >
                Clear All
              </Button>
              <Button 
                variant="contained" 
                fullWidth
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </Button>
            </Stack>
          </Box>
        </Drawer>

        {/* Posts List */}
        {loading && posts.length === 0 ? (
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
        ) : posts.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 10 }}>
            <Typography variant="h6" color="text.secondary">
              {activeFiltersCount > 0 
                ? "No posts match your filters" 
                : "No posts yet. Share something with the world!"}
            </Typography>
            {activeFiltersCount > 0 && (
              <Button
                variant="outlined"
                onClick={handleClearFilters}
                sx={{ mt: 2, borderRadius: "12px" }}
              >
                Clear Filters
              </Button>
            )}
            {activeFiltersCount === 0 && (
              <Button
                variant="contained"
                onClick={() => navigate("/postwrite")}
                sx={{ mt: 2, borderRadius: "12px", textTransform: "none" }}
              >
                Create Your First Post
              </Button>
            )}
          </Box>
        ) : (
          <>
            {posts.map((post, index) => {
              const isLastPost = index === posts.length - 1;
              const postId = post.id || post.post_id;
              
              return (
                <div
                  key={postId}
                  ref={isLastPost ? lastPostRef : null}
                >
                  <PostCard
                    post={post}
                    onLike={handleLike}
                  />
                </div>
              );
            })}
            
            {loadingMore && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  Loading more posts...
                </Typography>
              </Box>
            )}
            
            {!hasMore && posts.length > 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  You have seen all {posts.length} posts
                </Typography>
              </Box>
            )}
          </>
        )}
      </Container>
    </div>
  );
}

export default MyPosts;