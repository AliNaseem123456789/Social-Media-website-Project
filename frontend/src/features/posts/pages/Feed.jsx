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

import { postService } from "../services/postService";
import { timeAgo } from "../../../utils/formatters";

function Feed() {
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem("user_id");

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await postService.getFeed();
      setPosts(data);
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
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

  const handleLike = async (postId, e) => {
    e.preventDefault();
    if (!userId) {
      setMessage("You must be logged in to like a post");
      return;
    }

    try {
      const res = await postService.likePost(userId, postId);
      if (res.success) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, total_likes: res.total_likes }
              : post,
          ),
        );
      }
    } catch (err) {
      setMessage("Error liking post");
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

      {loading
        ? Array.from(new Array(3)).map((_, i) => (
            <Card
              key={i}
              sx={{ marginBottom: 3, borderRadius: 3, boxShadow: 1, p: 2 }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                  <Skeleton variant="circular" width={45} height={45} />
                  <Skeleton width={120} height={20} />
                </Stack>
                <Skeleton
                  variant="rectangular"
                  height={150}
                  sx={{ mb: 1, borderRadius: 2 }}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Skeleton width={40} />
                  <Skeleton width={40} />
                </Stack>
              </CardContent>
            </Card>
          ))
        : posts.map((post) => (
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
                  transition: "0.3s",
                  "&:hover": { boxShadow: 6, transform: "translateY(-3px)" },
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                    <Link
                      to={`/profile/${post.user_id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Avatar
                        sx={{
                          width: 45,
                          height: 45,
                          bgcolor: "#42a5f5",
                          fontWeight: "bold",
                        }}
                      >
                        {post.username?.charAt(0).toUpperCase()}
                      </Avatar>
                    </Link>
                    <div>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: "bold" }}
                      >
                        {post.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {timeAgo(post.created_at)}
                      </Typography>
                    </div>
                  </Stack>

                  <Typography
                    variant="body1"
                    sx={{
                      marginBottom: 2,
                      lineHeight: 1.6,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {post.content}
                  </Typography>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      style={{
                        width: "100%",
                        borderRadius: "12px",
                        maxHeight: "400px",
                        objectFit: "cover",
                        marginBottom: "12px",
                      }}
                    />
                  )}

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <IconButton
                      onClick={(e) => handleLike(post.id, e)}
                      color="error"
                    >
                      <FavoriteIcon />
                    </IconButton>
                    <Typography variant="body2">
                      {post.total_likes || 0}
                    </Typography>

                    <IconButton
                      color="primary"
                      onClick={(e) => e.preventDefault()}
                    >
                      <CommentIcon />
                    </IconButton>
                    <Typography variant="body2">
                      {post.comments?.length || 0}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Link>
          ))}
    </div>
  );
}

export default Feed;
