import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
} from "@mui/material";
import { Link } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CommentIcon from "@mui/icons-material/Comment";
import axios from "axios";

function Feed() {
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState([]);
  const userId = localStorage.getItem("user_id");

  // Fetch posts with their full comments
  const fetchPosts = async () => {
    try {
      const response = await axios.get("https://social-media-website-project.onrender.com/api/posts");
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
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
    }
  };

  useEffect(() => {
    if (!userId) {
      setMessage("You must be logged in to like a post");
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
      const res = await axios.post("https://social-media-website-project.onrender.com/api/posts/like", {
        user_id: userId,
        post_id: postId,
      });
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
        marginTop: "60px",
        padding: "0 12px",
      }}
    >
      <Typography
        variant="h5"
        sx={{ mb: 2, fontWeight: "bold", textAlign: "center", mt: 4 }}
      >
        Your Feed
      </Typography>

      {message && <p style={{ color: "red" }}>{message}</p>}

      {posts.map((post) => (
        <Link
          to={`/fullpost/${post.id}`}
          key={post.id}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Card
            sx={{
              marginBottom: 3,
              boxShadow: 3,
              borderRadius: 3,
              transition: "0.2s",
              "&:hover": { boxShadow: 6 },
            }}
          >
            <CardContent>
              {/* Post Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <Link
                  style={{ textDecoration: "none" }}
                  to={`/profile/${post.user_id}`}
                >
                  <Avatar sx={{ width: 40, height: 40, marginRight: 1 }}>
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
                    {new Date(post.created_at).toLocaleString()}
                  </Typography>
                </div>
              </div>

              {/* Post Content */}
              <Typography variant="body1" sx={{ marginBottom: 2 }}>
                {post.content}
              </Typography>

              {/* Action Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <IconButton
                  onClick={(e) => handleLike(post.id, e)}
                  color="error"
                  size="small"
                >
                  <FavoriteIcon />
                </IconButton>
                <span style={{ fontSize: "0.9rem" }}>
                  {post.total_likes || 0}
                </span>

                <IconButton
                  onClick={(e) => e.preventDefault()} // prevent navigating when clicking comment
                  color="primary"
                  size="small"
                >
                  <CommentIcon />
                </IconButton>
                <span style={{ fontSize: "0.9rem" }}>
                  {post.comments?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default Feed;
