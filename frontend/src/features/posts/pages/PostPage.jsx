import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Card, IconButton, Link, Menu, Skeleton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { ArrowLeft, Heart, MessageCircle, MoreHorizontal, Pencil, SendHorizontal, Trash2 } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import EmptyState from "../../../components/ui/EmptyState";
import InfiniteSentinel from "../../../components/ui/InfiniteSentinel";
import RichText from "../../../components/ui/RichText";
import ContentLayout from "../../../components/layout/ContentLayout";
import { useInfiniteList } from "../../../hooks/useInfiniteList";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { queryKeys } from "../../../lib/queryClient";
import { compactNumber, fullDate, timeAgo } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";
import { useAuth } from "../../auth/context/AuthContext";
import { useModerationMenuItems } from "../../moderation/components/ModerationMenuItems";
import { postService } from "../services/postService";
import { useAddComment, useDeleteComment, useToggleCommentLike, useUpdateComment } from "../hooks";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import TrendingCard from "../../feed/components/TrendingCard";

const MAX_COMMENT_LENGTH = 2000;
const REPLY_PAGE = 10;

function CommentAction({ icon: Icon, label, count, active, activeColor, disabled, onClick, children }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        border: 0,
        px: 0.75,
        py: 0.25,
        borderRadius: 999,
        bgcolor: "transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "0.76rem",
        fontWeight: 600,
        color: active ? activeColor : tokens.inkFaint,
        transition: "color .15s, background-color .15s",
        "&:hover": { color: active ? activeColor : tokens.ink, bgcolor: tokens.wash.ink },
        "&:focus-visible": { outline: `2px solid ${tokens.ink}`, outlineOffset: 2 },
        "&:disabled": { opacity: 0.5, cursor: "default" },
      }}
    >
      {Icon && <Icon size={14} fill={active ? "currentColor" : "none"} />}
      {count > 0 && <span>{compactNumber(count)}</span>}
      {children}
    </Box>
  );
}

function CommentComposer({ id, value, onChange, onSubmit, onCancel, pending, placeholder, size = 34, autoFocus = false }) {
  const { user } = useAuth();

  const send = (event) => {
    event.preventDefault();
    if (value.trim() && !pending) onSubmit(value.trim());
  };

  return (
    <Stack component="form" onSubmit={send} spacing={0.5}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
        <UserAvatar user={user} size={size} />
        <TextField
          id={id}
          size="small"
          multiline
          maxRows={6}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) send(event);
            if (event.key === "Escape" && onCancel) onCancel();
          }}
          slotProps={{ htmlInput: { maxLength: MAX_COMMENT_LENGTH } }}
        />
        <IconButton
          type="submit"
          disabled={!value.trim() || pending}
          aria-label="Send comment"
          sx={{
            flexShrink: 0,
            bgcolor: tokens.ink,
            color: tokens.onInk,
            "&:hover": { bgcolor: tokens.inkSoft, color: tokens.onInk },
            "&.Mui-disabled": { bgcolor: tokens.lineSoft },
          }}
        >
          <SendHorizontal size={17} />
        </IconButton>
      </Stack>
      {onCancel && (
        <Button size="small" variant="text" onClick={onCancel} disabled={pending} sx={{ alignSelf: "flex-end" }}>
          Cancel
        </Button>
      )}
    </Stack>
  );
}

