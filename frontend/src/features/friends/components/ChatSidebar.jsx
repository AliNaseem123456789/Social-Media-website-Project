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
  Divider,
  InputBase,
  alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { friendService } from "../services/friendsService";
import { chatService } from "../services/chatService";

function ChatSidebar() {
  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user1, user2 } = useParams();

  const currentUserId = localStorage.getItem("user_id");

  const activeChatId = String(user1) === String(currentUserId) ? user2 : user1;

  useEffect(() => {
    if (!currentUserId) return;
    const loadFriends = async () => {
      try {
        const data = await friendService.getFriends(currentUserId);
        setFriends(data);
      } catch (error) {
        console.error("Error loading friends:", error);
      }
    };
    loadFriends();
  }, [currentUserId]);

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "white",
      }}
    >
      {}
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, mb: 2, color: "#1a1a1b" }}
        >
          Chats
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: "#f0f2f5",
            borderRadius: "12px",
            px: 2,
            py: 0.5,
          }}
        >
          <SearchIcon sx={{ color: "gray", mr: 1, fontSize: 20 }} />
          <InputBase
            placeholder="Search friends..."
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ fontSize: "0.9rem" }}
          />
        </Box>
      </Box>

      {}
      <List sx={{ flexGrow: 1, overflowY: "auto", px: 1 }}>
        {filteredFriends.map((friend) => {
          const isActive = String(friend.id) === String(activeChatId);
          return (
            <ListItemButton
              key={friend.id}
              onClick={() => navigate(`/chat/${currentUserId}/${friend.id}`)}
              sx={{
                borderRadius: "12px",
                mb: 0.5,
                transition: "0.2s",
                bgcolor: isActive ? alpha("#1877f2", 0.08) : "transparent",
                "&:hover": {
                  bgcolor: isActive ? alpha("#1877f2", 0.12) : "#f5f5f5",
                },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={friend.profile_image}
                  sx={{
                    bgcolor: "#1877f2",
                    width: 48,
                    height: 48,
                    border: isActive ? "2px solid #1877f2" : "none",
                  }}
                >
                  {friend.username.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={friend.username}
                secondary="Click to message"
                primaryTypographyProps={{
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? "#1877f2" : "#1a1a1b",
                }}
                secondaryTypographyProps={{ fontSize: "0.75rem" }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

export default ChatSidebar;
