// src/features/posts/pages/PostDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import { postService } from "../services/postService";
import PostCard from "../components/PostCard";
import { useAuth } from "../../auth/context/AuthContext";
import {
  Typography,
  Avatar,
  Box,
  TextField,
  Button,
  Stack,
  Container,
  Paper,
  Divider,
  Fade,
  Skeleton,
  IconButton,
  Chip,
  Tooltip,
  Zoom,
  Fab,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import InsertEmoticonRoundedIcon from "@mui/icons-material/InsertEmoticonRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import { timeAgo } from "../../../utils/formatters";

/* ------------------------------------------------------------------ *
 * Design tokens — a single, cohesive premium palette.
 * ------------------------------------------------------------------ */
const T = {
  brand: "#6366f1",
  brandDark: "#4f46e5",
  brandSoft: "#eef2ff",
  brandRing: "rgba(99,102,241,0.12)",
  ink: "#0f172a",
  body: "#475569",
  muted: "#94a3b8",
  faint: "#cbd5e1",
  line: "#eef1f6",
  surface: "#ffffff",
  canvasTop: "#f6f7fb",
  canvasBottom: "#eef0f6",
  bubble: "#f6f7f9",
  danger: "#ef4444",
  shadowSm: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
  shadowMd: "0 4px 24px rgba(15,23,42,0.06)",
  shadowLg: "0 20px 60px -20px rgba(15,23,42,0.18)",
  radius: "20px",
};

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "😮"];

