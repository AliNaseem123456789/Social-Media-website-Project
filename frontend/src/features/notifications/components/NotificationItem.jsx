import { Box, Stack, Typography } from "@mui/material";
import { AtSign, Bell, Heart, MessageCircle, PhoneMissed, Repeat2, Reply, ThumbsUp, UserCheck, UserPlus, UserRoundPlus } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";
import { timeAgo } from "../../../lib/format";
import { tokens } from "../../../theme/tokens";

/**
 * Accents that have to stay the same hue in both colour modes, because the glyph on top of them is
 * always white. They are the hues already used for avatar fills, so the palette stays one family.
 */
const TYPES = {
  like: { icon: Heart, color: tokens.ember, fill: true },
  comment_like: { icon: ThumbsUp, color: tokens.ember },
  comment: { icon: MessageCircle, color: tokens.accent.blue },
  comment_reply: { icon: Reply, color: tokens.accent.blue },
  mention: { icon: AtSign, color: tokens.accent.violet },
  repost: { icon: Repeat2, color: tokens.signal },
  follow: { icon: UserRoundPlus, color: tokens.signal },
  friend_accept: { icon: UserCheck, color: tokens.signal },
  friend_request: { icon: UserPlus, color: tokens.accent.rust },
  missed_call: { icon: PhoneMissed, color: tokens.danger },
};

const FALLBACK = { icon: Bell, color: tokens.inkSoft };

const POST_TYPES = new Set(["like", "comment", "comment_reply", "comment_like", "mention", "repost"]);

/**
 * The server sends the path to open. The type based guesses below only cover notifications stored
 * before that field existed.
 */
export function notificationLink(n) {
  if (n.link) return n.link;
  if (POST_TYPES.has(n.type) && n.targetId) return `/posts/${n.targetId}`;
  if (n.type === "missed_call") return "/calls";
  if (n.type === "friend_request") return "/friends?tab=requests";
  if (n.actor?.id) return `/u/${n.actor.id}`;
  return "/notifications";
}

export default function NotificationItem({ notification, onClick, dense = false }) {
  const { icon: Icon, color, fill } = TYPES[notification.type] ?? FALLBACK;
  const unread = !notification.read;

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: "unset",
        boxSizing: "border-box",
        width: "100%",
        cursor: "pointer",
        display: "flex",
        gap: 1.5,
        alignItems: "flex-start",
        p: dense ? 1.25 : 1.75,
        borderRadius: 3,
        position: "relative",
        transition: "background-color .15s",
        bgcolor: unread ? `color-mix(in srgb, ${tokens.ember} 6%, transparent)` : "transparent",
        "&:hover": { bgcolor: unread ? `color-mix(in srgb, ${tokens.ember} 11%, transparent)` : tokens.wash.ink },
        "&:focus-visible": { outline: `2px solid ${tokens.ink}`, outlineOffset: -2 },
      }}
    >
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        <UserAvatar user={{ id: notification.actor?.id, username: notification.actor?.username }} size={dense ? 38 : 44} />
        <Box
          sx={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 22,
            height: 22,
            borderRadius: "50%",
            bgcolor: color,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            border: `2px solid ${tokens.surface}`,
          }}
        >
          <Icon size={11} strokeWidth={2.5} fill={fill ? "currentColor" : "none"} />
        </Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: tokens.ink, fontWeight: unread ? 600 : 400, lineHeight: 1.45 }}>
          {notification.content}
        </Typography>
        <Typography variant="caption">{timeAgo(notification.createdAt)}</Typography>
      </Box>
      {unread && <Stack sx={{ width: 8, height: 8, mt: 0.75, borderRadius: "50%", bgcolor: tokens.ember, flexShrink: 0 }} />}
    </Box>
  );
}
