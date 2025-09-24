import React, { useState } from 'react';
import axios from 'axios';
import { Box, TextField, Button, Paper, Typography, IconButton } from '@mui/material';
import Navbar from './Navbar';
import PhotoCamera from '@mui/icons-material/PhotoCamera';

function PostWrite() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [message, setMessage] = useState("");

  // Supabase upload function
  const uploadImageToSupabase = async (file) => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await axios.post("https://social-media-website-project.onrender.com/api/posts/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data.url; // Supabase public URL
    } catch (err) {
      console.error(err);
      setMessage("Image upload failed");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user_id = localStorage.getItem("user_id");
      if (!user_id) {
        setMessage("You must be logged in to post");
        return;
      }

      let image_url = "";
      if (imageFile) {
        image_url = await uploadImageToSupabase(imageFile);
      }

      const res = await axios.post("https://social-media-website-project.onrender.com/api/posts", {
        user_id,
        title,
        content,
        image_url, // include the uploaded image URL
      });

      setMessage(res.data.message);
      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreview("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <>
      <Navbar />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh',
          p: 2,
          mt:6,
          backgroundColor: '#f5f5f5',
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 4,
            borderRadius: 3,
            width: { xs: '90%', sm: '70%', md: '50%' },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Create a New Post
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}
            noValidate
            autoComplete="off"
          >
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Type the title"
              fullWidth
              sx={{ mb: 2 }}
            />

            <TextField
              label="Post Content"
              multiline
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post here"
              fullWidth
              sx={{ mb: 3 }}
            />

            {/* Image Upload */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <input
                accept="image/*"
                type="file"
                id="image-upload"
                style={{ display: 'none' }}
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
                  style={{ height: '80px', borderRadius: '8px', objectFit: 'cover' }}
                />
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Submit
            </Button>

            {message && (
              <Typography
                variant="body1"
                color="secondary"
                sx={{ mt: 2, textAlign: 'center' }}
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

export default PostWrite;