/* Shared page shell so loading / empty / loaded states stay consistent */
function PageShell({ children }) {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${T.canvasTop} 0%, ${T.canvasBottom} 100%)`,
      }}
    >
      <Sidebar />
      {children}
    </Box>
  );
}

function PostDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();
  const username = currentUser?.username;
  const userAvatar = currentUser?.profile_image;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [likedComments, setLikedComments] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const data = await postService.getFullPost(id);
        setPost(data);
        if (data?.comments) {
          const likes = {};
          data.comments.forEach((c) => {
            likes[c.comment_id] = c.liked_by_me || false;
          });
          setLikedComments(likes);
        }
      } catch (error) {
        console.error("Error loading full post:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadPost();
  }, [id]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !isAuthenticated) return;
    setPosting(true);
    try {
      const result = await postService.addComment(id, newComment);
      setPost((prev) => ({
        ...prev,
        comments: [
          {
            ...result.comment,
            username: username,
            profile_image: userAvatar,
            total_likes: 0,
            liked_by_me: false,
          },
          ...(prev.comments || []),
        ],
      }));
      setNewComment("");
      setSnackbar({ open: true, message: "Comment posted!", severity: "success" });
    } catch (error) {
      console.error("Error adding comment:", error);
      setSnackbar({ open: true, message: "Couldn't post comment", severity: "error" });
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await postService.likePost(postId);
      if (res.success) {
        setPost((prev) => ({
          ...prev,
          total_likes: res.total_likes,
          liked: res.liked,
        }));
      }
    } catch (err) {
      console.error("Error liking post");
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      setLikedComments((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
      setPost((prev) => ({
        ...prev,
        comments: prev.comments.map((c) =>
          c.comment_id === commentId
            ? {
                ...c,
                total_likes: (c.total_likes || 0) + (likedComments[commentId] ? -1 : 1),
                liked_by_me: !likedComments[commentId],
              }
            : c
        ),
      }));
      await postService.toggleCommentLike?.(commentId);
    } catch (err) {
      setLikedComments((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
      setSnackbar({ open: true, message: "Couldn't like comment", severity: "error" });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  /* ----------------------------- LOADING ---------------------------- */
  if (loading) {
    return (
      <PageShell>
        <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
          <Stack spacing={3}>
            <Skeleton variant="rounded" width={80} height={32} sx={{ borderRadius: "999px" }} />
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: T.radius, border: `1px solid ${T.line}`, bgcolor: T.surface }}
            >
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Skeleton variant="circular" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="55%" height={18} />
                  <Skeleton width="35%" height={14} />
                </Box>
              </Stack>
              <Skeleton width="92%" height={16} />
              <Skeleton width="70%" height={16} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: "16px" }} />
            </Paper>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: T.radius, border: `1px solid ${T.line}`, bgcolor: T.surface }}
            >
              <Skeleton width="30%" height={22} sx={{ mb: 3 }} />
              {[1, 2, 3].map((i) => (
                <Stack key={i} direction="row" spacing={2} sx={{ mb: 2.5 }}>
                  <Skeleton variant="circular" width={38} height={38} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="rounded" height={62} sx={{ borderRadius: "0 16px 16px 16px" }} />
                  </Box>
                </Stack>
              ))}
            </Paper>
          </Stack>
        </Container>
      </PageShell>
    );
  }

  /* ---------------------------- NOT FOUND --------------------------- */
  if (!post) {
    return (
      <PageShell>
        <Container maxWidth="sm" sx={{ py: 16, textAlign: "center" }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: T.radius,
              bgcolor: T.surface,
              border: `1px solid ${T.line}`,
              boxShadow: T.shadowMd,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "20px",
                bgcolor: T.brandSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
              }}
            >
              <ForumRoundedIcon sx={{ fontSize: 34, color: T.brand }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: T.ink, letterSpacing: "-0.02em" }}>
              Post not found
            </Typography>
            <Typography sx={{ color: T.body, mb: 3.5 }}>
              It may have been removed, or the link is broken.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate("/home")}
              disableElevation
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                px: 3,
                py: 1,
                bgcolor: T.brand,
                "&:hover": { bgcolor: T.brandDark },
              }}
            >
              Go home
            </Button>
          </Paper>
        </Container>
      </PageShell>
    );
  }

  const commentCount = post.comments?.length || 0;

  /* ------------------------------ LOADED ---------------------------- */
  return (
    <PageShell>
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 } }}>
        <Fade in timeout={500}>
          <Box>
            {/* Sticky header: back + title */}
            <Box
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                mx: { xs: -2, sm: -3 },
                px: { xs: 2, sm: 3 },
                py: 1.5,
                mb: 3,
                backdropFilter: "blur(12px)",
                background: "rgba(246,247,251,0.75)",
                borderBottom: `1px solid ${T.line}`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <IconButton
                  onClick={() => navigate(-1)}
                  aria-label="Go back"
                  sx={{
                    bgcolor: T.surface,
                    border: `1px solid ${T.line}`,
                    boxShadow: T.shadowSm,
                    color: T.body,
                    "&:hover": { color: T.ink, borderColor: T.faint },
                  }}
                >
                  <ArrowBackRoundedIcon fontSize="small" />
                </IconButton>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.1 }}
                  >
                    Discussion
                  </Typography>
                  <Typography variant="caption" sx={{ color: T.muted, fontWeight: 600 }}>
                    {commentCount} {commentCount === 1 ? "comment" : "comments"}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Post Card */}
            <PostCard post={post} onLike={handleLike} />

            {/* Comments Section */}
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                borderRadius: T.radius,
                p: { xs: 2.5, sm: 3 },
                bgcolor: T.surface,
                border: `1px solid ${T.line}`,
                boxShadow: T.shadowMd,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: T.ink, letterSpacing: "-0.01em" }}>
                  Comments
                </Typography>
                <Chip
                  label={commentCount}
                  size="small"
                  sx={{
                    height: 22,
                    bgcolor: T.brandSoft,
                    color: T.brandDark,
                    fontWeight: 800,
                    fontSize: "0.72rem",
                  }}
                />
              </Stack>

              {/* Comment Input */}
              <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
                <Avatar
                  src={userAvatar}
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: T.brand,
                    fontWeight: 700,
                    border: "2px solid white",
                    boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                  }}
                >
                  {username?.charAt(0).toUpperCase() || "U"}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      bgcolor: T.bubble,
                      borderRadius: "16px",
                      border: `1px solid ${T.line}`,
                      transition: "all 0.2s ease",
                      "&:focus-within": {
                        borderColor: T.brand,
                        bgcolor: T.surface,
                        boxShadow: `0 0 0 4px ${T.brandRing}`,
                      },
                    }}
                  >
                    <TextField
                      inputRef={inputRef}
                      fullWidth
                      multiline
                      maxRows={4}
                      variant="standard"
                      placeholder={
                        isAuthenticated ? "Share your thoughts..." : "Log in to join the conversation"
                      }
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={!isAuthenticated || posting}
                      InputProps={{
                        disableUnderline: true,
                        sx: { fontSize: "0.95rem", color: T.ink, px: 2, py: 1.5 },
                      }}
                    />

                    {isAuthenticated && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.25,
                          px: 1.5,
                          pb: 1,
                          pt: 0.5,
                          borderTop: `1px solid ${T.line}`,
                        }}
                      >
                        {QUICK_EMOJIS.map((emoji) => (
                          <Tooltip key={emoji} title={`Add ${emoji}`} arrow>
                            <IconButton
                              size="small"
                              onClick={() => setNewComment((prev) => (prev + emoji).slice(0, 500))}
                              sx={{
                                fontSize: "1.15rem",
                                borderRadius: "10px",
                                p: 0.75,
                                transition: "transform 0.15s ease",
                                "&:hover": { bgcolor: T.brandRing, transform: "scale(1.15)" },
                              }}
                            >
                              {emoji}
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.25 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: newComment.length > 400 ? T.danger : T.muted, fontWeight: 700 }}
                    >
                      {newComment.length}/500
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleAddComment}
                      disabled={!isAuthenticated || posting || !newComment.trim()}
                      endIcon={
                        posting ? (
                          <CircularProgress size={15} color="inherit" />
                        ) : (
                          <SendRoundedIcon sx={{ fontSize: 18 }} />
                        )
                      }
                      disableElevation
                      sx={{
                        borderRadius: "999px",
                        textTransform: "none",
                        fontWeight: 700,
                        px: 2.75,
                        py: 0.85,
                        bgcolor: T.brand,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: T.brandDark,
                          boxShadow: "0 6px 18px rgba(99,102,241,0.35)",
                          transform: "translateY(-1px)",
                        },
                        "&.Mui-disabled": { bgcolor: "#eef1f6", color: T.faint },
                      }}
                    >
                      {posting ? "Posting..." : "Post"}
                    </Button>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 3, borderColor: T.line }} />

              {/* Comments List */}
              {commentCount > 0 ? (
                <Stack spacing={2.75}>
                  {post.comments.map((c) => {
                    const isLiked = likedComments[c.comment_id];
                    return (
                      <Box key={c.comment_id} sx={{ display: "flex", gap: 2 }}>
                        <Avatar
                          src={c.profile_image}
                          sx={{
                            width: 38,
                            height: 38,
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            bgcolor: T.brandSoft,
                            color: T.brandDark,
                            border: "2px solid white",
                            boxShadow: T.shadowSm,
                          }}
                        >
                          {c.username?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box
                            sx={{
                              bgcolor: T.bubble,
                              p: 2,
                              borderRadius: "4px 16px 16px 16px",
                              border: `1px solid ${T.line}`,
                              display: "inline-block",
                              minWidth: "150px",
                              maxWidth: "100%",
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: T.ink }}>
                                {c.username}
                              </Typography>
                              {c.user_id === post.user_id && (
                                <Chip
                                  label="Author"
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: "0.6rem",
                                    bgcolor: T.brand,
                                    color: "white",
                                    fontWeight: 800,
                                    "& .MuiChip-label": { px: 0.9 },
                                  }}
                                />
                              )}
                            </Stack>
                            <Typography variant="body2" sx={{ color: T.body, lineHeight: 1.6, wordBreak: "break-word" }}>
                              {c.comment_text}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.75, ml: 0.5 }}>
                            <Typography variant="caption" sx={{ color: T.muted, fontWeight: 600 }}>
                              {c.created_at ? timeAgo(new Date(c.created_at)) : "just now"}
                            </Typography>

                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                              role="button"
                              aria-label="Like comment"
                              onClick={() => handleLikeComment(c.comment_id)}
                              sx={{
                                cursor: "pointer",
                                color: isLiked ? T.danger : T.muted,
                                transition: "color 0.2s ease, transform 0.15s ease",
                                "&:hover": { color: T.danger, transform: "translateY(-1px)" },
                              }}
                            >
                              {isLiked ? (
                                <FavoriteRoundedIcon sx={{ fontSize: 16 }} />
                              ) : (
                                <FavoriteBorderRoundedIcon sx={{ fontSize: 16 }} />
                              )}
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {c.total_likes || 0}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Box
                    sx={{
                      width: 68,
                      height: 68,
                      borderRadius: "20px",
                      bgcolor: T.brandSoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 2,
                    }}
                  >
                    <InsertEmoticonRoundedIcon sx={{ fontSize: 32, color: T.brand }} />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: T.ink }}>
                    No comments yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: T.muted, mt: 0.5 }}>
                    Be the first to start the conversation!
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Fade>
      </Container>

      {/* Scroll to Top */}
      <Zoom in={showScrollTop}>
        <Fab
          size="small"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            bgcolor: T.brand,
            color: "white",
            boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
            "&:hover": { bgcolor: T.brandDark, boxShadow: "0 12px 32px rgba(99,102,241,0.5)" },
          }}
        >
          <KeyboardArrowUpRoundedIcon />
        </Fab>
      </Zoom>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: "12px", fontWeight: 600, boxShadow: T.shadowLg }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageShell>
  );
}

export default PostDetails;
