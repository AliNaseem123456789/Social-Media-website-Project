import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Avatar,
  Badge,
  Divider,
  Skeleton,
  IconButton,
  Drawer,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { friendService } from "../services/friendsService";
import { chatService } from "../services/chatService";
import { useAuth } from "../../auth/context/AuthContext";

const ACCENT = "#1877f2";

function timeAgoShort(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function PresenceAvatar({ src, label, size = 40 }) {
  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      variant="dot"
      sx={{
        "& .MuiBadge-badge": {
          bgcolor: "#31c48d",
          boxShadow: "0 0 0 2px #fff",
          width: 10,
          height: 10,
          borderRadius: "50%",
        },
      }}
    >
      <Avatar
        src={src}
        sx={{ width: size, height: size, bgcolor: ACCENT, fontSize: size * 0.4, fontWeight: 700 }}
      >
        {label?.charAt(0)?.toUpperCase()}
      </Avatar>
    </Badge>
  );
}

function RowSkeleton() {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.1 }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="45%" height={12} />
      </Box>
    </Stack>
  );
}

function ChatRailContent({ friends, recentChats, loading, onNavigate }) {
  const recentIds = new Set(recentChats.map((c) => String(c.id)));
  const otherFriends = friends.filter((f) => !recentIds.has(String(f.id)));

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1a1a1b" }}>
          Chats
        </Typography>
        <IconButton size="small" sx={{ color: "text.secondary" }}>
          <ChatBubbleOutlineRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      {loading ? (
        <Box sx={{ pb: 1 }}>
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </Box>
      ) : (
        <>
          {recentChats.length > 0 && (
            <>
              <Typography
                variant="overline"
                sx={{ px: 2.5, fontWeight: 700, color: "text.secondary", letterSpacing: 0.6, fontSize: "0.68rem" }}
              >
                Recent
              </Typography>
              <Box sx={{ pb: 0.5 }}>
                {recentChats.slice(0, 5).map((chat) => (
                  <Stack
                    key={chat.id}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    onClick={() => onNavigate(`/chat/${chat.id}`)}
                    sx={{
                      px: 2.5,
                      py: 1.1,
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                      "&:hover": { bgcolor: alpha(ACCENT, 0.05) },
                    }}
                  >
                    <PresenceAvatar src={chat.profile_image} label={chat.username} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: "#1a1a1b", fontSize: "0.85rem" }}>
                          {chat.username}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.68rem", flexShrink: 0, ml: 1 }}>
                          {timeAgoShort(chat.last_chatted)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" noWrap sx={{ color: "text.secondary", display: "block", fontSize: "0.75rem" }}>
                        {chat.last_message || "Say hello"}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Box>
              <Divider sx={{ mx: 2.5 }} />
            </>
          )}

          <Typography
            variant="overline"
            sx={{ px: 2.5, pt: 1.5, display: "block", fontWeight: 700, color: "text.secondary", letterSpacing: 0.6, fontSize: "0.68rem" }}
          >
            Friends
          </Typography>

          <Box sx={{ pb: 1.5, maxHeight: 320, overflowY: "auto" }}>
            {otherFriends.length === 0 ? (
              <Typography variant="caption" sx={{ px: 2.5, color: "text.disabled", display: "block", py: 1.5 }}>
                {friends.length === 0 ? "No friends yet" : "You're all caught up"}
              </Typography>
            ) : (
              otherFriends.map((friend) => (
                <Stack
                  key={friend.id}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  onClick={() => onNavigate(`/chat/${friend.id}`)}
                  sx={{
                    px: 2.5,
                    py: 0.9,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                    "&:hover": { bgcolor: alpha(ACCENT, 0.05) },
                  }}
                >
                  <PresenceAvatar src={friend.profile_image} label={friend.username} size={34} />
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: "#1a1a1b", fontSize: "0.83rem", flex: 1 }}>
                    {friend.username}
                  </Typography>
                  <ChevronRightRoundedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                </Stack>
              ))
            )}
          </Box>
        </>
      )}
    </>
  );
}

function RecentChats() {
  const [friends, setFriends] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;
  const hasLoaded = React.useRef(false);

  useEffect(() => {
    if (!currentUserId || hasLoaded.current) return;
    hasLoaded.current = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [friendsData, chatsData] = await Promise.all([
          friendService.getFriends(),
          chatService.getRecentChats(),
        ]);
        setFriends(friendsData.friends || friendsData || []);
        setRecentChats(chatsData || []);
      } catch (error) {
        console.error("Error loading chat/friend data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUserId]);

  const handleNavigate = (path) => {
    setOpen(false);
    navigate(path);
  };

  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            width: 52,
            height: 52,
            bgcolor: ACCENT,
            color: "#fff",
            boxShadow: "0 10px 24px -8px rgba(24,119,242,0.6)",
            "&:hover": { bgcolor: "#166fe5" },
            zIndex: 2000,
          }}
        >
          <ChatBubbleOutlineRoundedIcon />
        </IconButton>
        <Drawer
          anchor="right"
          open={open}
          onClose={() => setOpen(false)}
          PaperProps={{ sx: { width: 320, bgcolor: "#fff" } }}
        >
          <Stack direction="row" justifyContent="flex-end" sx={{ p: 1 }}>
            <IconButton onClick={() => setOpen(false)} size="small">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
          <ChatRailContent friends={friends} recentChats={recentChats} loading={loading} onNavigate={handleNavigate} />
        </Drawer>
      </>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "24px",
        bgcolor: "white",
        border: "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
        position: "sticky",
        top: "88px",
        width: 280,
        overflow: "hidden",
      }}
    >
      <ChatRailContent friends={friends} recentChats={recentChats} loading={loading} onNavigate={handleNavigate} />
    </Paper>
  );
}

export default RecentChats;