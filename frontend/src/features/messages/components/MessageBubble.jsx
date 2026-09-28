import { useRef, useState } from "react";
import { Box, Button, Dialog, IconButton, ListItemIcon, Menu, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Check, CheckCheck, MoreVertical, Pencil, Trash2 } from "lucide-react";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { useModerationMenuItems } from "../../moderation/components/ModerationMenuItems";
import { tokens } from "../../../theme/tokens";

const LONG_PRESS_MS = 450;

const clockTime = (value) => new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function Receipt({ readByAll }) {
  const Icon = readByAll ? CheckCheck : Check;
  return (
    <Box
      component="span"
      aria-label={readByAll ? "Read" : "Sent"}
      sx={{ display: "inline-flex", color: readByAll ? tokens.signal : tokens.inkFaint }}
    >
      <Icon size={14} strokeWidth={2.4} />
    </Box>
  );
}

export default function MessageBubble({
  message,
  mine,
  grouped,
  avatar,
  senderName,
  readByAll,
  canModify,
  onSubmitEdit,
  onDelete,
  deleting,
}) {
  const [anchor, setAnchor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text ?? "");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const bubbleRef = useRef(null);
  const pressTimer = useRef(null);

  const persisted = typeof message.id === "number";
  const moderation = useModerationMenuItems({
    user: message.sender ?? (message.from ? { id: message.from } : null),
    subject: {
      type: "message",
      id: message.id,
      label: message.sender?.username ? `@${message.sender.username}'s message` : "This message",
    },
    onClose: () => setAnchor(null),
    canBlock: false,
  });
  const canReport = !mine && persisted && !message.deleted && moderation.available;
  const hasMenu = canModify || canReport;

  const openMenu = () => setAnchor(bubbleRef.current);
  const startPress = () => {
    if (!hasMenu) return;
    pressTimer.current = setTimeout(openMenu, LONG_PRESS_MS);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);

  const beginEdit = () => {
    setAnchor(null);
    setDraft(message.text ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    const value = draft.trim();
    if (!value || value === message.text) return setEditing(false);
    setSaving(true);
    const saved = await onSubmitEdit(value);
    setSaving(false);
    if (saved) setEditing(false);
  };

  const hasImage = Boolean(message.imageUrl) && !message.deleted;
  const hasText = Boolean(message.text) && !message.deleted;
  const showMeta = !grouped || Boolean(message.editedAt) || message.failed;

  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        mt: grouped ? 0.4 : 1.25,
        alignItems: "flex-end",
        justifyContent: mine ? "flex-end" : "flex-start",
        "&:hover .message-actions, & .message-actions:focus-visible": { opacity: 1 },
      }}
    >
      {mine && canModify && (
        <IconButton
          className="message-actions"
          size="small"
          onClick={openMenu}
          aria-label="Message options"
          sx={{ opacity: anchor ? 1 : 0, transition: "opacity .15s", alignSelf: "center" }}
        >
          <MoreVertical size={16} />
        </IconButton>
      )}
      {avatar}

      <Stack sx={{ alignItems: mine ? "flex-end" : "flex-start", maxWidth: "min(78%, 520px)", minWidth: 0 }}>
        {senderName && (
          <Typography variant="caption" sx={{ px: 0.75, mb: 0.25, fontWeight: 650, color: tokens.inkSoft }}>
            {senderName}
          </Typography>
        )}

        {editing ? (
          <Stack spacing={1} sx={{ width: "min(100%, 420px)" }}>
            <TextField
              autoFocus
              multiline
              maxRows={6}
              size="small"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  saveEdit();
                }
                if (event.key === "Escape") setEditing(false);
              }}
              slotProps={{ htmlInput: { maxLength: 4000, "aria-label": "Edit message" } }}
            />
            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              <Button size="small" variant="outlined" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button size="small" variant="contained" onClick={saveEdit} disabled={saving || !draft.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Box
            ref={bubbleRef}
            onContextMenu={(event) => {
              if (!hasMenu) return;
              event.preventDefault();
              openMenu();
            }}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchMove={cancelPress}
            sx={{
              px: hasImage ? 0.5 : 1.75,
              py: hasImage ? 0.5 : 1,
              borderRadius: mine ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
              bgcolor: message.deleted ? "transparent" : mine ? tokens.ink : tokens.surface,
              color: message.deleted ? tokens.inkFaint : mine ? tokens.paper : tokens.ink,
              border: message.deleted
                ? `1px dashed ${tokens.line}`
                : mine
                  ? 0
                  : `1px solid ${tokens.line}`,
              opacity: message.pending ? 0.6 : 1,
              fontStyle: message.deleted ? "italic" : "normal",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "0.93rem",
              lineHeight: 1.5,
              transition: "opacity .2s",
            }}
          >
            {message.deleted && "This message was deleted"}
            {hasImage && (
              <Box
                component="button"
                type="button"
                onClick={() => setZoomed(true)}
                aria-label="Open image"
                sx={{ display: "block", width: "100%", p: 0, border: 0, borderRadius: "14px", overflow: "hidden", cursor: "zoom-in", bgcolor: tokens.paperDeep }}
              >
                <Box
                  component="img"
                  src={message.imageUrl}
                  alt=""
                  loading="lazy"
                  sx={{ display: "block", width: "100%", maxWidth: 320, maxHeight: 360, objectFit: "cover" }}
                />
              </Box>
            )}
            {hasText && <Box sx={{ px: hasImage ? 1.25 : 0, pt: hasImage ? 0.75 : 0, pb: hasImage ? 0.5 : 0 }}>{message.text}</Box>}
          </Box>
        )}

        {showMeta && !editing && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.4, px: 0.5, alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: message.failed ? tokens.danger : tokens.inkFaint }}>
              {message.failed ? "Not sent" : clockTime(message.createdAt)}
            </Typography>
            {message.editedAt && !message.deleted && <Typography variant="caption">edited</Typography>}
            {mine && !message.pending && !message.failed && <Receipt readByAll={readByAll} />}
          </Stack>
        )}
      </Stack>

      {canReport && (
        <IconButton
          className="message-actions"
          size="small"
          onClick={openMenu}
          aria-label="Message options"
          sx={{ opacity: anchor ? 1 : 0, transition: "opacity .15s", alignSelf: "center" }}
        >
          <MoreVertical size={16} />
        </IconButton>
      )}

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        {canModify && Boolean(message.text) && (
          <MenuItem onClick={beginEdit}>
            <ListItemIcon>
              <Pencil size={16} />
            </ListItemIcon>
            Edit
          </MenuItem>
        )}
        {canModify && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              setConfirming(true);
            }}
            sx={{ color: tokens.danger }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>
              <Trash2 size={16} />
            </ListItemIcon>
            Delete
          </MenuItem>
        )}
        {canReport && moderation.items}
      </Menu>

      {moderation.dialogs}

      <ConfirmDialog
        open={confirming}
        title="Delete this message?"
        description="It will be replaced with a note that the message was deleted."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          const removed = await onDelete();
          if (removed) setConfirming(false);
        }}
      />

      {hasImage && (
        <Dialog open={zoomed} onClose={() => setZoomed(false)} maxWidth="lg" slotProps={{ paper: { sx: { bgcolor: "transparent", border: 0, boxShadow: "none" } } }}>
          <Box
            component="img"
            src={message.imageUrl}
            alt=""
            onClick={() => setZoomed(false)}
            sx={{ display: "block", maxWidth: "100%", maxHeight: "88vh", borderRadius: 3, cursor: "zoom-out" }}
          />
        </Dialog>
      )}
    </Stack>
  );
}