function CommentCard({ comment, postId, threadId, postAuthorId, onReply, avatarSize = 34 }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const toggleLike = useToggleCommentLike();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const moderation = useModerationMenuItems({
    user: comment.author,
    subject: { type: "comment", id: comment.id, label: `@${comment.author?.username}'s comment` },
    onClose: () => setMenuAnchor(null),
  });

  const isAuthor = comment.author?.id === user?.id;
  const canDelete = isAuthor || postAuthorId === user?.id;

  const startEditing = () => {
    setDraft(comment.text);
    setEditing(true);
  };

  const saveEdit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || updateComment.isPending) return;
    updateComment.mutate({ postId, commentId: comment.id, text }, { onSuccess: () => setEditing(false) });
  };

  return (
    <Stack direction="row" spacing={1.25} sx={{ py: 1.25 }}>
      <RouterLink to={`/u/${comment.author?.id}`} aria-label={comment.author?.username}>
        <UserAvatar user={comment.author} size={avatarSize} />
      </RouterLink>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            bgcolor: tokens.paper,
            border: `1px solid ${tokens.lineSoft}`,
            borderRadius: "4px 16px 16px 16px",
            px: 1.75,
            py: 1.25,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap" }}>
            <Link
              component={RouterLink}
              to={`/u/${comment.author?.id}`}
              underline="hover"
              sx={{ color: tokens.ink, fontWeight: 700, fontSize: "0.87rem" }}
            >
              {comment.author?.username}
            </Link>
            <Tooltip title={fullDate(comment.createdAt)}>
              <Typography variant="caption">{timeAgo(comment.createdAt)}</Typography>
            </Tooltip>
            {comment.editedAt && <Typography variant="caption">· edited</Typography>}
          </Stack>

          {editing ? (
            <Box component="form" onSubmit={saveEdit} sx={{ mt: 1 }}>
              <TextField
                autoFocus
                size="small"
                multiline
                maxRows={8}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                slotProps={{ htmlInput: { maxLength: MAX_COMMENT_LENGTH } }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setEditing(false);
                }}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "flex-end" }}>
                <Button size="small" variant="text" onClick={() => setEditing(false)} disabled={updateComment.isPending}>
                  Cancel
                </Button>
                <Button size="small" type="submit" variant="contained" disabled={!draft.trim() || updateComment.isPending}>
                  Save
                </Button>
              </Stack>
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{ mt: 0.25, whiteSpace: "pre-wrap", wordBreak: "break-word", color: tokens.ink }}
            >
              <RichText text={comment.text} />
            </Typography>
          )}
        </Box>

        {!editing && (
          <Stack direction="row" spacing={0.25} sx={{ mt: 0.5, ml: -0.75, alignItems: "center", flexWrap: "wrap" }}>
            <CommentAction
              icon={Heart}
              label={comment.likedByMe ? "Unlike comment" : "Like comment"}
              count={comment.likeCount}
              active={comment.likedByMe}
              activeColor={tokens.ember}
              disabled={toggleLike.isPending}
              onClick={() => toggleLike.mutate({ postId, commentId: comment.id, liked: comment.likedByMe })}
            />
            {onReply && (
              <CommentAction label="Reply to this comment" onClick={() => onReply(comment)}>
                Reply
              </CommentAction>
            )}
            {isAuthor && (
              <Tooltip title="Edit">
                <span>
                  <CommentAction icon={Pencil} label="Edit comment" onClick={startEditing} />
                </span>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Delete">
                <span>
                  <CommentAction
                    icon={Trash2}
                    label="Delete comment"
                    disabled={deleteComment.isPending}
                    onClick={() => deleteComment.mutate({ postId, commentId: comment.id, parentId: threadId })}
                  />
                </span>
              </Tooltip>
            )}
            {moderation.available && (
              <Tooltip title="More">
                <span>
                  <CommentAction
                    icon={MoreHorizontal}
                    label="Comment options"
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                  />
                </span>
              </Tooltip>
            )}
          </Stack>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {moderation.items}
      </Menu>

      {moderation.dialogs}
    </Stack>
  );
}

