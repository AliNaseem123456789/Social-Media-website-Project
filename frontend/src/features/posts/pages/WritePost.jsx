import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Avatar,
  GlobalStyles,
  Container,
} from "@mui/material";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { postService } from "../services/postService";
import { useAuth } from "../../auth/context/AuthContext";

/* ---------------------------------------------------------------------
   Circle brand tokens — identical to landing.css / FriendsPage so the
   logged-in app doesn't shift identity: paper/ink base, ember as the
   one loud accent, signal green reserved for success/presence states.
   ------------------------------------------------------------------ */
const T = {
  paper: "#faf8f4",
  surface: "#ffffff",
  ink: "#16140f",
  inkSoft: "#58534a",
  inkFaint: "#948d80",
  line: "#e7e1d5",
  ember: "#e0431f",
  emberInk: "#7c2410",
  emberTint: "#fce6dd",
  signal: "#1c7a54",
  signalTint: "#dcf1e6",
  error: "#b3261e",
  errorTint: "#fbe6e4",
  fontDisplay: `"Fraunces", "Iowan Old Style", serif`,
  fontBody: `"Inter", -apple-system, BlinkMacSystemFont, sans-serif`,
  fontMono: `"IBM Plex Mono", ui-monospace, monospace`,
};

const CONTENT_LIMIT = 2000;

function WritePost() {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" }); // type: "success" | "error"
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

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

    if (!content.trim() && !imageFile) {
      setStatus({ type: "error", text: "Add some words or a photo before posting" });
      return;
    }

    setLoading(true);
    setStatus({ type: "", text: "" });

    try {
      let image_url = "";
      if (imageFile) {
        image_url = await postService.uploadImage(imageFile);
      }
      const res = await postService.createPost({ content, image_url });

      if (res.success) {
        setStatus({ type: "success", text: "Posted — heading back to your feed" });
        setContent("");
        setImageFile(null);
        setImagePreview("");
        setTimeout(() => navigate("/home"), 1400);
      } else {
        setStatus({ type: "error", text: res.message || "Something went wrong" });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.response?.data?.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  const overLimit = content.length > CONTENT_LIMIT;

  return (
    <Box sx={{ bgcolor: T.paper, minHeight: "100vh", pt: 12, pb: 8, fontFamily: T.fontBody }}>
      <GlobalStyles
        styles={{
          "@import":
            "url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap')",
        }}
      />

      <Container maxWidth="sm">
        <Box sx={{ mb: 4 }}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              fontFamily: T.fontMono,
              fontSize: 12.5,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.emberInk,
              bgcolor: T.emberTint,
              px: 1.5,
              py: 0.6,
              borderRadius: "999px",
              mb: 2,
            }}
          >
            New post
          </Box>
          <Typography
            sx={{
              fontFamily: T.fontDisplay,
              fontWeight: 600,
              fontSize: { xs: 30, md: 38 },
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              color: T.ink,
            }}
          >
            Share something with your circle
          </Typography>
        </Box>

        <Fade in timeout={500}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "24px",
              border: `1px solid ${T.line}`,
              bgcolor: T.surface,
              boxShadow: "0 20px 50px -30px rgba(22,20,15,0.18)",
              overflow: "hidden",
            }}
          >
            <Box component="form" onSubmit={handleSubmit}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 3, pt: 3 }}>
                <Avatar
                  src={currentUser?.profile_image}
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: T.ember,
                    fontFamily: T.fontDisplay,
                    fontWeight: 600,
                  }}
                >
                  {currentUser?.username?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography sx={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 15.5, color: T.ink }}>
                    {currentUser?.username}
                  </Typography>
                  <Typography sx={{ fontFamily: T.fontMono, fontSize: 11, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Posting to your circle
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ px: 3, pt: 2.5 }}>
                <TextField
                  placeholder="What's on your mind?"
                  multiline
                  minRows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  fullWidth
                  variant="outlined"
                  disabled={loading}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "16px",
                      bgcolor: T.paper,
                      fontFamily: T.fontBody,
                      fontSize: 15.5,
                      color: T.ink,
                      "& fieldset": { border: `1px solid ${T.line}` },
                      "&:hover fieldset": { borderColor: T.inkFaint },
                      "&.Mui-focused fieldset": { borderColor: T.ember, borderWidth: "1.5px" },
                    },
                  }}
                />
                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.75 }}>
                  <Typography
                    sx={{
                      fontFamily: T.fontMono,
                      fontSize: 11,
                      color: overLimit ? T.error : T.inkFaint,
                    }}
                  >
                    {content.length} / {CONTENT_LIMIT}
                  </Typography>
                </Stack>
              </Box>

              {imagePreview && (
                <Box sx={{ px: 3, mt: 1 }}>
                  <Box
                    sx={{
                      position: "relative",
                      borderRadius: "16px",
                      overflow: "hidden",
                      border: `1px solid ${T.line}`,
                    }}
                  >
                    <IconButton
                      onClick={removeImage}
                      disabled={loading}
                      sx={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        bgcolor: "rgba(22,20,15,0.55)",
                        color: "#fff",
                        "&:hover": { bgcolor: "rgba(22,20,15,0.72)" },
                      }}
                    >
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="preview"
                      sx={{ width: "100%", maxHeight: 340, objectFit: "cover", display: "block" }}
                    />
                  </Box>
                </Box>
              )}

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ px: 3, py: 2.5, mt: 1, borderTop: `1px solid ${T.line}` }}
              >
                <Button
                  component="label"
                  startIcon={<PhotoCameraRoundedIcon sx={{ fontSize: "18px !important" }} />}
                  disabled={loading}
                  sx={{
                    borderRadius: "999px",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: 13.5,
                    px: 2,
                    py: 0.9,
                    color: T.emberInk,
                    bgcolor: T.emberTint,
                    "&:hover": { bgcolor: "#f6d4c4" },
                  }}
                >
                  {imagePreview ? "Change photo" : "Add photo"}
                  <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                </Button>

                <Button
                  type="submit"
                  disabled={loading || overLimit || (!content.trim() && !imageFile)}
                  sx={{
                    borderRadius: "999px",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 14.5,
                    px: 3.5,
                    py: 1.1,
                    bgcolor: T.ember,
                    color: "#fff8f4",
                    boxShadow: "0 10px 24px -10px rgba(224,67,31,0.65)",
                    "&:hover": { bgcolor: "#c93a19" },
                    "&.Mui-disabled": { bgcolor: T.line, color: T.inkFaint, boxShadow: "none" },
                  }}
                >
                  {loading ? <CircularProgress size={20} sx={{ color: "inherit" }} /> : "Post"}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Fade>

        {status.text && (
          <Fade in>
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{
                mt: 2.5,
                p: 2,
                borderRadius: "14px",
                bgcolor: status.type === "success" ? T.signalTint : T.errorTint,
                color: status.type === "success" ? T.signal : T.error,
              }}
            >
              {status.type === "success" ? (
                <CheckCircleRoundedIcon sx={{ fontSize: 20 }} />
              ) : (
                <ErrorOutlineRoundedIcon sx={{ fontSize: 20 }} />
              )}
              <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{status.text}</Typography>
            </Stack>
          </Fade>
        )}
      </Container>
    </Box>
  );
}

export default WritePost;