import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  IconButton,
  CircularProgress,
  Fade,
  Stack,
} from "@mui/material";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
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

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
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
      if (imageFile) {
        image_url = await postService.uploadImage(imageFile);
      }
      // eslint-disable-next-line
      const res = await postService.createPost({
        user_id,
        title,
        content,
        image_url,
      });

      setMessage("Success! Your post is live.");
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
    <Box
      sx={{
        backgroundColor: "#f4f7fe",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
        pt: 10,
      }}
    >
      <Fade in={true} timeout={800}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: "32px",
            width: "100%",
            maxWidth: "600px",
            bgcolor: "white",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.05)",
          }}
        >
          {/* Header */}
          <Stack spacing={1} sx={{ mb: 4, textAlign: "center" }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 900, color: "#1a1a1b", letterSpacing: "-1px" }}
            >
              Share Something
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              What's on your mind today?
            </Typography>
          </Stack>

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              placeholder="Give your post a title..."
              variant="standard"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              InputProps={{
                disableUnderline: true,
                sx: { fontSize: "1.4rem", fontWeight: 700, px: 1 },
              }}
              sx={{ mb: 3 }}
            />

            <TextField
              placeholder="Tell your story..."
              multiline
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "20px",
                  bgcolor: "#f9fafb",
                  "& fieldset": { border: "none" },
                  transition: "0.3s",
                  "&.Mui-focused": {
                    bgcolor: "#fff",
                    boxShadow: "0 0 0 2px #1877f2",
                  },
                },
                mb: 3,
              }}
            />

            {/* Image Preview Area */}
            {imagePreview && (
              <Box
                sx={{
                  position: "relative",
                  mb: 3,
                  borderRadius: "20px",
                  overflow: "hidden",
                }}
              >
                <IconButton
                  onClick={removeImage}
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    bgcolor: "rgba(0,0,0,0.5)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                  }}
                >
                  <CloseRoundedIcon />
                </IconButton>
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "cover",
                  }}
                />
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 1,
              }}
            >
              <Box>
                <input
                  accept="image/*"
                  type="file"
                  id="image-upload"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                <label htmlFor="image-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={<PhotoCameraRoundedIcon />}
                    sx={{
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: 700,
                      color: "#65676b",
                      borderColor: "#e4e6e9",
                      "&:hover": { bgcolor: "#f2f2f2", borderColor: "#d8dadf" },
                    }}
                  >
                    Add Media
                  </Button>
                </label>
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={loading || !content.trim()}
                sx={{
                  borderRadius: "12px",
                  px: 4,
                  py: 1.2,
                  fontWeight: 800,
                  textTransform: "none",
                  fontSize: "1rem",
                  boxShadow: "0 8px 24px rgba(24, 119, 242, 0.25)",
                  "&:hover": {
                    boxShadow: "0 12px 30px rgba(24, 119, 242, 0.4)",
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Post"
                )}
              </Button>
            </Box>

            {message && (
              <Fade in={!!message}>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 3,
                    textAlign: "center",
                    p: 1.5,
                    borderRadius: "12px",
                    bgcolor: message.includes("Success")
                      ? "#e7f3ff"
                      : "#ffebe8",
                    color: message.includes("Success") ? "#1877f2" : "#f02849",
                    fontWeight: 700,
                  }}
                >
                  {message}
                </Typography>
              </Fade>
            )}
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
}

export default WritePost;
