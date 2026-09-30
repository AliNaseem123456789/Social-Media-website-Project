import { memo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Bookmark,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Quote,
  Repeat2,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import RichText from "../../../components/ui/RichText";
import PostGallery from "../../../components/ui/PostGallery";
import LinkPreviewCard from "../../../components/ui/LinkPreviewCard";
import { useAuth } from "../../auth/context/AuthContext";
import { useModerationMenuItems } from "../../moderation/components/ModerationMenuItems";
import { useToast } from "../../../context/ToastContext";
import { compactNumber, fullDate, timeAgo } from "../../../lib/format";
import { findAppLink } from "../../../lib/shareService";
import { tokens } from "../../../theme/tokens";
import { useDeletePost, useToggleLike, useTogglePin, useToggleRepost, useToggleSave } from "../hooks";
import PostEditorDialog from "./PostEditorDialog";

const COLLAPSE_AT = 420;
const QUOTE_AT = 220;
const MAX_QUOTE_LENGTH = 5000;

const softFill = (color, percent) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

function ActionButton({ icon: Icon, label, count, active, activeColor, onClick, disabled, component, to }) {
  const reduced = useReducedMotion();
  return (
    <Box
      component={component || "button"}
      to={to}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        border: 0,
        bgcolor: "transparent",
        cursor: "pointer",
        px: { xs: 1, sm: 1.25 },
        py: 0.75,
        borderRadius: 999,
        color: active ? activeColor : tokens.inkSoft,
        fontWeight: 600,
        fontSize: "0.85rem",
        fontFamily: "inherit",
        textDecoration: "none",
        transition: "background-color .15s, color .15s",
        // Each action previews its own colour on hover, so the row reads as five distinct things.
        "&:hover": {
          bgcolor: softFill(activeColor ?? tokens.ink, active ? 14 : 8),
          color: activeColor ?? tokens.ink,
        },
        "&:focus-visible": { outline: `2px solid ${tokens.ink}`, outlineOffset: 2 },
        "&:disabled": { opacity: 0.5, cursor: "default" },
        "&:active svg": { transform: "scale(0.82)" },
        "& svg": { transition: "transform .12s ease" },
      }}
    >
      <Box
        component={motion.span}
        sx={{ display: "inline-flex" }}
        animate={reduced ? undefined : { scale: active ? [1, 1.35, 1] : 1 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <Icon size={18} strokeWidth={2} fill={active ? "currentColor" : "none"} />
      </Box>
      {count !== undefined && count > 0 && <span>{compactNumber(count)}</span>}
    </Box>
  );
}

/**
 * The post a repost points at. It is one link to the original, so the text stays plain rather than
 * nesting the hashtag and mention links a RichText body would add.
 */
function QuotedPost({ post, compact = false }) {
  const image = post.images?.[0]?.url ?? post.imageUrl ?? null;
  const content = post.content || "";
  const text = content.length > QUOTE_AT ? `${content.slice(0, QUOTE_AT).trimEnd()}...` : content;

  return (
    <Card
      component={RouterLink}
      to={`/posts/${post.id}`}
      sx={{
        display: "block",
        mt: compact ? 1 : 1.5,
        p: 1.5,
        textDecoration: "none",
        bgcolor: tokens.paper,
        transition: "border-color .2s",
        "&:hover": { borderColor: tokens.inkFaint },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
        <UserAvatar user={post.author} size={22} />
        <Typography sx={{ color: tokens.ink, fontWeight: 700, fontSize: "0.85rem", minWidth: 0 }} noWrap>
          {post.author?.username}
        </Typography>
        <Typography variant="caption" sx={{ flexShrink: 0 }}>
          {timeAgo(post.createdAt)}
        </Typography>
      </Stack>

      {text && (
        <Typography
          variant="body2"
          sx={{ mt: 0.75, color: tokens.inkSoft, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {text}
        </Typography>
      )}

      {image && (
        <Box
          component="img"
          src={image}
          alt={post.images?.[0]?.alt || ""}
          loading="lazy"
          sx={{
            display: "block",
            width: "100%",
            mt: 1,
            maxHeight: compact ? 130 : 190,
            objectFit: "cover",
            borderRadius: 2,
            border: `1px solid ${tokens.lineSoft}`,
          }}
        />
      )}
    </Card>
  );
}

function RepostDialog({ original, pending, onClose, onSubmit }) {
  const [quoting, setQuoting] = useState(false);
  const [text, setText] = useState("");

  return (
    <Dialog open onClose={pending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle component="div">
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <span>{quoting ? "Repost with a comment" : "Share this post"}</span>
          <IconButton onClick={onClose} aria-label="Close" disabled={pending}>
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {quoting ? (
          <>
            <TextField
              autoFocus
              multiline
              minRows={3}
              maxRows={8}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Add your thoughts"
              slotProps={{ htmlInput: { maxLength: MAX_QUOTE_LENGTH } }}
            />
            <QuotedPost post={original} compact />
            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
              <Button variant="text" onClick={() => setQuoting(false)} disabled={pending}>
                Back
              </Button>
              <Button variant="contained" disabled={pending} onClick={() => onSubmit(text.trim())}>
                Repost
              </Button>
            </Stack>
          </>
        ) : (
          <Stack spacing={1.25} sx={{ pb: 1 }}>
            <Button
              variant="contained"
              startIcon={<Repeat2 size={17} />}
              disabled={pending}
              onClick={() => onSubmit("")}
            >
              Repost
            </Button>
            <Button variant="outlined" startIcon={<Quote size={16} />} disabled={pending} onClick={() => setQuoting(true)}>
              Repost with a comment
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PostCard({ post, detailed = false, fromSaved = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [expanded, setExpanded] = useState(detailed);

  const toggleLike = useToggleLike();
  const togglePin = useTogglePin();
  const toggleSave = useToggleSave();
  const toggleRepost = useToggleRepost();
  const deletePost = useDeletePost();
  const moderation = useModerationMenuItems({
    user: post.author,
    subject: { type: "post", id: post.id, label: `@${post.author?.username}'s post` },
    onClose: () => setMenuAnchor(null),
  });

  const isOwner = user?.id === post.author?.id;
  const long = (post.content?.length || 0) > COLLAPSE_AT;
  const text = expanded || !long ? post.content : `${post.content.slice(0, COLLAPSE_AT).trimEnd()}...`;
  const postUrl = `/posts/${post.id}`;
  const images = post.images?.length ? post.images : post.imageUrl ? [{ url: post.imageUrl, alt: "" }] : [];
  const appLink = images.length ? null : findAppLink(post.content);
  const quoted = post.repostOf;

  const shareUrl = () => `${window.location.origin}${postUrl}`;

  const share = async () => {
    const url = shareUrl();
    try {
      if (navigator.share) await navigator.share({ url, title: `${post.author?.username} on Circle` });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      return undefined;
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const save = () => toggleSave.mutate({ id: post.id, saved: post.savedByMe, fromSaved });

  const repost = () => {
    if (post.repostedByMe) toggleRepost.mutate({ id: post.id, reposted: true });
    else setReposting(true);
  };

  const closeMenu = () => setMenuAnchor(null);

  return (
    <Card
      component="article"
      sx={{
        position: "relative",
        p: { xs: 2, sm: 2.5 },
        overflow: "hidden",
        transition: "border-color .2s ease, box-shadow .2s ease, transform .2s ease",
        "&:hover": detailed
          ? undefined
          : {
              borderColor: tokens.inkFaint,
              boxShadow: tokens.shadow.raised,
              transform: "translateY(-2px)",
            },
        "&:focus-within": { borderColor: tokens.inkFaint },
        // A pinned post carries a thin accent down its leading edge instead of relying on the chip alone.
        ...(post.isPinned && {
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            bgcolor: tokens.ember,
          },
        }),
      }}
    >
      {quoted && (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 1.25, color: tokens.inkFaint }}>
          <Repeat2 size={14} />
          <Typography variant="caption">Reposted by {post.author?.username}</Typography>
        </Stack>
      )}

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <RouterLink to={`/u/${post.author?.id}`} aria-label={post.author?.username}>
          <UserAvatar user={post.author} size={42} />
        </RouterLink>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1, minHeight: 34 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline", minWidth: 0 }}>
                <Link
                  component={RouterLink}
                  to={`/u/${post.author?.id}`}
                  underline="hover"
                  sx={{ color: tokens.ink, fontWeight: 700, fontSize: "0.95rem" }}
                  noWrap
                >
                  {post.author?.username}
                </Link>
                <Typography component="span" sx={{ color: tokens.inkFaint, fontSize: "0.85rem" }}>
                  ·
                </Typography>
                <Tooltip title={fullDate(post.createdAt)} placement="bottom-start">
                  <Typography
                    component={RouterLink}
                    to={postUrl}
                    sx={{
                      textDecoration: "none",
                      color: tokens.inkFaint,
                      fontSize: "0.85rem",
                      whiteSpace: "nowrap",
                      "&:hover": { color: tokens.inkSoft },
                    }}
                  >
                    {timeAgo(post.createdAt)}
                    {post.updatedAt && " · edited"}
                  </Typography>
                </Tooltip>
                {post.isPinned && (
                  <Chip
                    icon={<Pin size={12} />}
                    label="Pinned"
                    size="small"
                    sx={{
                      height: 21,
                      ml: 0.5,
                      bgcolor: tokens.emberTint,
                      color: tokens.emberInk,
                      "& .MuiChip-icon": { color: tokens.emberInk },
                    }}
                  />
                )}
              </Stack>
            </Box>

            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Post options">
              <MoreHorizontal size={18} />
            </IconButton>
          </Stack>

          {post.content && (
            <Typography
              component="div"
              sx={{ mt: 1.25, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: detailed ? "1.08rem" : "1rem", lineHeight: 1.62 }}
            >
              <RichText text={text} />
              {long && !detailed && (
                <Box
                  component="button"
                  onClick={() => setExpanded((v) => !v)}
                  sx={{ border: 0, bgcolor: "transparent", p: 0, ml: 0.5, cursor: "pointer", color: tokens.ember, fontWeight: 600, fontFamily: "inherit", fontSize: "inherit" }}
                >
                  {expanded ? "Show less" : "Show more"}
                </Box>
              )}
            </Typography>
          )}

          {images.length > 0 && <PostGallery images={images} maxHeight={detailed ? 640 : 480} />}
          {quoted && <QuotedPost post={quoted} />}
          {appLink && <LinkPreviewCard url={appLink} />}

          <Stack
            direction="row"
            spacing={{ xs: 0, sm: 0.5 }}
            sx={{
              mt: 1.75,
              pt: 1.25,
              ml: -1.25,
              mr: -1.25,
              flexWrap: "wrap",
              borderTop: `1px solid ${tokens.lineSoft}`,
            }}
          >
            <ActionButton
              icon={Heart}
              label={post.likedByMe ? "Unlike" : "Like"}
              count={post.likeCount}
              active={post.likedByMe}
              activeColor={tokens.ember}
              onClick={() => toggleLike.mutate({ id: post.id, liked: post.likedByMe })}
            />
            <ActionButton
              icon={MessageCircle}
              label="Comments"
              count={post.commentCount}
              component={detailed ? "button" : RouterLink}
              to={detailed ? undefined : postUrl}
              onClick={detailed ? () => document.getElementById("comment-input")?.focus() : undefined}
            />
            <ActionButton
              icon={Repeat2}
              label={post.repostedByMe ? "Remove repost" : "Repost"}
              count={post.repostCount}
              active={post.repostedByMe}
              activeColor={tokens.signal}
              disabled={toggleRepost.isPending}
              onClick={repost}
            />
            <ActionButton
              icon={Bookmark}
              label={post.savedByMe ? "Remove from saved" : "Save"}
              active={post.savedByMe}
              activeColor={tokens.ink}
              disabled={toggleSave.isPending}
              onClick={save}
            />
            <ActionButton icon={Share2} label="Share" onClick={share} />
          </Stack>
        </Box>
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        {!detailed && (
          <MenuItem onClick={() => { closeMenu(); navigate(postUrl); }}>
            <ListItemIcon><MessageCircle size={17} /></ListItemIcon>
            Open post
          </MenuItem>
        )}
        <MenuItem onClick={() => { closeMenu(); save(); }}>
          <ListItemIcon><Bookmark size={17} fill={post.savedByMe ? "currentColor" : "none"} /></ListItemIcon>
          {post.savedByMe ? "Remove from saved" : "Save post"}
        </MenuItem>
        <MenuItem onClick={() => { closeMenu(); copyLink(); }}>
          <ListItemIcon><Link2 size={17} /></ListItemIcon>
          Copy link
        </MenuItem>
        <MenuItem onClick={() => { closeMenu(); share(); }}>
          <ListItemIcon><Share2 size={17} /></ListItemIcon>
          Share
        </MenuItem>
        {isOwner && [
          <MenuItem key="edit" onClick={() => { closeMenu(); setEditing(true); }}>
            <ListItemIcon><Pencil size={17} /></ListItemIcon>
            Edit
          </MenuItem>,
          <MenuItem key="pin" onClick={() => { closeMenu(); togglePin.mutate({ id: post.id, pinned: post.isPinned }); }}>
            <ListItemIcon>{post.isPinned ? <PinOff size={17} /> : <Pin size={17} />}</ListItemIcon>
            {post.isPinned ? "Unpin from profile" : "Pin to profile"}
          </MenuItem>,
          <MenuItem key="delete" onClick={() => { closeMenu(); setConfirmDelete(true); }} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "inherit" }}><Trash2 size={17} /></ListItemIcon>
            Delete
          </MenuItem>,
        ]}
        {moderation.items}
      </Menu>

      {moderation.dialogs}

      {editing && <PostEditorDialog open post={post} onClose={() => setEditing(false)} />}

      {reposting && (
        <RepostDialog
          original={quoted ?? post}
          pending={toggleRepost.isPending}
          onClose={() => setReposting(false)}
          onSubmit={(content) =>
            toggleRepost.mutate({ id: post.id, reposted: false, content }, { onSuccess: () => setReposting(false) })
          }
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this post?"
        description="This can't be undone. The post, its likes and comments will be removed."
        confirmLabel="Delete"
        destructive
        loading={deletePost.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          deletePost.mutate(post.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              if (detailed) navigate("/home", { replace: true });
            },
          })
        }
      />
    </Card>
  );
}

export default memo(PostCard);
