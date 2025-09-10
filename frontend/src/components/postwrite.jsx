import React, { useState } from 'react';
import axios from 'axios';
import { Box, TextField, Button, Paper, Typography } from '@mui/material';
import Navbar from './Navbar';

function PostWrite() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user_id = localStorage.getItem("user_id");
      if (!user_id) {
        setMessage("You must be logged in to post");
        return;
      }

      const res = await axios.post("http://localhost:5000/api/posts", {
        user_id,
        title,
        content
      });

      setMessage(res.data.message);
      setTitle("");
      setContent("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
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
