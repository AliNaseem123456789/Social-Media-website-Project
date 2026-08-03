import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Avatar,
  InputBase,
  alpha,
  Badge,
  Divider,
  CircularProgress,
  Stack,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { friendService } from "../services/friendsService";
import { chatService } from "../services/chatService";
import { useAuth } from "../../auth/context/AuthContext";

const ACCENT = "#1877f2";

function ChatSidebar() {
  const [friends, setFriends] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { otherUserId } = useParams();

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
        console.error("Error loading chat data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUserId]);

  const filteredFriends = friends.filter((f) =>
    f.username?.toLowerCase().includes(search.toLowerCase())
  );

  const formatLastChatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress size={32} sx={{ color: ACCENT }} thickness={4} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#fff" }}>
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, mb: 2, color: "#1a1a1b", letterSpacing: "-0.3px" }}
        >
          Chats
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: "#f0f2f5",
            borderRadius: "14px",
            px: 1.75,
            py: 0.9,
            transition: "all 0.2s",
            "&:focus-within": {
              bgcolor: "#fff",
              boxShadow: `0 0 0 1.5px ${ACCENT}`,
            },
          }}
        >
          <SearchRoundedIcon sx={{ color: "#8a8d91", mr: 1.25, fontSize: 19 }} />
          <InputBase
            placeholder="Search friends"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ fontSize: "0.875rem" }}
          />
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 1.25, pb: 2 }}>
        {recentChats.length > 0 && !search && (
          <>
            <Typography
              variant="overline"
              sx={{
                px: 1.5,
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: 0.6,
                fontSize: "0.68rem",
              }}
            >
              Recent
            </Typography>
            <List sx={{ py: 0.5 }}>
              {recentChats.slice(0, 6).map((chat) => {
                const isActive = String(chat.id) === String(otherUserId);
                return (
                  <ListItemButton
                    key={chat.id}
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    sx={{
                      borderRadius: "14px",
                      mb: 0.25,
                      py: 1,
                      bgcolor: isActive ? alpha(ACCENT, 0.08) : "transparent",
                      "&:hover": { bgcolor: isActive ? alpha(ACCENT, 0.1) : "#f5f6f7" },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 54 }}>
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
                          src={chat.profile_image}
                          sx={{
                            bgcolor: ACCENT,
                            width: 46,
                            height: 46,
                            fontWeight: 700,
                            border: isActive ? `2px solid ${ACCENT}` : "none",
                          }}
                        >
                          {chat.username?.charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isActive ? 700 : 600,
                              color: isActive ? ACCENT : "#1a1a1b",
                              fontSize: "0.9rem",
                            }}
                          >
                            {chat.username}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.7rem" }}>
                            {formatLastChatTime(chat.last_chatted)}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            fontSize: "0.79rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "180px",
                          }}
                        >
                          {chat.last_message || "Click to start chatting"}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
            <Divider sx={{ my: 1.5, mx: 1.5 }} />
          </>
        )}

        <Typography
          variant="overline"
          sx={{
            px: 1.5,
            fontWeight: 700,
            color: "text.secondary",
            letterSpacing: 0.6,
            fontSize: "0.68rem",
          }}
        >
          {search ? "Search results" : "All friends"}
        </Typography>

        <List sx={{ py: 0.5 }}>
          {filteredFriends.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <ChatBubbleOutlineRoundedIcon sx={{ color: "#d7d9dc", fontSize: 42 }} />
              <Typography variant="body2" sx={{ color: "text.disabled", mt: 1, fontSize: "0.85rem" }}>
                {search ? "No friends found" : "No friends yet"}
              </Typography>
            </Box>
          ) : (
            filteredFriends.map((friend) => {
              const isActive = String(friend.id) === String(otherUserId);
              return (
                <ListItemButton
                  key={friend.id}
                  onClick={() => navigate(`/chat/${friend.id}`)}
                  sx={{
                    borderRadius: "14px",
                    mb: 0.25,
                    py: 0.85,
                    bgcolor: isActive ? alpha(ACCENT, 0.08) : "transparent",
                    "&:hover": { bgcolor: isActive ? alpha(ACCENT, 0.1) : "#f5f6f7" },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 50 }}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      variant="dot"
                      sx={{
                        "& .MuiBadge-badge": {
                          bgcolor: "#31c48d",
                          boxShadow: "0 0 0 2px #fff",
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                        },
                      }}
                    >
                      <Avatar
                        src={friend.profile_image}
                        sx={{
                          bgcolor: ACCENT,
                          width: 42,
                          height: 42,
                          fontWeight: 700,
                          border: isActive ? `2px solid ${ACCENT}` : "none",
                        }}
                      >
                        {friend.username?.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isActive ? 700 : 600,
                          color: isActive ? ACCENT : "#1a1a1b",
                          fontSize: "0.88rem",
                        }}
                      >
                        {friend.username}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.74rem" }}>
                        Tap to chat
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })
          )}
        </List>
      </Box>
    </Box>
  );
}

export default ChatSidebar;