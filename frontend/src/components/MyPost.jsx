import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

// MUI components
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Box,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CommentIcon from "@mui/icons-material/Comment";

function MyPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // get userId from localStorage
  const userId = localStorage.getItem("user_id");
  const username = localStorage.getItem("username");

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/posts/myposts/${userId}`
        );
        setPosts(response.data);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchPosts();
    }
  }, [userId]);

  if (loading) return <p style={{ textAlign: "center" }}>Loading...</p>;
  if (!posts || posts.length === 0)
    return <p style={{ textAlign: "center" }}>No posts yet.</p>;

  return (
    <div style={{backgroundColor: "#f0f2f5",
       display: "flex" }}>
      {/* Navbar fixed at top */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <Navbar />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Posts area */}
      <div
        style={{
          flex: 1,
          margin: "80px auto", // space for navbar
          maxWidth: "650px",
          padding: "0 16px",
        }}
      >
        <Typography
          variant="h5"
          sx={{ mb: 2, fontWeight: "bold", textAlign: "center" }}
        >
          My Posts
        </Typography>

        {posts.map((post) => (
          <Card
            key={post.post_id}
            sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}
          >
            <CardContent>
              {/* Post Header */}
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar sx={{ mr: 1 }}>
                  {username?.charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {username || "Me"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(post.created_at).toLocaleString()}
                  </Typography>
                </div>
              </Box>

              {/* Post Content */}
              <Typography variant="body1" sx={{ mb: 2 }}>
                {post.content}
              </Typography>

              <Divider />

              {/* Action Row */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  mt: 1,
                }}
              >
                <IconButton color="error" size="small">
                  <FavoriteIcon />
                </IconButton>
                <span>{post.total_likes || 0}</span>

                <IconButton color="primary" size="small">
                  <CommentIcon />
                </IconButton>
                <span>{post.total_comments || 0}</span>
              </Box>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default MyPosts;
