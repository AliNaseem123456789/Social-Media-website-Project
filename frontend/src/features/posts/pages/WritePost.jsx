import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  IconButton,
} from "@mui/material";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import { postService } from "../services/postService";
function WritePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user_id = localStorage.getItem("user_id");

    if (!user_id) {
      setMessage("You must be logged in to post");
      return;
    }

    setLoading(true);
    try {
      let image_url = "";

      // 1. Upload image if it exists
      if (imageFile) {
        image_url = await postService.uploadImage(imageFile);
      }

      // 2. Submit post data
      const res = await postService.createPost({
        user_id,
        title,
        content,
        image_url,
      });

      // 3. Success handling
      setMessage(res.message);
      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreview("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
          p: 2,
          mt: 6,
          backgroundColor: "#f5f5f5",
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 4,
            borderRadius: 3,
            width: { xs: "90%", sm: "70%", md: "50%" },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Create a New Post
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ width: "100%", display: "flex", flexDirection: "column" }}
          >
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />

            <TextField
              label="Post Content"
              multiline
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
              <input
                accept="image/*"
                type="file"
                id="image-upload"
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
              <label htmlFor="image-upload">
                <IconButton color="primary" component="span">
                  <PhotoCamera />
                </IconButton>
              </label>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{
                    height: "80px",
                    borderRadius: "8px",
                    objectFit: "cover",
                  }}
                />
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>

            {message && (
              <Typography
                variant="body1"
                color="secondary"
                sx={{ mt: 2, textAlign: "center" }}
              >
                {message}
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </>
  );
}

export default WritePost;