function CommentThread({ comment, postId, postAuthorId }) {
  const [expanded, setExpanded] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const addComment = useAddComment();

  const replies = useInfiniteList(
    queryKeys.commentReplies(postId, comment.id),
    (cursor) => postService.comments(postId, { cursor, limit: REPLY_PAGE, parentId: comment.id }),
    { enabled: expanded },
  );

  const preview = comment.replies ?? [];
  const shown = expanded && replies.items.length ? replies.items : preview;
  const hidden = Math.max(0, (comment.replyCount ?? 0) - preview.length);

  const openReply = (target) => {
    setReplyTo(target);
    setReplyText(target.id === comment.id ? "" : `@${target.author?.username} `);
  };

  const sendReply = (text) =>
    addComment.mutate(
      { postId, text, parentId: comment.id },
      {
        onSuccess: () => {
          setReplyText("");
          setReplyTo(null);
        },
      },
    );

  return (
    <Box sx={{ "& + &": { borderTop: `1px solid ${tokens.lineSoft}` } }}>
      <CommentCard
        comment={comment}
        postId={postId}
        postAuthorId={postAuthorId}
        onReply={openReply}
      />

      {(shown.length > 0 || hidden > 0 || replyTo) && (
        <Box sx={{ ml: { xs: 2, sm: 3 }, pl: { xs: 1.5, sm: 2 }, borderLeft: `1px solid ${tokens.lineSoft}` }}>
          {shown.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              postId={postId}
              threadId={comment.id}
              postAuthorId={postAuthorId}
              onReply={openReply}
              avatarSize={28}
            />
          ))}

          {!expanded && hidden > 0 && (
            <Button size="small" variant="text" onClick={() => setExpanded(true)} sx={{ ml: -1 }}>
              Show {hidden} more {hidden === 1 ? "reply" : "replies"}
            </Button>
          )}
          {expanded && replies.isFetching && !replies.items.length && (
            <Skeleton variant="rounded" height={44} sx={{ my: 1, borderRadius: 3 }} />
          )}
          {expanded && replies.hasNextPage && (
            <Button
              size="small"
              variant="text"
              onClick={() => replies.fetchNextPage()}
              disabled={replies.isFetchingNextPage}
              sx={{ ml: -1 }}
            >
              Show more replies
            </Button>
          )}

          {replyTo && (
            <Box sx={{ py: 1.25 }}>
              <CommentComposer
                autoFocus
                size={28}
                value={replyText}
                onChange={setReplyText}
                onSubmit={sendReply}
                onCancel={() => {
                  setReplyTo(null);
                  setReplyText("");
                }}
                pending={addComment.isPending}
                placeholder={`Reply to ${replyTo.author?.username ?? "this comment"}`}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function PostPage() {
  const postId = Number(useParams().id);
  const navigate = useNavigate();
  const [text, setText] = useState("");

  const postQuery = useQuery({ queryKey: queryKeys.post(postId), queryFn: () => postService.get(postId), enabled: Number.isInteger(postId) });
  const comments = useInfiniteList(queryKeys.comments(postId), (cursor) => postService.comments(postId, { cursor, limit: 20 }), {
    enabled: postQuery.isSuccess,
  });
  useDocumentTitle(postQuery.data ? `${postQuery.data.author?.username}'s post` : "Post");

  const addComment = useAddComment();

  const submit = (value) => addComment.mutate({ postId, text: value }, { onSuccess: () => setText("") });

  const post = postQuery.data;

  return (
    <ContentLayout aside={<TrendingCard />}>
      <Button startIcon={<ArrowLeft size={16} />} onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))} sx={{ mb: 2, ml: -1 }}>
        Back
      </Button>

      {postQuery.isLoading && <PostSkeleton count={1} />}
      {postQuery.isError && (
        <Card>
          <EmptyState icon={MessageCircle} title="This post isn't available" description="It may have been deleted, or the link is wrong." action={<Button variant="outlined" component={RouterLink} to="/home">Go to feed</Button>} />
        </Card>
      )}

      {post && (
        <Stack spacing={2}>
          <PostCard post={post} detailed />

          <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
              Comments {post.commentCount > 0 && <Box component="span" sx={{ color: tokens.inkFaint, fontWeight: 500 }}>· {post.commentCount}</Box>}
            </Typography>

            <CommentComposer
              id="comment-input"
              value={text}
              onChange={setText}
              onSubmit={submit}
              pending={addComment.isPending}
              placeholder="Write a comment..."
            />

            <Box sx={{ mt: 1 }}>
              {comments.isLoading &&
                [0, 1].map((i) => (
                  <Stack key={i} direction="row" spacing={1.5} sx={{ py: 1.5 }}>
                    <Skeleton variant="circular" width={34} height={34} />
                    <Skeleton variant="rounded" height={52} sx={{ flex: 1, borderRadius: 3 }} />
                  </Stack>
                ))}
              {!comments.isLoading && comments.items.length === 0 && (
                <EmptyState compact icon={MessageCircle} title="No comments yet" description="Start the conversation." />
              )}
              {comments.items.map((comment) => (
                <CommentThread key={comment.id} comment={comment} postId={postId} postAuthorId={post.author?.id} />
              ))}
              {comments.items.length > 0 && (
                <InfiniteSentinel hasMore={Boolean(comments.hasNextPage)} loading={comments.isFetchingNextPage} onLoadMore={comments.fetchNextPage} endLabel="" />
              )}
            </Box>
          </Card>
        </Stack>
      )}
    </ContentLayout>
  );
}
