import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Box,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CommentIcon from "@mui/icons-material/Comment";

function PostDetails() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/posts/fullpost/${id}`
        );
        setPost(response.data);
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchPost();
  }, [id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    setPosting(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/api/posts/comment`,
        {
          post_id: id,
          comment_text: newComment,
          user_id: Number(userId),
        }
      );

      setPost((prev) => ({
        ...prev,
        comments: [...prev.comments, response.data.comment],
      }));

      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setPosting(false);
    }
  };

  const isLoggedIn = !!localStorage.getItem("user_id");

  if (loading) return <p style={{ textAlign: "center" }}>Loading...</p>;
  if (!post) return <p style={{ textAlign: "center" }}>Post not found</p>;

  return (
<div style={{backgroundColor : "#f0f2f5" }}>
    <Navbar />
     <Typography
          variant="h5"
          sx={{ mb: 2, fontWeight: "bold", textAlign: "center",mt:8.5}}
        >
          Detailed Post
        </Typography>
    <Box sx={{ bgcolor: "#f0f2f5", minHeight: "100vh",mt:-12}}>
      {/* Navbar */}
      <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000 }}>
        
      </Box>

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          margin: "10px auto",
          maxWidth: "600px",
          padding: "0 16px",
        }}
      >
        {/* Post Card */}
        <Card sx={{ boxShadow: 3, borderRadius: 3, mb: 3 ,mt:15}}>
          <CardContent>
            {/* Post Header */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: "#3f51b5" }}>
                {post.username?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  {post.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(post.created_at).toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {/* Post Content */}
            <Typography
              variant="body1"
              sx={{ mb: 2, lineHeight: 1.6, fontSize: "1rem" }}
            >
              {post.content}
            </Typography>

            {/* Actions */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton color="error">
                <FavoriteIcon />
              </IconButton>
              <Typography>{post.total_likes || 0}</Typography>

              <IconButton color="primary">
                <CommentIcon />
              </IconButton>
              <Typography>{post.comments?.length || 0}</Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card sx={{ boxShadow: 2, borderRadius: 3, mb: 3, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            Comments
          </Typography>

          {/* Comment Input */}
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder={isLoggedIn ? "Add a comment..." : "Login to comment"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!isLoggedIn}
            />
            <Button
              variant="contained"
              onClick={handleAddComment}
              disabled={!isLoggedIn || posting || !newComment.trim()}
            >
              {posting ? "Posting..." : "Post"}
            </Button>
          </Box>

          {/* Comment List */}
          <Stack spacing={2}>
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((c) => (
                <Box
                  key={c.comment_id}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    bgcolor: "#f7f7f7",
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <Avatar sx={{ bgcolor: "#3f51b5", mt: 0.5 }}>
                    {c.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      {c.username}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {c.comment_text}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {new Date(c.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No comments yet
              </Typography>
            )}
          </Stack>
        </Card>
      </Box>
    </Box>
    </div>
  );
}

export default PostDetails;
