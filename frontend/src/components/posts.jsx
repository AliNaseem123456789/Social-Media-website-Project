import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Stack,
  Skeleton,
} from "@mui/material";
import { Link } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CommentIcon from "@mui/icons-material/Comment";
import axios from "axios";

function Feed() {
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem("user_id");

  // Helper: Time ago formatting
  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Fetch posts with their full comments
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "https://social-media-website-project.onrender.com/api/posts"
      );
      const postsData = response.data;

      // Fetch full comments for each post
      const postsWithComments = await Promise.all(
        postsData.map(async (post) => {
          try {
            const fullPostRes = await axios.get(
              `https://social-media-website-project.onrender.com/api/posts/fullpost/${post.id}`
            );
            const fullPost = fullPostRes.data;
            return { ...post, comments: fullPost.comments || [] };
          } catch {
            return { ...post, comments: [] };
          }
        })
      );

      setPosts(postsWithComments);
      setLoading(false);
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setMessage("You must be logged in to like a post");
      setLoading(false);
      return;
    }
    fetchPosts();
  }, [userId]);

  const handleLike = async (postId, e) => {
    e.preventDefault();
    if (!userId) {
      setMessage("You must be logged in to like a post");
      return;
    }

    try {
      const res = await axios.post(
        "https://social-media-website-project.onrender.com/api/posts/like",
        { user_id: userId, post_id: postId }
      );
      if (res.data.success) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, total_likes: res.data.total_likes }
              : post
          )
        );
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Error liking post");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#f0f2f5",
        maxWidth: "600px",
        margin: "20px auto",
        padding: "12px",
        borderRadius: "12px",
      }}
    >
      <Typography
        variant="h5"
        sx={{ mb: 2, fontWeight: "bold", textAlign: "center", mt: 4 }}
      >
        Your Feed
      </Typography>

      {message && (
        <Typography
          variant="body2"
          sx={{ color: "red", textAlign: "center", mb: 2 }}
        >
          {message}
        </Typography>
      )}

      {loading ? (
        // Skeleton loader for modern UX
        Array.from(new Array(3)).map((_, i) => (
          <Card
            key={i}
            sx={{
              marginBottom: 3,
              borderRadius: 3,
              boxShadow: 1,
              p: 2,
            }}
          >
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                <Skeleton variant="circular" width={45} height={45} />
                <Skeleton width={120} height={20} />
              </Stack>
              <Skeleton variant="rectangular" height={50} sx={{ mb: 1 }} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton width={20} height={20} />
              </Stack>
            </CardContent>
          </Card>
        ))
      ) : (
        posts.map((post) => (
          <Link
            to={`/fullpost/${post.id}`}
            key={post.id}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Card
              sx={{
                marginBottom: 3,
                borderRadius: 3,
                boxShadow: 1,
                transition: "all 0.3s ease",
                "&:hover": { boxShadow: 6, transform: "translateY(-3px)" },
              }}
            >
              <CardContent>
                {/* Post Header */}
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                  <Link
                    style={{ textDecoration: "none" }}
                    to={`/profile/${post.user_id}`}
                  >
                    <Avatar
                      sx={{
                        width: 45,
                        height: 45,
                        bgcolor: "#42a5f5",
                        fontWeight: "bold",
                      }}
                    >
                      {post.username.charAt(0).toUpperCase()}
                    </Avatar>
                  </Link>
                  <div>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      {post.username}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.8rem" }}
                    >
                      {timeAgo(post.created_at)}
                    </Typography>
                  </div>
                </Stack>

                {/* Post Content */}
                <Typography
                  variant="body1"
                  sx={{ marginBottom: 2, lineHeight: 1.6, whiteSpace: "pre-line" }}
                >
                  {post.content}
                </Typography>

                {/* Action Row */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconButton
                    onClick={(e) => handleLike(post.id, e)}
                    color={userId && post.liked_by?.includes(userId) ? "error" : "default"}
                  >
                    <FavoriteIcon />
                  </IconButton>
                  <Typography variant="body2">{post.total_likes || 0}</Typography>

                  <IconButton
                    onClick={(e) => e.preventDefault()} // prevent navigating
                    color="primary"
                  >
                    <CommentIcon />
                  </IconButton>
                  <Typography variant="body2">{post.comments?.length || 0}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}

export default Feed;
