import { useEffect, useState } from "react";
import Sidebar from "../../../components/Sidebar";
import { postService } from "../services/postService";
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

  const userId = localStorage.getItem("user_id");
  const username = localStorage.getItem("username");

  useEffect(() => {
    const fetchMyPosts = async () => {
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
    };

    fetchMyPosts();
  }, [userId]);

  if (loading)
    return (
      <p style={{ textAlign: "center", marginTop: "100px" }}>Loading...</p>
    );

  if (!posts || posts.length === 0)
    return (
      <p style={{ textAlign: "center", marginTop: "100px" }}>No posts yet.</p>
    );

  return (
    <div
      style={{
        backgroundColor: "#f0f2f5",
        display: "flex",
        minHeight: "100vh",
      }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Posts area */}
      <Box
        sx={{
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
            key={post.id || post.post_id}
            sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}
          >
            <CardContent>
              {/* Post Header */}
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Avatar sx={{ mr: 1, bgcolor: "#42a5f5" }}>
                  {username?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {username || "Me"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(post.created_at).toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              {/* Post Content */}
              <Typography
                variant="body1"
                sx={{ mb: 2, whiteSpace: "pre-line" }}
              >
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
                <Typography variant="body2">{post.total_likes || 0}</Typography>

                <IconButton color="primary" size="small">
                  <CommentIcon />
                </IconButton>
                <Typography variant="body2">
                  {post.comments?.length || post.total_comments || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </div>
  );
}

export default MyPosts;
