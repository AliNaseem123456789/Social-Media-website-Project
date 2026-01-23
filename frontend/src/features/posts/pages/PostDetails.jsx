import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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

  const userId = localStorage.getItem("user_id");
  const isLoggedIn = !!userId;

  useEffect(() => {
    const loadPost = async () => {
      try {
        const data = await postService.getFullPost(id);
        setPost(data);
      } catch (error) {
        console.error("Error loading full post:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadPost();
  }, [id]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !isLoggedIn) return;

    setPosting(true);
    try {
      const result = await postService.addComment({
        post_id: id,
        comment_text: newComment,
        user_id: Number(userId),
      });
      setPost((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), result.comment],
      }));
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setPosting(false);
    }
  };

  if (loading)
    return (
      <Typography sx={{ textAlign: "center", mt: 10 }}>Loading...</Typography>
    );
  if (!post)
    return (
      <Typography sx={{ textAlign: "center", mt: 10 }}>
        Post not found
      </Typography>
    );
  return (
    <Box sx={{ backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      <Sidebar />
      <Box
        sx={{
          flex: 1,
          margin: "80px auto 20px",
          maxWidth: "600px",
          padding: "0 16px",
        }}
      >
        <Typography
          variant="h5"
          sx={{ mb: 2, fontWeight: "bold", textAlign: "center" }}
        >
          Detailed Post
        </Typography>
        <Card sx={{ boxShadow: 3, borderRadius: 3, mb: 3 }}>
          <CardContent>
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
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
              {post.content}
            </Typography>
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
        <Card sx={{ boxShadow: 2, borderRadius: 3, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            Comments
          </Typography>

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
              {posting ? "..." : "Post"}
            </Button>
          </Box>

          <Stack spacing={2}>
            {post.comments?.length > 0 ? (
              post.comments.map((c) => (
                <Box
                  key={c.comment_id}
                  sx={{
                    display: "flex",
                    gap: 2,
                    bgcolor: "#f7f7f7",
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <Avatar sx={{ bgcolor: "#3f51b5", width: 32, height: 32 }}>
                    {c.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      {c.username}
                    </Typography>
                    <Typography variant="body2">{c.comment_text}</Typography>
                    <Typography variant="caption" color="text.secondary">
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
  );
}
export default PostDetails;
