// src/features/posts/components/ProfilePostCard.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Stack,
  Box,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Collapse,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CommentIcon from "@mui/icons-material/Comment";
import ShareIcon from "@mui/icons-material/Share";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PushPinIcon from "@mui/icons-material/PushPin";
import SendIcon from "@mui/icons-material/Send";
import { timeAgo } from "../../../utils/formatters";
import { T } from "../../../styles/circleTokens";
import { postService } from "../services/postService";

const ProfilePostCard = ({
  post,
  onLike,
  onDelete,
  onEdit,
  onPin,
  isOwnProfile = false,
  compact = true,
  showFullImage = false,
  onCommentAdded,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [localComments, setLocalComments] = useState(post.comments || []);
  const [likesCount, setLikesCount] = useState(post.total_likes || 0);
  const [isLiked, setIsLiked] = useState(post.liked === true || post.user_has_liked === true);

  const postId = post.post_id || post.id;
  const formattedTime = post.created_at
    ? timeAgo(new Date(post.created_at))
    : "Just now";

  const avatarUrl =
    post.user?.profile_image ||
    post.avatar_url ||
    post.profile_image ||
    post.user?.avatar_url;

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleDeleteConfirm = async () => {
    try {
      await postService.deletePost(postId);
      if (onDelete) onDelete(postId);
      setSnackbar({ open: true, message: "Post deleted successfully", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to delete post", severity: "error" });
    }
    setShowDeleteDialog(false);
    handleMenuClose();
  };

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await postService.likePost(postId);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      if (onLike) onLike(postId);
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to like post", severity: "error" });
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const response = await postService.addComment(postId, commentText);
      const newComment = {
        id: response.comment_id || Date.now(),
        content: commentText,
        user: {
          username: "You",
          profile_image: null,
        },
        created_at: new Date().toISOString(),
      };
      setLocalComments(prev => [...prev, newComment]);
      setCommentText("");
      if (onCommentAdded) onCommentAdded(postId, newComment);
      setSnackbar({ open: true, message: "Comment added successfully", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to add comment", severity: "error" });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handlePin = async () => {
    try {
      await postService.togglePinPost(postId);
      if (onPin) onPin(postId);
      setSnackbar({ open: true, message: post.is_pinned ? "Post unpinned" : "Post pinned", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to update pin status", severity: "error" });
    }
    handleMenuClose();
  };

  const cardStyle = {
    mb: 2,
    width: "100%",
    minWidth: 0,
    borderRadius: "16px",
    border: `1px solid ${T.line}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "all 0.2s ease",
    bgcolor: T.surface,
    "&:hover": {
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      borderColor: T.lineHover,
    },
  };

  return (
    <>
      <Card sx={cardStyle}>
        <CardContent
          sx={{
            p: compact ? "16px !important" : "20px !important",
            "&:last-child": { pb: compact ? "16px !important" : "20px !important" },
            minWidth: 0,
          }}
        >
          {/* HEADER */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={1.5}
            sx={{ minWidth: 0 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              <Link to={`/profile/${post.user_id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                <Avatar
                  src={avatarUrl}
                  sx={{
                    width: compact ? 36 : 44,
                    height: compact ? 36 : 44,
                    bgcolor: T.ember,
                    fontSize: compact ? 14 : 16,
                    fontWeight: 600,
                    border: `2px solid ${T.surface}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  {!avatarUrl && (post.username || post.user?.username)?.charAt(0)?.toUpperCase() || "U"}
                </Avatar>
              </Link>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  noWrap
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    fontSize: compact ? "0.9rem" : "1rem",
                    color: T.ink,
                    maxWidth: "100%",
                  }}
                >
                  {post.username || post.user?.username || "Unknown User"}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ color: T.inkFaint, whiteSpace: "nowrap" }}>
                    {formattedTime}
                  </Typography>
                  {post.is_pinned && (
                    <Chip
                      label="Pinned"
                      size="small"
                      icon={<PushPinIcon sx={{ fontSize: 12 }} />}
                      sx={{
                        height: 18,
                        fontSize: "0.6rem",
                        bgcolor: T.emberTint,
                        color: T.emberInk,
                        "& .MuiChip-icon": { fontSize: 12, ml: 0.5 },
                      }}
                    />
                  )}
                </Stack>
              </Box>
            </Stack>

            {isOwnProfile && (
              <>
                <IconButton
                  onClick={handleMenuOpen}
                  size="small"
                  sx={{
                    color: T.inkFaint,
                    flexShrink: 0,
                    "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                  }}
                >
                  <MoreHorizIcon sx={{ fontSize: 20 }} />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={!!anchorEl}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem onClick={() => { handleMenuClose(); onEdit?.(post); }}>
                    <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Edit
                  </MenuItem>
                  <MenuItem onClick={handlePin}>
                    <PushPinIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {post.is_pinned ? "Unpin" : "Pin"}
                  </MenuItem>
                  <MenuItem
                    onClick={() => { handleMenuClose(); setShowDeleteDialog(true); }}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Delete
                  </MenuItem>
                </Menu>
              </>
            )}
          </Stack>

          {/* CONTENT */}
          <Link to={`/fullpost/${postId}`} style={{ textDecoration: "none", color: "inherit" }}>
            <Typography
              variant="body2"
              sx={{
                mb: 1.5,
                color: T.ink,
                fontSize: compact ? "0.9rem" : "1rem",
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: compact ? 3 : 5,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {post.content}
            </Typography>

            {post.image_url && (
              <Box
                sx={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  mb: 1.5,
                  border: `1px solid ${T.line}`,
                  maxHeight: compact ? 200 : 350,
                  width: "100%",
                  position: "relative",
                }}
              >
                <img
                  src={post.image_url}
                  alt="Post content"
                  style={{
                    width: "100%",
                    display: "block",
                    maxHeight: compact ? 200 : 350,
                    objectFit: "cover",
                  }}
                  loading="lazy"
                />
              </Box>
            )}
          </Link>

          {/* INTERACTIONS */}
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{
              pt: 1,
              borderTop: `1px solid ${T.line}`,
              mt: 0.5,
              minWidth: 0,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <IconButton
                onClick={handleLike}
                size="small"
                sx={{
                  color: isLiked ? "#ff4757" : T.inkFaint,
                  p: 0.5,
                  "&:hover": { bgcolor: "rgba(255,71,87,0.08)" },
                }}
              >
                {isLiked ? (
                  <FavoriteIcon sx={{ fontSize: compact ? 18 : 20 }} />
                ) : (
                  <FavoriteBorderIcon sx={{ fontSize: compact ? 18 : 20 }} />
                )}
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: T.inkFaint,
                  minWidth: 20,
                  fontSize: compact ? "0.75rem" : "0.8rem",
                }}
              >
                {likesCount}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <IconButton
                size="small"
                onClick={() => setShowComments(!showComments)}
                sx={{
                  color: T.inkFaint,
                  p: 0.5,
                  "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                }}
              >
                <CommentIcon sx={{ fontSize: compact ? 18 : 20 }} />
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: T.inkFaint,
                  minWidth: 20,
                  fontSize: compact ? "0.75rem" : "0.8rem",
                }}
              >
                {localComments.length}
              </Typography>
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            <IconButton size="small" sx={{ color: T.inkFaint, p: 0.5 }}>
              <ShareIcon sx={{ fontSize: compact ? 18 : 20 }} />
            </IconButton>
          </Stack>

          {/* COMMENTS SECTION */}
          <Collapse in={showComments}>
            <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${T.line}`, minWidth: 0 }}>
              {localComments.slice(0, 2).map((comment) => (
                <Box key={comment.id || comment.comment_id} sx={{ display: "flex", gap: 1, mb: 1, minWidth: 0 }}>
                  <Avatar
                    src={comment.user?.profile_image || comment.avatar_url}
                    sx={{ width: 24, height: 24, fontSize: 10, flexShrink: 0 }}
                  >
                    {comment.user?.username?.charAt(0) || "U"}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {comment.user?.username || comment.username || "Unknown"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: T.inkSoft,
                        display: "block",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {comment.comment_text || comment.content}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {localComments.length > 2 && (
                <Typography 
                  variant="caption" 
                  sx={{ color: T.emberInk, cursor: "pointer" }}
                  onClick={() => window.location.href = `/fullpost/${postId}`}
                >
                  View all {localComments.length} comments
                </Typography>
              )}
              
              {/* Comment Input */}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <TextField
                  size="small"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCommentSubmit();
                    }
                  }}
                  sx={{
                    flex: 1,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                      bgcolor: T.background,
                    },
                  }}
                />
                <IconButton
                  onClick={handleCommentSubmit}
                  disabled={!commentText.trim() || isSubmittingComment}
                  sx={{
                    color: T.ember,
                    "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Post?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This action cannot be undone. Are you sure you want to delete this post?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProfilePostCard;