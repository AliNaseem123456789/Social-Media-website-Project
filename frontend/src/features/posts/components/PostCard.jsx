// src/features/posts/components/PostCard.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  ListItemIcon,
  ListItemText,
  Button,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Divider,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CommentIcon from "@mui/icons-material/Comment";
import ShareIcon from "@mui/icons-material/Share";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import PublicIcon from "@mui/icons-material/Public";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import PushPinRoundedIcon from "@mui/icons-material/PushPinRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { timeAgo } from "../../../utils/formatters";
import { postService } from "../services/postService";
import { useAuth } from "../../auth/context/AuthContext";

/**
 * Single post card used everywhere a post is rendered — main feed,
 * full post view, and My Posts. Edit/delete/pin are self-contained here
 * so every surface that renders a post gets them automatically instead
 * of needing its own copy of that logic (that split was what caused
 * MyPosts and the feed to drift into two different-looking cards, and
 * the delete flow to break: a second click while the first delete was
 * still in flight fired a duplicate DELETE at an already-gone post).
 *
 * Props:
 *  - post: the post object
 *  - onLike(postId, event): required for the like button
 *  - onDeleted(postId): optional — called after a successful delete so
 *    the parent list can remove it
 *  - onUpdated(postId, patch): optional — called after a successful edit
 *    so the parent list can merge in the new content/image
 *  - isOwn: optional override. If omitted, ownership is inferred by
 *    comparing post.user_id to the logged-in user's id. Pass this
 *    explicitly from screens where every post is guaranteed to belong
 *    to the viewer (e.g. My Posts) in case that endpoint's payload
 *    doesn't include user_id.
 *  - onComment / onShare: optional overrides; default behavior is
 *    navigating to the full post, and copy-link-to-clipboard.
 */
