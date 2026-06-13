// ChatSidebar.jsx - FIX THE INFINITE LOOP

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
import SearchIcon from "@mui/icons-material/Search";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { friendService } from "../services/friendsService";
import { chatService } from "../services/chatService";
import { useAuth } from "../../auth/context/AuthContext";

function ChatSidebar() {
  const [friends, setFriends] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { otherUserId } = useParams();
  
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  // ✅ Use a ref to prevent multiple calls
  const hasLoaded = React.useRef(false);

  useEffect(() => {
    // ✅ Only load once
    if (!currentUserId || hasLoaded.current) return;
    
    hasLoaded.current = true;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [friendsData, chatsData] = await Promise.all([
          friendService.getFriends(),
          chatService.getRecentChats(),
        ]);
        
        console.log("Friends data loaded once:", friendsData);
        console.log("Recent chats loaded once:", chatsData);
        
        setFriends(friendsData.friends || friendsData || []);
        setRecentChats(chatsData || []);
      } catch (error) {
        console.error("Error loading chat data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUserId]); // ✅ Only depends on currentUserId

  // Filter friends based on search
  const filteredFriends = friends.filter((f) =>
    f.username?.toLowerCase().includes(search.toLowerCase())
  );

  // Format last chat time
  const formatLastChatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress size={40} sx={{ color: "#1877f2" }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#fff",
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2.5, pb: 1.5, borderBottom: "1px solid #e0e0e0" }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, mb: 2, color: "#1a1a1b", letterSpacing: "-0.5px" }}
        >
          Chats
        </Typography>
        
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: "#f0f2f5",
            borderRadius: "16px",
            px: 2,
            py: 0.75,
            transition: "all 0.2s",
            "&:focus-within": {
              bgcolor: "#fff",
              boxShadow: "0 0 0 2px #1877f2",
            },
          }}
        >
          <SearchIcon sx={{ color: "gray", mr: 1.5, fontSize: 20 }} />
          <InputBase
            placeholder="Search friends..."
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ fontSize: "0.9rem" }}
          />
        </Box>
      </Box>

      {/* Recent Chats Section */}
      {recentChats.length > 0 && (
        <>
          <Box sx={{ px: 2.5, pt: 2 }}>
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: 1 }}
            >
              Recent Chats
            </Typography>
          </Box>
          <List sx={{ px: 1, py: 0 }}>
            {recentChats.slice(0, 5).map((chat) => {
              const isActive = String(chat.id) === String(otherUserId);
              return (
                <ListItemButton
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  sx={{
                    borderRadius: "16px",
                    mb: 0.5,
                    transition: "0.2s",
                    bgcolor: isActive ? alpha("#1877f2", 0.08) : "transparent",
                    "&:hover": {
                      bgcolor: isActive ? alpha("#1877f2", 0.12) : "#f5f5f5",
                    },
                    py: 1.5,
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      variant="dot"
                      sx={{
                        "& .MuiBadge-badge": {
                          bgcolor: "#44b700",
                          boxShadow: "0 0 0 2px #fff",
                        },
                      }}
                    >
                      <Avatar
                        src={chat.profile_image}
                        sx={{
                          bgcolor: "#1877f2",
                          width: 52,
                          height: 52,
                          border: isActive ? "2px solid #1877f2" : "none",
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
                          variant="body1"
                          sx={{
                            fontWeight: isActive ? 700 : 600,
                            color: isActive ? "#1877f2" : "#1a1a1b",
                            fontSize: "0.95rem",
                          }}
                        >
                          {chat.username}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                          {formatLastChatTime(chat.last_chatted)}
                        </Typography>
                      </Stack>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontSize: "0.8rem",
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
          <Divider sx={{ my: 1 }} />
        </>
      )}

      {/* Friends Section */}
      <Box sx={{ px: 2.5, pt: recentChats.length > 0 ? 0 : 2 }}>
        <Typography
          variant="overline"
          sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: 1 }}
        >
          All Friends
        </Typography>
      </Box>
      
      <List sx={{ flexGrow: 1, overflowY: "auto", px: 1, pb: 2 }}>
        {filteredFriends.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <ChatBubbleOutlineIcon sx={{ color: "text.disabled", fontSize: 48 }} />
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
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
                  borderRadius: "16px",
                  mb: 0.5,
                  transition: "0.2s",
                  bgcolor: isActive ? alpha("#1877f2", 0.08) : "transparent",
                  "&:hover": {
                    bgcolor: isActive ? alpha("#1877f2", 0.12) : "#f5f5f5",
                  },
                  py: 1,
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    variant="dot"
                    sx={{
                      "& .MuiBadge-badge": {
                        bgcolor: "#44b700",
                        boxShadow: "0 0 0 2px #fff",
                      },
                    }}
                  >
                    <Avatar
                      src={friend.profile_image}
                      sx={{
                        bgcolor: "#1877f2",
                        width: 48,
                        height: 48,
                        border: isActive ? "2px solid #1877f2" : "none",
                      }}
                    >
                      {friend.username?.charAt(0).toUpperCase()}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: isActive ? 700 : 600,
                        color: isActive ? "#1877f2" : "#1a1a1b",
                      }}
                    >
                      {friend.username}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Click to chat
                    </Typography>
                  }
                />
              </ListItemButton>
            );
          })
        )}
      </List>
    </Box>
  );
}

export default ChatSidebar;