const PostCard = ({ post, onLike, onDeleted, onUpdated, isOwn: isOwnProp, onComment, onShare }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [localPost, setLocalPost] = useState(post);
  useEffect(() => setLocalPost(post), [post]);

  const [removed, setRemoved] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [copied, setCopied] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [pinning, setPinning] = useState(false);

  const postId = localPost.post_id || localPost.id;
  const formattedTime = localPost.created_at ? timeAgo(new Date(localPost.created_at)) : "Just now";
  const isLiked = localPost.liked === true || localPost.user_has_liked === true;

  const isOwn =
    typeof isOwnProp === "boolean"
      ? isOwnProp
      : currentUser?.id != null && String(localPost.user_id) === String(currentUser.id);

  if (removed) return null;

  const handleMenuOpen = (e) => setMenuAnchor(e.currentTarget);
  const handleMenuClose = () => setMenuAnchor(null);

  const handleShare = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (onShare) return onShare(localPost);
    const url = `${window.location.origin}/fullpost/${postId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
    }
  };

  const handleComment = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (onComment) return onComment(localPost);
    navigate(`/fullpost/${postId}`);
  };

  // ---------------- Edit ----------------
  const openEdit = () => {
    setEditContent(localPost.content || "");
    setEditImagePreview(localPost.image_url || "");
    setEditImageFile(null);
    setEditError("");
    setEditOpen(true);
    handleMenuClose();
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const saveEdit = async () => {
    if (!editContent.trim() && !editImagePreview) {
      setEditError("Add some content or an image");
      return;
    }
    setSavingEdit(true);
    setEditError("");
    try {
      let image_url = editImagePreview;
      if (editImageFile) {
        image_url = await postService.uploadImage(editImageFile);
      }
      const res = await postService.editPost(postId, { content: editContent, image_url });
      if (res.success || res.post) {
        const patch = { content: editContent, image_url };
        setLocalPost((prev) => ({ ...prev, ...patch }));
        onUpdated?.(postId, patch);
        setEditOpen(false);
      } else {
        setEditError(res.message || "Failed to update post");
      }
    } catch (err) {
      console.error("Error editing post:", err);
      setEditError(err.response?.data?.message || "Failed to update post");
    } finally {
      setSavingEdit(false);
    }
  };

  // ---------------- Delete ----------------
  const confirmDelete = async () => {
    if (deleting) return; // guards the double-click that caused the 404s
    setDeleting(true);
    try {
      const res = await postService.deletePost(postId);
      if (res.success !== false) {
        setDeleteOpen(false);
        setRemoved(true); // hide immediately even if the parent doesn't sync
        onDeleted?.(postId);
      }
    } catch (err) {
      console.error("Error deleting post:", err);
    } finally {
      setDeleting(false);
    }
  };

  // ---------------- Pin ----------------
  const togglePin = async () => {
    setPinning(true);
    handleMenuClose();
    try {
      const res = await postService.togglePinPost(postId);
      if (res.success) {
        setLocalPost((prev) => ({ ...prev, is_pinned: res.is_pinned }));
        onUpdated?.(postId, { is_pinned: res.is_pinned });
      }
    } catch (err) {
      console.error("Error toggling pin:", err);
    } finally {
      setPinning(false);
    }
  };

  const cardStyle = {
    mb: 3,
    borderRadius: "12px",
    border: "none",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    transition: "box-shadow 0.2s ease",
    bgcolor: "white",
    "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.12)" },
  };

  return (
    <Card sx={cardStyle}>
      <CardContent sx={{ p: "16px !important" }}>
        {/* HEADER */}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Link to={`/profile/${localPost.user_id}`} style={{ textDecoration: "none" }}>
            <Avatar
              src={localPost.avatar_url}
              sx={{ width: 40, height: 40, bgcolor: "#1877f2", border: "2px solid white", boxShadow: "0 2px 4px rgba(0,0,0,0.06)" }}
            >
              {localPost.username?.charAt(0)?.toUpperCase()}
            </Avatar>
          </Link>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Link to={`/profile/${localPost.user_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#050505", "&:hover": { textDecoration: "underline" } }}>
                  {localPost.username}
                </Typography>
              </Link>
              {localPost.is_pinned && (
                <Chip
                  icon={<PushPinRoundedIcon sx={{ fontSize: "13px !important" }} />}
                  label="Pinned"
                  size="small"
                  sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#eef3ff", color: "#1877f2" }}
                />
              )}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ color: "#65676b", fontSize: "0.75rem" }}>
                {formattedTime}
              </Typography>
              <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "#65676b" }} />
              <PublicIcon sx={{ fontSize: 12, color: "#65676b" }} />
            </Stack>
          </Box>

          <IconButton size="small" onClick={handleMenuOpen} sx={{ color: "#65676b" }}>
            <MoreHorizIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{ sx: { borderRadius: "12px", minWidth: 190 } }}
          >
            {isOwn
              ? [
                  <MenuItem key="edit" onClick={openEdit} sx={{ fontSize: "0.9rem", py: 1.1 }}>
                    <ListItemIcon sx={{ minWidth: 34 }}>
                      <EditRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit post</ListItemText>
                  </MenuItem>,
                  <MenuItem key="pin" onClick={togglePin} disabled={pinning} sx={{ fontSize: "0.9rem", py: 1.1 }}>
                    <ListItemIcon sx={{ minWidth: 34 }}>
                      <PushPinRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{localPost.is_pinned ? "Unpin post" : "Pin post"}</ListItemText>
                  </MenuItem>,
                  <Divider key="div" />,
                  <MenuItem
                    key="delete"
                    onClick={() => {
                      setDeleteOpen(true);
                      handleMenuClose();
                    }}
                    sx={{ fontSize: "0.9rem", py: 1.1, color: "#d32f2f" }}
                  >
                    <ListItemIcon sx={{ minWidth: 34, color: "#d32f2f" }}>
                      <DeleteRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Delete post</ListItemText>
                  </MenuItem>,
                ]
              : [
                  <MenuItem key="save" onClick={handleMenuClose} sx={{ fontSize: "0.9rem", py: 1.1 }}>
                    <ListItemIcon sx={{ minWidth: 34 }}>
                      <BookmarkBorderRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Save post</ListItemText>
                  </MenuItem>,
                  <MenuItem key="hide" onClick={handleMenuClose} sx={{ fontSize: "0.9rem", py: 1.1 }}>
                    <ListItemIcon sx={{ minWidth: 34 }}>
                      <VisibilityOffRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Hide post</ListItemText>
                  </MenuItem>,
                  <MenuItem key="report" onClick={handleMenuClose} sx={{ fontSize: "0.9rem", py: 1.1, color: "#c00" }}>
                    <ListItemIcon sx={{ minWidth: 34, color: "#c00" }}>
                      <FlagRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Report post</ListItemText>
                  </MenuItem>,
                ]}
          </Menu>
        </Stack>

        {/* CONTENT */}
        <Box component={Link} to={`/fullpost/${postId}`} sx={{ textDecoration: "none", color: "inherit", display: "block" }}>
          {localPost.content && (
            <Typography variant="body2" sx={{ mb: 1.5, color: "#1c1e21", fontSize: "0.95rem", lineHeight: 1.6, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
              {localPost.content}
            </Typography>
          )}

          {localPost.image_url && (
            <Box sx={{ borderRadius: "8px", overflow: "hidden", mb: 1.5, border: "1px solid #e4e6eb", bgcolor: "#f0f2f5" }}>
              <img
                src={localPost.image_url}
                alt="Post content"
                loading="lazy"
                style={{ width: "100%", display: "block", maxHeight: "500px", objectFit: "cover" }}
              />
            </Box>
          )}
        </Box>

        {/* REACTIONS BAR */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: "1px solid #e4e6eb", mb: 0.5 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                bgcolor: "#1877f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <ThumbUpAltIcon sx={{ fontSize: 11 }} />
            </Box>
            <Typography variant="caption" sx={{ color: "#65676b", fontWeight: 600 }}>
              {localPost.total_likes || 0}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "#65676b" }}>
              {localPost.comments?.length || 0} comments
            </Typography>
          </Stack>
        </Stack>

        {/* ACTION BUTTONS */}
        <Stack direction="row" spacing={0.5} sx={{ pt: 0.5 }}>
          <Button
            fullWidth
            onClick={(e) => onLike(postId, e)}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              color: isLiked ? "#1877f2" : "#65676b",
              py: 0.75,
              "&:hover": { bgcolor: isLiked ? "rgba(24,119,242,0.08)" : "rgba(0,0,0,0.04)" },
            }}
            startIcon={isLiked ? <ThumbUpAltIcon sx={{ fontSize: 20, color: "#1877f2" }} /> : <ThumbUpOffAltIcon sx={{ fontSize: 20 }} />}
          >
            {isLiked ? "Liked" : "Like"}
          </Button>

          <Button
            fullWidth
            onClick={handleComment}
            sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600, fontSize: "0.875rem", color: "#65676b", py: 0.75, "&:hover": { bgcolor: "rgba(0,0,0,0.04)" } }}
            startIcon={<CommentIcon sx={{ fontSize: 20 }} />}
          >
            Comment
          </Button>

          <Tooltip title="Link copied" open={copied} placement="top" arrow>
            <Button
              fullWidth
              onClick={handleShare}
              sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600, fontSize: "0.875rem", color: "#65676b", py: 0.75, "&:hover": { bgcolor: "rgba(0,0,0,0.04)" } }}
              startIcon={copied ? <CheckRoundedIcon sx={{ fontSize: 20, color: "#31c48d" }} /> : <ShareIcon sx={{ fontSize: 20 }} />}
            >
              Share
            </Button>
          </Tooltip>
        </Stack>
      </CardContent>

      {/* ---------------- Edit dialog ---------------- */}
      <Dialog open={editOpen} onClose={() => !savingEdit && setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "18px" } }}>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Edit post
          <IconButton size="small" onClick={() => setEditOpen(false)} disabled={savingEdit}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            placeholder="What's on your mind?"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            disabled={savingEdit}
            sx={{ mb: 2, mt: 0.5 }}
          />

          {editImagePreview && (
            <Box sx={{ position: "relative", mb: 2 }}>
              <Box component="img" src={editImagePreview} alt="" sx={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: "12px", display: "block" }} />
              <IconButton
                size="small"
                onClick={() => {
                  setEditImagePreview("");
                  setEditImageFile(null);
                }}
                disabled={savingEdit}
                sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(0,0,0,0.55)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.7)" } }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <Button component="label" variant="outlined" startIcon={<PhotoCameraRoundedIcon />} disabled={savingEdit} sx={{ borderRadius: "10px", textTransform: "none" }}>
            {editImagePreview ? "Change image" : "Add image"}
            <input type="file" accept="image/*" hidden onChange={handleEditImageChange} />
          </Button>

          {editError && (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 1.5 }}>
              {editError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditOpen(false)} disabled={savingEdit} sx={{ textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={saveEdit}
            variant="contained"
            disableElevation
            disabled={savingEdit || (!editContent.trim() && !editImagePreview)}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px", bgcolor: "#1877f2", "&:hover": { bgcolor: "#166fe5" } }}
          >
            {savingEdit ? <CircularProgress size={20} color="inherit" /> : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- Delete confirmation ---------------- */}
      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} PaperProps={{ sx: { borderRadius: "18px", maxWidth: 380 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete this post?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This can't be undone. The post and its comments will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting} sx={{ textTransform: "none", fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={deleting}
            variant="contained"
            disableElevation
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px", bgcolor: "#d32f2f", "&:hover": { bgcolor: "#b71c1c" } }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PostCard;